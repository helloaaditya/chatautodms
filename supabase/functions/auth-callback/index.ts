import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Expose-Headers": "Location",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // DEBUG: Log full URL (remove in production)
  const fullUrl = req.url;
  console.log("[auth-callback] Full URL:", fullUrl);
  console.log("[auth-callback] Has code:", fullUrl.includes("code="));
  console.log("[auth-callback] Has state:", fullUrl.includes("state="));

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state"); // Format: userId or "userId|redirectBase"

  if (!code || !state) {
    const appUrl = Deno.env.get("META_APP_URL") || "http://localhost:3001";
    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: `${appUrl}/connect?error=no_code` },
    });
  }

  const [userId, redirectBase] = state.includes("|")
    ? state.split("|").map((s) => decodeURIComponent(s))
    : [state, ""];
  const appUrl = redirectBase || Deno.env.get("META_APP_URL") || "http://localhost:3001";

  try {
    const APP_ID = Deno.env.get("META_APP_ID")!;
    const APP_SECRET = Deno.env.get("META_APP_SECRET")!;
    // Must match redirect_uri used in OAuth request (frontend callback)
    const REDIRECT_URI = redirectBase ? `${redirectBase}/auth/meta/callback` : Deno.env.get("META_REDIRECT_URI")!;

    // 1. Exchange code for short-lived access token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${APP_ID}&redirect_uri=${REDIRECT_URI}&client_secret=${APP_SECRET}&code=${code}`
    );
    const tokenData = await tokenRes.json();
    const shortLivedToken = tokenData.access_token;
    if (!shortLivedToken) {
      throw new Error(tokenData.error?.message ?? "Failed to get access token from Facebook");
    }

    // 2. Exchange for long-lived access token (60 days)
    const longLivedRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${shortLivedToken}`
    );
    const { access_token: longLivedToken, expires_in } = await longLivedRes.json();

    // 3. Fetch User's Pages
    const pagesRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${longLivedToken}`);
    const pagesData = await pagesRes.json();
    const pages = pagesData.data ?? [];

    if (pages.length === 0) {
      throw new Error("No Facebook Pages found. Connect a Page to your Instagram Business account first.");
    }

    let storedCount = 0;
    for (const page of pages) {
      // 4. Fetch Instagram Business Account linked to the Page
      const igRes = await fetch(`https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account,name,picture&access_token=${longLivedToken}`);
      const pageData = await igRes.json();

      if (pageData.instagram_business_account) {
        const igAccountId = pageData.instagram_business_account.id;

        // 5. Ensure profile exists (RPC or admin fallback)
        const rpcOk = await supabase.rpc("ensure_profile_exists", { p_user_id: userId }).then(() => true).catch(() => false);
        if (!rpcOk) {
          const { data: authUser } = await supabase.auth.admin.getUserById(userId);
          const email = authUser?.user?.email ?? `${userId}@placeholder.local`;
          await supabase.from("profiles").upsert({
            id: userId,
            email,
            full_name: authUser?.user?.user_metadata?.full_name ?? null,
            avatar_url: authUser?.user?.user_metadata?.avatar_url ?? null,
            updated_at: new Date().toISOString(),
          }, { onConflict: "id", ignoreDuplicates: true });
        }

        // 6. Store in Database
        const { data, error } = await supabase.from("instagram_accounts").upsert({
          user_id: userId,
          instagram_business_id: igAccountId,
          page_id: page.id,
          account_name: pageData.name,
          profile_picture: pageData.picture?.data?.url,
          access_token: longLivedToken, // Use Vault/Encryption in prod
          token_expiry: new Date(Date.now() + (expires_in || 5184000) * 1000).toISOString(),
          is_active: true
        }, { onConflict: 'instagram_business_id' }).select();

        if (error) throw new Error(error.message || "Failed to save account");
        if (data?.length) storedCount++;
      }
    }

    if (storedCount === 0) {
      throw new Error("No Instagram Business account found. Link your Instagram to a Facebook Page first (Settings → Professional account → Connect to a Page).");
    }

    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: `${appUrl}/connect?success=1` },
    });
  } catch (err) {
    const msg = encodeURIComponent(err?.message ?? "Connection failed");
    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: `${appUrl}/connect?error=${msg}` },
    });
  }
});

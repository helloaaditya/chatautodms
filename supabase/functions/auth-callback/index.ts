// @ts-expect-error Deno resolves URL imports at runtime
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// @ts-expect-error Deno resolves URL imports at runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

declare const Deno: { env: { get(key: string): string | undefined } };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Expose-Headers": "Location",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const url = new URL(req.url);
  let code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    const appUrl = Deno.env.get("META_APP_URL") || "http://localhost:3001";
    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: `${appUrl}/connect?error=no_code` },
    });
  }

  const stateParts = state.split("|").map((s) => decodeURIComponent(s));
  const isInstagramLogin = stateParts[0] === "instagram";
  const userId = isInstagramLogin ? stateParts[1] : stateParts[0];
  const redirectBase = isInstagramLogin ? stateParts[2] : (stateParts[1] ?? "");
  const appUrl = redirectBase || Deno.env.get("META_APP_URL") || "http://localhost:3001";
  const REDIRECT_URI = redirectBase ? `${redirectBase}/auth/meta/callback` : Deno.env.get("META_REDIRECT_URI")!;

  console.log("[auth-callback] OAuth callback for user", userId?.slice(0, 8) + "...");

  if (code.endsWith("#_")) code = code.slice(0, -2);

  try {
    const APP_ID = Deno.env.get("META_APP_ID")!;
    const APP_SECRET = Deno.env.get("META_APP_SECRET")!;
    // Use Instagram App ID/Secret if set (Dashboard > Instagram > Business login); else same as Meta app
    const IG_APP_ID = Deno.env.get("INSTAGRAM_APP_ID") || APP_ID;
    const IG_APP_SECRET = Deno.env.get("INSTAGRAM_APP_SECRET") || APP_SECRET;

    if (isInstagramLogin) {
      // --- Instagram API with Instagram Login (instagram.com) ---
      const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: IG_APP_ID,
          client_secret: IG_APP_SECRET,
          grant_type: "authorization_code",
          redirect_uri: REDIRECT_URI,
          code,
        }),
      });
      const tokenData = await tokenRes.json();
      const shortLived = Array.isArray(tokenData.data) ? tokenData.data[0] : tokenData;
      const shortLivedToken = shortLived?.access_token ?? tokenData.access_token;
      const igUserId = shortLived?.user_id ?? tokenData.user_id;
      if (!shortLivedToken) {
        console.error("[auth-callback] Token exchange failed:", JSON.stringify(tokenData).slice(0, 200));
        throw new Error(tokenData.error_message ?? tokenData.error?.message ?? "Failed to get token from Instagram");
      }
      console.log("[auth-callback] Short-lived token ok, exchanging for long-lived");

      const longTokenUrl = new URL("https://graph.instagram.com/access_token");
      longTokenUrl.searchParams.set("grant_type", "ig_exchange_token");
      longTokenUrl.searchParams.set("client_secret", IG_APP_SECRET);
      longTokenUrl.searchParams.set("access_token", shortLivedToken);
      const longRes = await fetch(longTokenUrl.toString(), {
        method: "GET",
        headers: { "User-Agent": "ChatAutoDMs-Instagram-OAuth/1.0" },
      });
      const longData = await longRes.json();
      let longLivedToken = longData.access_token;
      let expires_in = longData.expires_in ?? 5184000;
      if (!longLivedToken) {
        const errMsg = longData?.error?.message ?? "";
        if (errMsg.toLowerCase().includes("unsupported request")) {
          console.warn("[auth-callback] Long-lived exchange rejected by API, using short-lived token (1h). Account will need re-connect later.");
          longLivedToken = shortLivedToken;
          expires_in = 3600;
        } else {
          console.error("[auth-callback] Long-lived exchange failed:", errMsg);
          throw new Error(errMsg || "Failed to get long-lived token");
        }
      } else {
        console.log("[auth-callback] Long-lived token ok");
      }

      const meRes = await fetch(
        `https://graph.instagram.com/v21.0/me?fields=id,user_id,username,name,profile_picture_url&access_token=${longLivedToken}`
      );
      const meRaw = await meRes.json();
      let igId: string | null = null;
      let accountName = "Instagram";
      let profilePicture: string | null = null;

      if (meRaw?.error) {
        console.warn("[auth-callback] /me failed:", meRaw.error.message, "- using user_id from token response");
        if (!igUserId) throw new Error(meRaw.error.message ?? "Instagram API error");
        igId = String(igUserId);
      } else {
        const meData = Array.isArray(meRaw?.data) ? meRaw.data[0] : meRaw;
        igId = meData?.id ?? meData?.user_id ?? igUserId ?? meRaw?.id ?? meRaw?.user_id ?? null;
        if (igId) {
          accountName = meData?.username ?? meData?.name ?? meRaw?.username ?? meRaw?.name ?? "Instagram";
          profilePicture = meData?.profile_picture_url ?? meRaw?.profile_picture_url ?? null;
        }
      }

      if (!igId) {
        console.error("[auth-callback] No Instagram id from /me or token:", JSON.stringify(meRaw).slice(0, 200));
        throw new Error("Could not get Instagram account id");
      }
      console.log("[auth-callback] Got igId:", String(igId).slice(0, 15) + "...");

      accountName = accountName || "Instagram";
      const tokenExpiry = new Date(Date.now() + expires_in * 1000).toISOString();

      // Save in one transaction via RPC (ensures profile exists + upserts instagram_accounts)
      const { data: savedId, error: rpcError } = await supabase.rpc("save_instagram_account_after_oauth", {
        p_user_id: userId,
        p_instagram_business_id: String(igId),
        p_page_id: String(igId),
        p_account_name: accountName,
        p_profile_picture: profilePicture,
        p_access_token: longLivedToken,
        p_token_expiry: tokenExpiry,
        p_is_active: true,
      });

      if (rpcError) {
        console.error("[auth-callback] save_instagram_account_after_oauth failed:", rpcError.message, "user_id:", userId?.slice(0, 8));
        throw new Error(rpcError.message || "Failed to save account");
      }
      console.log("[auth-callback] Account saved:", accountName, "user_id:", userId?.slice(0, 8), "id:", savedId);
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, Location: `${appUrl}/connect?success=1` },
      });
    }

    // --- Facebook Login (Pages → Instagram Business) ---
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${APP_ID}&redirect_uri=${REDIRECT_URI}&client_secret=${APP_SECRET}&code=${code}`
    );
    const tokenData = await tokenRes.json();
    const shortLivedToken = tokenData.access_token;
    if (!shortLivedToken) {
      throw new Error(tokenData.error?.message ?? "Failed to get access token from Facebook");
    }

    const longLivedRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${shortLivedToken}`
    );
    const longLivedJson = await longLivedRes.json();
    const longLivedToken = longLivedJson.access_token;
    const expires_in = longLivedJson.expires_in;
    if (!longLivedToken) {
      throw new Error(longLivedJson.error?.message ?? "Failed to get long-lived token.");
    }

    const pagesRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${longLivedToken}`);
    const pagesData = await pagesRes.json();
    if (pagesData.error) throw new Error(pagesData.error.message ?? "Facebook API error when loading Pages.");
    const pages = pagesData.data ?? [];

    if (pages.length === 0) {
      throw new Error("No Facebook Pages found. Create a Facebook Page and connect it to your Instagram (Professional account).");
    }

    let storedCount = 0;
    for (const page of pages) {
      const igRes = await fetch(`https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account,name,picture&access_token=${longLivedToken}`);
      const pageData = await igRes.json();

      if (pageData.instagram_business_account) {
        const igAccountId = pageData.instagram_business_account.id;

        await supabase.rpc("ensure_profile_exists", { p_user_id: userId }).then(() => true).catch(() => false);
        const { data: authUser } = await supabase.auth.admin.getUserById(userId);
        const email = authUser?.user?.email ?? `${userId}@placeholder.local`;
        await supabase.from("profiles").upsert({
          id: userId,
          email,
          full_name: authUser?.user?.user_metadata?.full_name ?? null,
          avatar_url: authUser?.user?.user_metadata?.avatar_url ?? null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "id", ignoreDuplicates: true }).catch(() => {});

        const { data, error } = await supabase.from("instagram_accounts").upsert({
          user_id: userId,
          instagram_business_id: igAccountId,
          page_id: page.id,
          account_name: pageData.name,
          profile_picture: pageData.picture?.data?.url,
          access_token: longLivedToken,
          token_expiry: new Date(Date.now() + (expires_in || 5184000) * 1000).toISOString(),
          is_active: true
        }, { onConflict: 'instagram_business_id' }).select();

        if (error) throw new Error(error.message || "Failed to save account");
        if (data?.length) storedCount++;
      }
    }

    if (storedCount === 0) {
      throw new Error("No Instagram Business account found. Link your Instagram to a Facebook Page first.");
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

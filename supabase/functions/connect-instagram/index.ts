import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  let body: { access_token: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const { access_token } = body;
  if (!access_token) {
    return new Response(JSON.stringify({ error: "access_token required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const serviceSupabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const APP_ID = Deno.env.get("META_APP_ID")!;
    const APP_SECRET = Deno.env.get("META_APP_SECRET")!;

    let longLivedToken = access_token;
    let expiresIn = 5184000;

    const exchangeRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${access_token}`
    );
    const exchangeData = await exchangeRes.json();
    if (exchangeData.access_token) {
      longLivedToken = exchangeData.access_token;
      expiresIn = exchangeData.expires_in ?? 5184000;
    }

    const pagesRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${longLivedToken}`);
    const { data: pages } = await pagesRes.json();

    if (!pages || !Array.isArray(pages)) {
      return new Response(JSON.stringify({ error: "No Facebook Pages found. Connect a Page to your Instagram Business account." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const connectedAccounts = [];

    for (const page of pages) {
      const igRes = await fetch(`https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account,name,picture&access_token=${longLivedToken}`);
      const pageData = await igRes.json();

      if (pageData.instagram_business_account) {
        const igAccountId = pageData.instagram_business_account.id;
        const pageToken = page.access_token || longLivedToken;

        const { data, error } = await serviceSupabase.from("instagram_accounts").upsert({
          user_id: user.id,
          instagram_business_id: igAccountId,
          page_id: page.id,
          account_name: pageData.name,
          profile_picture: pageData.picture?.data?.url,
          access_token: pageToken,
          token_expiry: new Date(Date.now() + expiresIn * 1000).toISOString(),
          is_active: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: "instagram_business_id" }).select();

        if (data) connectedAccounts.push(data[0]);
      }
    }

    return new Response(JSON.stringify({ success: true, accounts: connectedAccounts }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err?.message ?? "Failed to connect Instagram" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

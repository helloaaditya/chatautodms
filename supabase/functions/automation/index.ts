import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { flow, senderId, commentId, instagramAccountId } = await req.json();

  if (!flow || !senderId) return new Response("Missing parameters", { status: 400 });

  // 1. Fetch Instagram Account Access Token
  const { data: account } = await supabase
    .from("instagram_accounts")
    .select("access_token, instagram_business_id")
    .eq("id", instagramAccountId)
    .single();

  if (!account) return new Response("Account not found", { status: 404 });

  // 2. Start Traversing the Flow
  const nodes = flow.nodes;
  const startNode = nodes.find((n: any) => n.type === "start");

  let currentNode = startNode;

  while (currentNode) {
    // A. EXECUTE NODE ACTION
    if (currentNode.type === "message") {
      await sendMessage(account.instagram_business_id, senderId, currentNode.data.text, account.access_token);
    } else if (currentNode.type === "comment_reply" && commentId) {
      await replyToComment(commentId, currentNode.data.text, account.access_token);
    } else if (currentNode.type === "delay") {
      // In production, use a scheduling queue (Upstash or Redis)
      await new Promise(resolve => setTimeout(resolve, currentNode.data.seconds * 1000));
    } else if (currentNode.type === "lead_capture") {
      // Capture lead in database
      await supabase.from("leads").upsert({
        user_id: flow.user_id,
        instagram_account_id: instagramAccountId,
        instagram_user_id: senderId,
        tags: [currentNode.data.tag]
      });
    }

    // B. FIND NEXT NODE
    const edge = flow.edges.find((e: any) => e.source === currentNode.id);
    if (!edge) break; // End of flow

    currentNode = nodes.find((n: any) => n.id === edge.target);
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
});

async function sendMessage(igId: string, recipientId: string, text: string, token: string) {
  const res = await fetch(`https://graph.facebook.com/v19.0/${igId}/messages?access_token=${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text }
    })
  });
  return res.json();
}

async function replyToComment(commentId: string, text: string, token: string) {
  const res = await fetch(`https://graph.facebook.com/v19.0/${commentId}/replies?access_token=${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: text })
  });
  return res.json();
}

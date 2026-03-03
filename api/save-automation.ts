/**
 * Server-side save (create or update) of an automation.
 * Uses service role so the row is always written and config is stored.
 */
type VercelReq = {
  method?: string;
  headers?: { cookie?: string; authorization?: string };
  body?: string;
};
type VercelRes = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => VercelRes;
  json: (body: object) => void;
};

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getUserIdFromJwt(token: string): string | null {
  try {
    const b64 = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/');
    if (!b64) return null;
    const payload = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    return payload?.sub ?? null;
  } catch {
    return null;
  }
}

function getTokenFromRequest(req: VercelReq): string | null {
  const auth = req.headers?.authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  const cookie = req.headers?.cookie;
  if (!cookie) return null;
  const match = cookie.match(/sb-[^=]+-auth-token=([^;]+)/);
  if (!match) return null;
  try {
    const decoded = decodeURIComponent(match[1]);
    const session = JSON.parse(decoded) as { access_token?: string };
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

type AutomationPayload = {
  id?: string;
  name?: string;
  trigger_type: string;
  trigger_keywords: string[];
  config: Record<string, unknown>;
  instagram_account_id?: string;
  is_active?: boolean;
};

export default async function handler(req: VercelReq, res: VercelRes) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = getTokenFromRequest(req);
  const userId = token ? getUserIdFromJwt(token) : null;
  if (!userId) {
    return res.status(401).json({ error: 'Not signed in' });
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server config missing' });
  }

  let body: AutomationPayload;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as unknown) as AutomationPayload;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const isUpdate = Boolean(body.id);

  if (isUpdate) {
    const updatePayload: Record<string, unknown> = {
      trigger_type: body.trigger_type,
      trigger_keywords: body.trigger_keywords ?? [],
      config: body.config ?? {},
      is_active: body.is_active ?? true,
    };
    if (body.instagram_account_id) {
      updatePayload.instagram_account_id = body.instagram_account_id;
    }
    const { data, error } = await supabase
      .from('automations')
      .update(updatePayload)
      .eq('id', body.id)
      .eq('user_id', userId)
      .select('id')
      .single();
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(200).json({ id: data?.id });
  }

  let instagramAccountId = body.instagram_account_id;
  if (!instagramAccountId) {
    const { data: accounts } = await supabase
      .from('instagram_accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);
    instagramAccountId = accounts?.[0]?.id ?? null;
  }
  if (!instagramAccountId) {
    return res.status(400).json({ error: 'Connect an Instagram account first' });
  }

  const name = body.name && String(body.name).trim() ? body.name : `Automation – ${new Date().toLocaleDateString()}`;
  const insertPayload = {
    user_id: userId,
    instagram_account_id: instagramAccountId,
    name,
    trigger_type: body.trigger_type,
    trigger_keywords: body.trigger_keywords ?? [],
    is_active: body.is_active ?? true,
    config: body.config ?? {},
  };

  const { data, error } = await supabase
    .from('automations')
    .insert(insertPayload)
    .select('id')
    .single();

  if (error) {
    if (error.message?.includes('config') || error.message?.includes('column')) {
      return res.status(400).json({
        error: 'Database needs the config column. Run migration: 20260303000000_automations_config.sql',
      });
    }
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({ id: data?.id });
}

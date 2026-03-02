/**
 * Server-side fetch of Instagram accounts.
 * Accepts session via Authorization: Bearer <token> (primary) or cookie (fallback).
 * Uses service role so we always get the correct user's data.
 */
type VercelReq = {
  method?: string;
  headers?: { cookie?: string; authorization?: string };
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

export default async function handler(req: VercelReq, res: VercelRes) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = getTokenFromRequest(req);
  const userId = token ? getUserIdFromJwt(token) : null;
  if (!userId) {
    return res.status(401).json({ error: 'Not signed in' });
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server config missing. Set SUPABASE_SERVICE_ROLE_KEY in Vercel.' });
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { data, error } = await supabase
      .from('instagram_accounts')
      .select('id, user_id, instagram_business_id, page_id, account_name, profile_picture, is_active, token_expiry, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json(data ?? []);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to load accounts';
    return res.status(500).json({ error: msg });
  }
}

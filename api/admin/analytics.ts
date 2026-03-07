/**
 * Admin: list analytics events. Self-contained.
 */
type Req = { method?: string; headers?: { cookie?: string; authorization?: string }; query?: { limit?: string } };
type Res = { setHeader: (n: string, v: string) => void; status: (c: number) => Res; json: (b: object) => void };

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getToken(req: Req): string | null {
  const auth = req.headers?.authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  const cookie = req.headers?.cookie;
  if (!cookie) return null;
  const m = cookie.match(/sb-[^=]+-auth-token=([^;]+)/);
  if (!m) return null;
  try {
    const decoded = decodeURIComponent(m[1]);
    const session = JSON.parse(decoded) as { access_token?: string };
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

function getUserId(token: string): string | null {
  try {
    const b64 = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/');
    if (!b64) return null;
    const payload = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    return payload?.sub ?? null;
  } catch {
    return null;
  }
}

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'Method not allowed' });
    }
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return res.status(500).json({ error: 'Server config missing' });
    }
    const token = getToken(req);
    const userId = token ? getUserId(token) : null;
    if (!userId) return res.status(401).json({ error: 'Not signed in' });
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', userId).single();
    if (!profile?.is_admin) return res.status(403).json({ error: 'Admin access required' });

    const limit = Math.min(Number(req.query?.limit) || 200, 500);
    const { data, error } = await supabase
      .from('analytics')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data ?? []);
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' });
  }
}

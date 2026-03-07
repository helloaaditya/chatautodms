/**
 * Admin: list/update profiles. Self-contained (no shared imports).
 */
type Req = { method?: string; headers?: { cookie?: string; authorization?: string }; body?: string; query?: { id?: string } };
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
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return res.status(500).json({ error: 'Server config missing' });
    }
    const token = getToken(req);
    const userId = token ? getUserId(token) : null;
    if (!userId) {
      return res.status(401).json({ error: 'Not signed in' });
    }
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', userId).single();
    if (!profile?.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (req.method === 'GET') {
      const id = req.query?.id;
      if (id) {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
        if (error) return res.status(404).json({ error: error.message });
        return res.status(200).json(data);
      }
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data ?? []);
    }

    if (req.method === 'PATCH') {
      let body: { id: string; full_name?: string; subscription_tier?: string; subscription_status?: string; is_admin?: boolean };
      try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as typeof body);
      } catch {
        return res.status(400).json({ error: 'Invalid JSON' });
      }
      if (!body?.id) return res.status(400).json({ error: 'id required' });
      const updates: Record<string, unknown> = {};
      if (body.full_name !== undefined) updates.full_name = body.full_name;
      if (body.subscription_tier !== undefined) updates.subscription_tier = body.subscription_tier;
      if (body.subscription_status !== undefined) updates.subscription_status = body.subscription_status;
      if (body.is_admin !== undefined) updates.is_admin = Boolean(body.is_admin);
      if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No fields to update' });
      updates.updated_at = new Date().toISOString();
      const { data, error } = await supabase.from('profiles').update(updates).eq('id', body.id).select().single();
      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json(data);
    }

    res.setHeader('Allow', 'GET, PATCH');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' });
  }
}

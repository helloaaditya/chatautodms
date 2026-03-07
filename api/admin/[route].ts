/**
 * Single admin API: handles /api/admin/me, /api/admin/profiles, /api/admin/instagram-accounts,
 * /api/admin/automations, /api/admin/leads, /api/admin/stats, /api/admin/analytics, /api/admin/message-logs.
 * One serverless function to stay under Vercel Hobby limit. File [route].ts so Vercel matches /api/admin/:route.
 */
type Req = {
  method?: string;
  url?: string;
  path?: string;
  query?: { route?: string; id?: string; limit?: string; [k: string]: string | string[] | undefined };
  headers?: { cookie?: string; authorization?: string };
  body?: string;
};
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

function getPathAndQuery(req: Req): { route: string; query: Record<string, string> } {
  // Vercel may pass dynamic segment as req.query.route
  const fromQuery = req.query?.route;
  const routeFromQuery = typeof fromQuery === 'string' ? fromQuery : Array.isArray(fromQuery) ? fromQuery[0] : '';
  const pathOrUrl = req.path || req.url || '/';
  const pathname = pathOrUrl.startsWith('http') ? new URL(pathOrUrl).pathname : pathOrUrl.split('?')[0] || '';
  const routeFromPath = pathname.replace(/^\/api\/admin\/?/, '').split('/')[0] || '';
  const route = routeFromQuery || routeFromPath;
  const query: Record<string, string> = {};
  if (req.query) {
    for (const [k, v] of Object.entries(req.query)) {
      if (k === 'route') continue;
      query[k] = Array.isArray(v) ? v[0] ?? '' : String(v ?? '');
    }
  }
  if (req.url && req.url.includes('?')) {
    const url = new URL(req.url.startsWith('http') ? req.url : `http://localhost${req.url}`);
    url.searchParams.forEach((v, k) => {
      if (!(k in query)) query[k] = v;
    });
  }
  return { route, query };
}

function setNoCache(res: Res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}

export default async function handler(req: Req, res: Res) {
  setNoCache(res);
  const { route, query } = getPathAndQuery(req);

  try {
    if (route !== 'me' && (!SUPABASE_URL || !SERVICE_ROLE_KEY)) {
      if (route === 'me') return res.status(200).json({ isAdmin: false });
      return res.status(500).json({ error: 'Server config missing' });
    }
    const token = getToken(req);
    const userId = token ? getUserId(token) : null;

    if (route === 'me') {
      if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'Method not allowed' });
      }
      if (!userId || !SUPABASE_URL || !SERVICE_ROLE_KEY) return res.status(200).json({ isAdmin: false });
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
      const { data } = await supabase.from('profiles').select('is_admin').eq('id', userId).single();
      return res.status(200).json({ isAdmin: Boolean(data?.is_admin) });
    }

    if (!userId) return res.status(401).json({ error: 'Not signed in' });
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', userId).single();
    if (!profile?.is_admin) return res.status(403).json({ error: 'Admin access required' });

    const id = query.id;
    const limit = Math.min(Number(query.limit) || 200, 500);

    if (route === 'stats') {
      if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'Method not allowed' });
      }
      const [p, a, am, l, an, m] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('instagram_accounts').select('id', { count: 'exact', head: true }),
        supabase.from('automations').select('id', { count: 'exact', head: true }),
        supabase.from('leads').select('id', { count: 'exact', head: true }),
        supabase.from('analytics').select('id', { count: 'exact', head: true }),
        supabase.from('message_logs').select('id', { count: 'exact', head: true }),
      ]);
      return res.status(200).json({
        profiles: p.count ?? 0,
        instagram_accounts: a.count ?? 0,
        automations: am.count ?? 0,
        leads: l.count ?? 0,
        analytics_events: an.count ?? 0,
        message_logs: m.count ?? 0,
      });
    }

    if (route === 'analytics') {
      if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'Method not allowed' });
      }
      const { data, error } = await supabase.from('analytics').select('*').order('created_at', { ascending: false }).limit(limit);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data ?? []);
    }

    if (route === 'message-logs') {
      if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'Method not allowed' });
      }
      const { data, error } = await supabase.from('message_logs').select('*').order('created_at', { ascending: false }).limit(limit);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data ?? []);
    }

    if (route === 'profiles') {
      if (req.method === 'GET') {
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
    }

    if (route === 'instagram-accounts') {
      if (req.method === 'GET') {
        const sel = 'id, user_id, instagram_business_id, page_id, account_name, profile_picture, is_active, token_expiry, created_at, updated_at';
        if (id) {
          const { data, error } = await supabase.from('instagram_accounts').select(sel).eq('id', id).single();
          if (error) return res.status(404).json({ error: error.message });
          return res.status(200).json(data);
        }
        const { data, error } = await supabase.from('instagram_accounts').select(sel).order('created_at', { ascending: false });
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data ?? []);
      }
      if (req.method === 'PATCH') {
        let body: { id: string; account_name?: string; is_active?: boolean };
        try {
          body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as typeof body);
        } catch {
          return res.status(400).json({ error: 'Invalid JSON' });
        }
        if (!body?.id) return res.status(400).json({ error: 'id required' });
        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (body.account_name !== undefined) updates.account_name = body.account_name;
        if (body.is_active !== undefined) updates.is_active = Boolean(body.is_active);
        const { data, error } = await supabase.from('instagram_accounts').update(updates).eq('id', body.id).select().single();
        if (error) return res.status(400).json({ error: error.message });
        return res.status(200).json(data);
      }
      if (req.method === 'DELETE') {
        if (!id) return res.status(400).json({ error: 'id query required' });
        const { error } = await supabase.from('instagram_accounts').delete().eq('id', id);
        if (error) return res.status(400).json({ error: error.message });
        return res.status(200).json({ deleted: true });
      }
      res.setHeader('Allow', 'GET, PATCH, DELETE');
      return res.status(405).json({ error: 'Method not allowed' });
    }

    if (route === 'automations') {
      if (req.method === 'GET') {
        if (id) {
          const { data, error } = await supabase.from('automations').select('*, flows(*)').eq('id', id).single();
          if (error) return res.status(404).json({ error: error.message });
          return res.status(200).json(data);
        }
        const { data, error } = await supabase.from('automations').select('*').order('created_at', { ascending: false });
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data ?? []);
      }
      if (req.method === 'PATCH') {
        let body: { id: string; name?: string; is_active?: boolean };
        try {
          body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as typeof body);
        } catch {
          return res.status(400).json({ error: 'Invalid JSON' });
        }
        if (!body?.id) return res.status(400).json({ error: 'id required' });
        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (body.name !== undefined) updates.name = body.name;
        if (body.is_active !== undefined) updates.is_active = Boolean(body.is_active);
        const { data, error } = await supabase.from('automations').update(updates).eq('id', body.id).select().single();
        if (error) return res.status(400).json({ error: error.message });
        return res.status(200).json(data);
      }
      if (req.method === 'DELETE') {
        if (!id) return res.status(400).json({ error: 'id query required' });
        const { error } = await supabase.from('automations').delete().eq('id', id);
        if (error) return res.status(400).json({ error: error.message });
        return res.status(200).json({ deleted: true });
      }
      res.setHeader('Allow', 'GET, PATCH, DELETE');
      return res.status(405).json({ error: 'Method not allowed' });
    }

    if (route === 'leads') {
      if (req.method === 'GET') {
        if (id) {
          const { data, error } = await supabase.from('leads').select('*').eq('id', id).single();
          if (error) return res.status(404).json({ error: error.message });
          return res.status(200).json(data);
        }
        const { data, error } = await supabase.from('leads').select('*').order('updated_at', { ascending: false });
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data ?? []);
      }
      if (req.method === 'PATCH') {
        let body: { id: string; username?: string; full_name?: string; email?: string; phone?: string; tags?: string[] };
        try {
          body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as typeof body);
        } catch {
          return res.status(400).json({ error: 'Invalid JSON' });
        }
        if (!body?.id) return res.status(400).json({ error: 'id required' });
        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (body.username !== undefined) updates.username = body.username;
        if (body.full_name !== undefined) updates.full_name = body.full_name;
        if (body.email !== undefined) updates.email = body.email;
        if (body.phone !== undefined) updates.phone = body.phone;
        if (body.tags !== undefined) updates.tags = Array.isArray(body.tags) ? body.tags : [];
        const { data, error } = await supabase.from('leads').update(updates).eq('id', body.id).select().single();
        if (error) return res.status(400).json({ error: error.message });
        return res.status(200).json(data);
      }
      if (req.method === 'DELETE') {
        if (!id) return res.status(400).json({ error: 'id query required' });
        const { error } = await supabase.from('leads').delete().eq('id', id);
        if (error) return res.status(400).json({ error: error.message });
        return res.status(200).json({ deleted: true });
      }
      res.setHeader('Allow', 'GET, PATCH, DELETE');
      return res.status(405).json({ error: 'Method not allowed' });
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' });
  }
}

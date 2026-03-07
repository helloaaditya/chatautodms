import { ensureAdmin } from './lib';

type Req = { method?: string; headers?: object; body?: string; query?: { id?: string } };
type Res = { setHeader: (n: string, v: string) => void; status: (c: number) => Res; json: (b: object) => void };

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const auth = await ensureAdmin(req);
    if (!auth.ok) return res.status(auth.status).json(auth.body);

    if (req.method === 'GET') {
      const id = (req as { query?: { id?: string } }).query?.id;
      if (id) {
        const { data, error } = await auth.supabase.from('profiles').select('*').eq('id', id).single();
        if (error) return res.status(404).json({ error: error.message });
        return res.status(200).json(data);
      }
      const { data, error } = await auth.supabase.from('profiles').select('*').order('created_at', { ascending: false });
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
      const { data, error } = await auth.supabase.from('profiles').update(updates).eq('id', body.id).select().single();
      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json(data);
    }

    res.setHeader('Allow', 'GET, PATCH');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' });
  }
}

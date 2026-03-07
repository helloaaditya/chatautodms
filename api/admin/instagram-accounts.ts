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
        const { data, error } = await auth.supabase
          .from('instagram_accounts')
          .select('id, user_id, instagram_business_id, page_id, account_name, profile_picture, is_active, token_expiry, created_at, updated_at')
          .eq('id', id)
          .single();
        if (error) return res.status(404).json({ error: error.message });
        return res.status(200).json(data);
      }
      const { data, error } = await auth.supabase
        .from('instagram_accounts')
        .select('id, user_id, instagram_business_id, page_id, account_name, profile_picture, is_active, token_expiry, created_at, updated_at')
        .order('created_at', { ascending: false });
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
      const { data, error } = await auth.supabase.from('instagram_accounts').update(updates).eq('id', body.id).select().single();
      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const id = (req as { query?: { id?: string } }).query?.id;
      if (!id) return res.status(400).json({ error: 'id query required' });
      const { error } = await auth.supabase.from('instagram_accounts').delete().eq('id', id);
      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json({ deleted: true });
    }

    res.setHeader('Allow', 'GET, PATCH, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' });
  }
}

import { getTokenFromRequest, getUserIdFromJwt } from '../_lib/adminAuth';

type Req = { method?: string; headers?: unknown };
type Res = { setHeader: (n: string, v: string) => void; status: (c: number) => Res; json: (b: object) => void };

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const token = getTokenFromRequest(req as Parameters<typeof getTokenFromRequest>[0]);
    const userId = token ? getUserIdFromJwt(token) : null;
    if (!userId || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return res.status(200).json({ isAdmin: false });
    }
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { data } = await supabase.from('profiles').select('is_admin').eq('id', userId).single();
    return res.status(200).json({ isAdmin: Boolean(data?.is_admin) });
  } catch {
    return res.status(200).json({ isAdmin: false });
  }
}

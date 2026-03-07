import { ensureAdmin } from './lib';

type Req = { method?: string; headers?: unknown };
type Res = { setHeader: (n: string, v: string) => void; status: (c: number) => Res; json: (b: object) => void };

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const auth = await ensureAdmin(req as Parameters<typeof ensureAdmin>[0]);
    return res.status(200).json({ isAdmin: auth.ok });
  } catch {
    return res.status(200).json({ isAdmin: false });
  }
}

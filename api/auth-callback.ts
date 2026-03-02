// Vercel serverless handler - no @vercel/node required
type VercelReq = { method?: string; query: Record<string, string | string[] | undefined> };
type VercelRes = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => VercelRes;
  json: (body: object) => void;
  redirect: (code: number, url: string) => void;
};

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

/**
 * Proxies OAuth callback to Supabase Edge Function.
 * Avoids CORS: browser calls same-origin /api/auth-callback; server calls Supabase.
 */
export default async function handler(req: VercelReq, res: VercelRes) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const code = Array.isArray(req.query.code) ? req.query.code[0] : req.query.code;
  const state = Array.isArray(req.query.state) ? req.query.state[0] : req.query.state;

  if (!code || !state) {
    return res.redirect(302, '/connect?error=no_code');
  }

  if (!SUPABASE_URL || !ANON_KEY) {
    return res.redirect(302, '/connect?error=' + encodeURIComponent('Server misconfiguration. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel.'));
  }

  const url = `${SUPABASE_URL}/functions/v1/auth-callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;

  try {
    const supabaseRes = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${ANON_KEY}`,
        apikey: ANON_KEY,
      },
      redirect: 'manual',
    });

    if (supabaseRes.status === 302) {
      const location = supabaseRes.headers.get('Location');
      if (location) {
        return res.redirect(302, location);
      }
    }

    if (!supabaseRes.ok) {
      const err = await supabaseRes.json().catch(() => ({}));
      const msg = (err as { message?: string }).message || `Request failed: ${supabaseRes.status}`;
      return res.redirect(302, '/connect?error=' + encodeURIComponent(msg));
    }

    return res.redirect(302, '/connect');
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Connection failed';
    return res.redirect(302, '/connect?error=' + encodeURIComponent(msg));
  }
}

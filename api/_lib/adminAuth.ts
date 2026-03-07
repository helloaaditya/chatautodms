/**
 * Shared helpers for admin API routes: parse JWT and verify user is admin.
 */

type VercelReq = {
  headers?: { cookie?: string; authorization?: string };
};

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function getTokenFromRequest(req: VercelReq): string | null {
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

export function getUserIdFromJwt(token: string): string | null {
  try {
    const b64 = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/');
    if (!b64) return null;
    const payload = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    return payload?.sub ?? null;
  } catch {
    return null;
  }
}

export async function ensureAdmin(req: VercelReq): Promise<
  { ok: true; userId: string; supabase: import('@supabase/supabase-js').SupabaseClient } |
  { ok: false; status: number; body: { error: string } }
> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return { ok: false, status: 500, body: { error: 'Server config missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' } };
  }
  const token = getTokenFromRequest(req);
  const userId = token ? getUserIdFromJwt(token) : null;
  if (!userId) {
    return { ok: false, status: 401, body: { error: 'Not signed in' } };
  }
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single();
  if (error || !profile?.is_admin) {
    return { ok: false, status: 403, body: { error: 'Admin access required' } };
  }
  return { ok: true, userId, supabase };
}

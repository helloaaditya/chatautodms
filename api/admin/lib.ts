/**
 * Inline auth for admin routes (colocated so Vercel bundles it with api/admin/*).
 */

type Req = { method?: string; headers?: Record<string, string | undefined> | { get(name: string): string | null } };

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getHeader(req: Req, name: string): string | null {
  const h = req.headers;
  if (!h) return null;
  if (typeof (h as { get?(n: string): string | null }).get === 'function') {
    return (h as { get(name: string): string | null }).get(name) ?? null;
  }
  const lower = name.toLowerCase();
  const R = h as Record<string, string | undefined>;
  return R[lower] ?? R[name] ?? null;
}

function getToken(req: Req): string | null {
  const auth = getHeader(req, 'authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  const cookie = getHeader(req, 'cookie');
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
    let str: string;
    if (typeof Buffer !== 'undefined') {
      str = Buffer.from(b64, 'base64').toString('utf8');
    } else if (typeof atob !== 'undefined') {
      str = atob(b64);
    } else {
      return null;
    }
    const payload = JSON.parse(str) as { sub?: string };
    return payload?.sub ?? null;
  } catch {
    return null;
  }
}

export async function ensureAdmin(req: Req): Promise<
  { ok: true; userId: string; supabase: import('@supabase/supabase-js').SupabaseClient } |
  { ok: false; status: number; body: { error: string } }
> {
  try {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return { ok: false, status: 500, body: { error: 'Server config missing' } };
    }
    const token = getToken(req);
    const userId = token ? getUserId(token) : null;
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
  } catch (err) {
    return { ok: false, status: 500, body: { error: err instanceof Error ? err.message : 'Internal server error' } };
  }
}

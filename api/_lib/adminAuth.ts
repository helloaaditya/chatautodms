/**
 * Shared helpers for admin API routes: parse JWT and verify user is admin.
 * Works in both Node and Edge (no Buffer dependency for JWT decode).
 */

type HeadersLike = { get?(name: string): string | null; authorization?: string; cookie?: string };
type VercelReq = { method?: string; headers?: HeadersLike };

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getHeader(req: VercelReq, name: string): string | null {
  const h = req.headers as HeadersLike & Record<string, string | undefined> | undefined;
  if (!h) return null;
  if (typeof (h as HeadersLike).get === 'function') return (h as HeadersLike).get?.(name) ?? null;
  const lower = name.toLowerCase();
  return h[lower] ?? h[name] ?? null;
}

export function getTokenFromRequest(req: VercelReq): string | null {
  const auth = getHeader(req, 'authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  const cookie = getHeader(req, 'cookie');
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

/** Base64url decode that works in Node (Buffer) and Edge (atob). */
function base64UrlDecodeToJson(b64: string): Record<string, unknown> | null {
  try {
    const base64 = b64.replace(/-/g, '+').replace(/_/g, '/');
    let str: string;
    if (typeof Buffer !== 'undefined') {
      str = Buffer.from(base64, 'base64').toString('utf8');
    } else if (typeof atob !== 'undefined') {
      str = atob(base64);
    } else {
      return null;
    }
    return JSON.parse(str) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getUserIdFromJwt(token: string): string | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  const payload = base64UrlDecodeToJson(parts[1]);
  return (payload?.sub != null ? String(payload.sub) : null) || null;
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

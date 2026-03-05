/**
 * Fetches Instagram media (posts) for a connected account.
 * Uses the account's stored access_token server-side to call Instagram Graph API.
 */
type VercelReq = {
  method?: string;
  headers?: { cookie?: string; authorization?: string };
  query?: Record<string, string | string[] | undefined>;
};
type VercelRes = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => VercelRes;
  json: (body: object) => void;
};

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getUserIdFromJwt(token: string): string | null {
  try {
    const b64 = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/');
    if (!b64) return null;
    const payload = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    return payload?.sub ?? null;
  } catch {
    return null;
  }
}

function getTokenFromRequest(req: VercelReq): string | null {
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

export default async function handler(req: VercelReq, res: VercelRes) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = getTokenFromRequest(req);
  const userId = token ? getUserIdFromJwt(token) : null;
  if (!userId) {
    return res.status(401).json({ error: 'Not signed in' });
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server config missing' });
  }

  const accountId = typeof req.query?.accountId === 'string' ? req.query.accountId : null;

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    let query = supabase
      .from('instagram_accounts')
      .select('id, instagram_business_id, access_token, account_name')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (accountId) {
      query = query.eq('id', accountId);
    }
    const { data: accounts, error: accountError } = await query.limit(1).order('created_at', { ascending: false });

    if (accountError || !accounts?.length) {
      return res.status(200).json({ data: [], message: 'No connected account or no posts.' });
    }

    const account = accounts[0];
    const igId = account.instagram_business_id;
    const accessToken = account.access_token;
    if (!accessToken) {
      return res.status(200).json({ data: [], message: 'Account token missing.' });
    }

    const url = `https://graph.instagram.com/v21.0/${igId}/media?fields=id,media_type,media_url,thumbnail_url,permalink,timestamp,children{media_url,thumbnail_url,media_type}&limit=24&access_token=${encodeURIComponent(accessToken)}`;
    const mediaRes = await fetch(url);
    type MediaNode = {
      id: string;
      media_type?: string;
      media_url?: string;
      thumbnail_url?: string;
      permalink?: string;
      timestamp?: string;
      children?: { data?: Array<{ media_url?: string; thumbnail_url?: string; media_type?: string }> };
    };
    const mediaJson = (await mediaRes.json()) as { data?: MediaNode[]; error?: { message: string } };

    if (mediaJson.error) {
      return res.status(400).json({ error: mediaJson.error.message, data: [] });
    }

    const raw = mediaJson.data ?? [];
    const list = raw.map((item) => {
      const firstChild = item.media_type === 'CAROUSEL_ALBUM' && item.children?.data?.[0];
      const mediaUrl = item.media_url ?? firstChild?.media_url;
      const thumbUrl = item.thumbnail_url ?? firstChild?.thumbnail_url ?? firstChild?.media_url;
      return {
        id: item.id,
        media_type: item.media_type,
        media_url: mediaUrl ?? undefined,
        thumbnail_url: thumbUrl ?? undefined,
        permalink: item.permalink,
        timestamp: item.timestamp,
      };
    });
    return res.status(200).json({ data: list });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to load posts';
    return res.status(500).json({ error: msg, data: [] });
  }
}

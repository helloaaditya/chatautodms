/**
 * Fetches Instagram stories for a connected account.
 * Uses the account's stored access_token to call Instagram Graph API /{ig-user-id}/stories.
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

type StoryNode = {
  id: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  timestamp?: string;
};

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
  if (!accountId) {
    return res.status(400).json({ error: 'accountId required', data: [] });
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    const { data: accounts, error: accountError } = await supabase
      .from('instagram_accounts')
      .select('id, instagram_business_id, access_token, account_name')
      .eq('user_id', userId)
      .eq('id', accountId)
      .eq('is_active', true)
      .limit(1);

    if (accountError || !accounts?.length) {
      return res.status(200).json({ data: [], message: 'Account not found or no access.' });
    }

    const account = accounts[0];
    const igId = account.instagram_business_id;
    const accessToken = account.access_token;
    if (!accessToken) {
      return res.status(200).json({ data: [], message: 'Account token missing.' });
    }

    const fields = 'id,media_type,media_url,thumbnail_url,timestamp';
    const url = `https://graph.instagram.com/v21.0/${igId}/stories?fields=${fields}&access_token=${encodeURIComponent(accessToken)}`;
    const storiesRes = await fetch(url);
    const storiesJson = (await storiesRes.json()) as { data?: StoryNode[]; error?: { message: string; code?: number } };

    if (storiesJson.error) {
      return res.status(200).json({ data: [], message: storiesJson.error.message || 'No stories or API error.' });
    }

    const raw = storiesJson.data ?? [];
    const list = raw.map((item) => ({
      id: item.id,
      media_type: item.media_type,
      media_url: item.media_url ?? undefined,
      thumbnail_url: item.thumbnail_url ?? item.media_url ?? undefined,
      timestamp: item.timestamp,
    }));
    return res.status(200).json({ data: list });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to load stories';
    return res.status(500).json({ error: msg, data: [] });
  }
}

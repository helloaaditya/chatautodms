import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export async function connectInstagramWithToken(accessToken: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Please log in first');

  const res = await fetch(`${SUPABASE_URL}/functions/v1/connect-instagram`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ access_token: accessToken }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Failed to connect Instagram');
  return json;
}

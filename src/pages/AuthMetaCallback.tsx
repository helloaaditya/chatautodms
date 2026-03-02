import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * OAuth callback: receives redirect from Facebook, forwards to Edge Function with auth header,
 * then redirects user. Supabase Edge Functions require Authorization header.
 */
export const AuthMetaCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
      setStatus('error');
      setErrorMsg('Missing code or state from Facebook');
      return;
    }

    const processCallback = async () => {
      try {
        const url = `${SUPABASE_URL}/functions/v1/auth-callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${ANON_KEY}`,
            'apikey': ANON_KEY,
          },
          redirect: 'manual',
        });

        if (res.status === 302) {
          const location = res.headers.get('Location');
          if (location) {
            window.location.href = location;
            return;
          }
        }

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || `Request failed: ${res.status}`);
        }
      } catch (err) {
        setStatus('error');
        setErrorMsg(err instanceof Error ? err.message : 'Connection failed');
      }
    };

    processCallback();
  }, [searchParams]);

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-bold text-red-600 mb-4">Connection Failed</h1>
          <p className="text-gray-600 mb-6">{errorMsg}</p>
          <a href="/connect" className="text-blue-600 font-semibold hover:underline">← Back to Connect</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <h1 className="text-xl font-bold text-gray-900">Connecting Instagram...</h1>
        <p className="text-gray-500 mt-2">Please wait while we complete the connection.</p>
      </div>
    </div>
  );
};

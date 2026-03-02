import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * OAuth callback: receives redirect from Facebook, then redirects to our API route
 * which proxies to Supabase (avoids CORS - API runs server-side).
 */
export const AuthMetaCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const processedRef = useRef(false);

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorCode = searchParams.get('error_code');
    const errorMessage = searchParams.get('error_message');

    if (errorCode || errorMessage) {
      setStatus('error');
      setErrorMsg(decodeURIComponent(errorMessage || errorCode || 'Facebook returned an error'));
      return;
    }

    if (!code || !state) {
      setStatus('error');
      setErrorMsg('Missing code or state from Facebook');
      return;
    }

    // Prevent double submission (React Strict Mode, back-button, etc.)
    if (processedRef.current) return;
    processedRef.current = true;

    const processCallback = async () => {
      try {
        const apiUrl = `/api/auth-callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
        const res = await fetch(apiUrl, { redirect: 'manual' });

        if (res.status === 302) {
          const location = res.headers.get('Location');
          if (location) {
            window.location.href = location;
            return;
          }
        }

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error || (err as { message?: string }).message || `Request failed: ${res.status}`);
        }
      } catch (err) {
        processedRef.current = false; // Allow retry on network error
        setStatus('error');
        const msg = err instanceof Error ? err.message : 'Connection failed';
        setErrorMsg(msg === 'Failed to fetch'
          ? 'Could not reach server. Check Vercel env vars and ensure auth-callback is deployed.'
          : msg);
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

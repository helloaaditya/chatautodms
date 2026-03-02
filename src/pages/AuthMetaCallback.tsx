import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * DEBUG: Temporary page to capture Facebook OAuth redirect URL.
 * 
 * To use:
 * 1. In Meta App → Facebook Login → Valid OAuth Redirect URIs, add:
 *    http://localhost:3001/auth/meta/callback
 *    (or your deployed URL: https://your-app.vercel.app/auth/meta/callback)
 * 2. Try Connect Instagram again
 * 3. Check browser console for: [auth-meta-callback] Full URL: ...
 * 4. Remove this page and revert redirect URI when done debugging
 */
export const AuthMetaCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [logged, setLogged] = useState(false);

  useEffect(() => {
    const fullUrl = window.location.href;
    console.log('[auth-meta-callback] Full URL:', fullUrl);
    console.log('[auth-meta-callback] code=', searchParams.get('code') ? 'present' : 'missing');
    console.log('[auth-meta-callback] state=', searchParams.get('state') ? 'present' : 'missing');
    setLogged(true);
  }, [searchParams]);

  const handleContinue = () => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const callbackUrl = import.meta.env.VITE_META_REDIRECT_URI;
    if (code && state && callbackUrl) {
      window.location.href = `${callbackUrl}?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-2xl w-full">
        <h1 className="text-xl font-bold text-gray-900 mb-4">OAuth Debug - Meta Callback</h1>
        {logged && (
          <p className="text-green-600 text-sm mb-4">✓ URL logged to console (F12 → Console)</p>
        )}
        <div className="bg-gray-50 rounded-xl p-4 mb-6 overflow-auto max-h-40">
          <code className="text-xs text-gray-700 break-all">{window.location.href}</code>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          code: {searchParams.get('code') ? '✓ present' : '✗ missing'} | 
          state: {searchParams.get('state') ? '✓ present' : '✗ missing'}
        </p>
        <button
          onClick={handleContinue}
          disabled={!searchParams.get('code') || !searchParams.get('state')}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
        >
          Continue to Process (send to auth-callback)
        </button>
      </div>
    </div>
  );
};

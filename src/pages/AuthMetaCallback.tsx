import React, { useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * OAuth callback: receives redirect from Facebook, then immediately redirects to our API route.
 * Uses full-page redirect (not fetch) so the code is used exactly once - no double-submit possible.
 */
export const AuthMetaCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const errorCode = searchParams.get('error_code');
  const errorMessage = searchParams.get('error_message');

  if (errorCode || errorMessage) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-bold text-red-600 mb-4">Connection Failed</h1>
          <p className="text-gray-600 mb-6">{decodeURIComponent(errorMessage || errorCode || 'Facebook returned an error')}</p>
          <a href="/connect" className="text-blue-600 font-semibold hover:underline">← Back to Connect</a>
        </div>
      </div>
    );
  }

  if (!code || !state) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-bold text-red-600 mb-4">Connection Failed</h1>
          <p className="text-gray-600 mb-6">Missing code or state from Facebook.</p>
          <a href="/connect" className="text-blue-600 font-semibold hover:underline">← Back to Connect</a>
        </div>
      </div>
    );
  }

  // Immediate redirect - single request, code used exactly once (ref prevents double redirect in Strict Mode)
  const didRedirect = useRef(false);
  if (!didRedirect.current) {
    didRedirect.current = true;
    const apiUrl = `/api/auth-callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
    window.location.replace(apiUrl);
  }
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <h1 className="text-xl font-bold text-gray-900">Connecting Instagram...</h1>
        <p className="text-gray-500 mt-2">Redirecting...</p>
      </div>
    </div>
  );

};

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../api/supabase';
import { Instagram, Plus, RefreshCcw, Trash2, CheckCircle2, AlertCircle, Loader2, MessageSquare, ArrowRight, ArrowLeftRight } from 'lucide-react';
import { InstagramAccount } from '../types';

// Instagram API with Instagram Login (instagram.com) – no Facebook
const INSTAGRAM_OAUTH_SCOPES = [
  'instagram_business_basic',
  'instagram_business_manage_comments',
  'instagram_business_manage_messages',
].join(',');

export const ConnectInstagram: React.FC = () => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  const fetchAccounts = React.useCallback(async () => {
    setError(null);
    // 1) API with Bearer token (service role)
    const { data: { session } } = await supabase.auth.getSession();
    let list: InstagramAccount[] = [];
    if (session?.access_token) {
      try {
        const res = await fetch('/api/instagram-accounts', {
          credentials: 'include',
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json().catch(() => null);
        if (res.ok && Array.isArray(data)) list = data;
        if (!res.ok && res.status !== 401) setError(typeof data?.error === 'string' ? data.error : 'API error');
      } catch {
        /* ignore */
      }
    }
    // 2) Direct Supabase (RLS) - always run so we have one source of truth
    const { data: supabaseData, error: supabaseError } = await supabase.from('instagram_accounts').select('*');
    if (supabaseError) setError(supabaseError.message);
    if (supabaseData?.length) list = supabaseData;
    setAccounts(list);
    setLoading(false);
  }, []);

  const [searchParams, setSearchParams] = useSearchParams();

  // Wait for session to be known before first fetch (avoids RLS seeing no user)
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(() => {
      if (!cancelled) setSessionReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      if (!cancelled) setSessionReady(true);
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!sessionReady) return;
    fetchAccounts();
  }, [sessionReady, fetchAccounts]);

  useEffect(() => {
    const onFocus = () => sessionReady && fetchAccounts();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [sessionReady, fetchAccounts]);

  useEffect(() => {
    const success = searchParams.get('success');
    const errorParam = searchParams.get('error');
    if (success === '1') {
      setSearchParams({}, { replace: true });
      setError(null);
      setLoading(true);
      fetchAccounts();
      // Aggressive retries after OAuth (DB can be delayed)
      const timers: ReturnType<typeof setTimeout>[] = [];
      [1, 2, 4, 6, 10].forEach((sec, i) => timers.push(setTimeout(() => fetchAccounts(), sec * 1000)));
      return () => timers.forEach(clearTimeout);
    }
    if (errorParam) {
      const decoded = decodeURIComponent(errorParam);
      // OAuth codes are single-use; show friendlier message for retry
      let friendly = decoded;
      if (decoded.toLowerCase().includes('authorization code has been used')) {
        friendly = 'The connection link expired or was already used. Please try connecting again.';
      } else if (decoded.toLowerCase().includes('no instagram business account')) {
        friendly = 'Link your Instagram to a Facebook Page first: Instagram → Settings → Account → Switch to Professional account → Connect to a Facebook Page. Then try again.';
      }
      setError(friendly);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]);

  const handleConnectRedirect = () => {
    setError(null);
    // Use Instagram App ID if set (from App Dashboard > Instagram > Business login settings); else main Meta App ID
    const APP_ID = import.meta.env.VITE_INSTAGRAM_APP_ID || import.meta.env.VITE_META_APP_ID;
    // Must match exactly what you added in Meta Dashboard > Instagram > Business login settings > Valid OAuth Redirect URIs (no trailing slash unless dashboard has it)
    const REDIRECT_URI = import.meta.env.VITE_META_REDIRECT_URI || `${window.location.origin}/auth/meta/callback`;
    if (!APP_ID) {
      setError('App configuration missing. Set VITE_META_APP_ID or VITE_INSTAGRAM_APP_ID.');
      return;
    }
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setError('Please log in first');
        return;
      }
      setConnecting(true);
      const redirectBase = encodeURIComponent(window.location.origin);
      const state = `instagram|${user.id}|${redirectBase}`;
      const oauthParams = new URLSearchParams({
        client_id: APP_ID,
        redirect_uri: REDIRECT_URI,
        response_type: 'code',
        scope: INSTAGRAM_OAUTH_SCOPES,
        state,
        enable_fb_login: '0',
      });
      // Use api.instagram.com per Meta docs (www can return "Invalid platform app")
      const authorizeUrl = `https://api.instagram.com/oauth/authorize?${oauthParams.toString()}`;
      window.location.href = authorizeUrl;
    });
  };

  // Always use redirect flow - more reliable than FB.login when Meta restricts app
  const handleConnect = handleConnectRedirect;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Instagram Accounts</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Connect Instagram and manage automations.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setLoading(true); fetchAccounts(); }}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50 text-gray-700 dark:text-gray-200 rounded-xl font-medium transition-colors"
          >
            <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/20 transition-all active:scale-95"
          >
            {connecting ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
            <span>{connecting ? 'Connecting...' : 'Connect New Account'}</span>
          </button>
        </div>
      </div>

      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-900 dark:text-amber-100 space-y-3">
        <strong>Seeing the same account (e.g. _pastel._eris) on every device/browser?</strong>
        <p>Instagram shows whichever account is <strong>logged in on that device or browser</strong>. So even in Live mode, if that device has _pastel._eris logged in, you’ll see that account.</p>
        <p className="font-medium">To connect a different account:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>On the device/browser where you want to connect: click <strong>Cancel</strong> on the Instagram screen, then <a href="https://www.instagram.com/accounts/logout/" target="_blank" rel="noopener noreferrer" className="font-medium underline hover:no-underline">log out of Instagram</a> (or use a browser/incognito where you’re not logged in).</li>
          <li>Return here and click <strong>Connect New Account</strong>. You’ll get the Instagram <strong>login</strong> screen — enter the username and password of the account you want to connect.</li>
        </ol>
        <p className="text-amber-800 dark:text-amber-200/90 text-xs mt-2">In Development mode, only Instagram Testers can connect — add them in Meta → Roles → Instagram Testers.</p>
      </div>

      {error && (
        <div className="space-y-3">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm font-medium">
            {error}
          </div>
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-200 text-sm">
            <strong>Meta App Issues?</strong> If you saw &quot;Feature not available&quot; / &quot;फ़ीचर उपलब्ध नहीं है&quot; on Facebook: (1) Add yourself as Admin or Tester in Meta app Roles, (2) Complete Business Verification, (3) Ensure Facebook Login is configured. Try again later.
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-white dark:bg-gray-800 animate-pulse rounded-2xl border border-gray-200 dark:border-gray-700" />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden flex flex-col md:flex-row">
            <div className="p-8 md:p-10 flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  C
                </div>
                <ArrowLeftRight className="text-gray-400 dark:text-gray-500 shrink-0" size={24} />
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center text-white shadow-lg">
                  <Instagram size={24} strokeWidth={2} />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Connect Instagram</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Use your Instagram account to connect to ChatAutoDM.
              </p>
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="mt-6 w-full py-3.5 px-6 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-70 transition-all shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2"
              >
                {connecting ? <Loader2 size={22} className="animate-spin" /> : <Instagram size={22} />}
                {connecting ? 'Connecting...' : 'Go To Instagram'}
              </button>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                Log in with Instagram and set your permissions. Once that&apos;s done, you&apos;re all set to connect to ChatAutoDM!
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                If it shows another account (e.g. _pastel._eris), click Cancel, log out of Instagram, then try Connect again to see the login screen.
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-6">
                By continuing, you agree to our <a href="/terms" className="underline hover:text-gray-600">Terms of Service</a> and <a href="/privacy" className="underline hover:text-gray-600">Privacy Policy</a>.
              </p>
              <button
                type="button"
                onClick={() => { setLoading(true); fetchAccounts(); }}
                disabled={loading}
                className="mt-4 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 flex items-center gap-1.5"
              >
                <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
                Refresh list
              </button>
            </div>
            <div className="hidden md:block w-72 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 shrink-0" aria-hidden />
          </div>
        </div>
      ) : (
        <>
        {/* Next step: Set up Auto DMs */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-xl text-white">
              <MessageSquare size={28} />
            </div>
            <div>
              <h4 className="font-bold text-lg">Set up Auto DMs & Automations</h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">Create keyword triggers, auto-reply to DMs and comments, capture leads.</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/automations')}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors shrink-0"
          >
            Create Automation
            <ArrowRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((account) => (
            <div key={account.id} className="group relative bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-xl hover:border-blue-500/50 transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div className="relative">
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white dark:border-gray-700 shadow-md bg-gray-100">
                    {account.profile_picture ? (
                      <img src={account.profile_picture} alt={account.account_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Instagram className="text-gray-400" size={24} />
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-800 rounded-full p-1 shadow-sm">
                    <Instagram className="text-pink-500" size={14} />
                  </div>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                    <RefreshCcw size={18} />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <div>
                <h4 className="font-bold text-lg truncate">{account.account_name || 'Instagram Account'}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-1 truncate">
                  ID: {account.instagram_business_id}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-xs font-semibold">
                  <CheckCircle2 size={14} />
                  <span>Active</span>
                </div>
                <span className="text-xs text-gray-400">
                  {account.created_at ? new Date(account.created_at).toLocaleDateString() : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
        </>
      )}

      <details className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
        <summary className="text-sm font-medium text-gray-600 dark:text-gray-400 cursor-pointer list-none flex items-center gap-2">
          <AlertCircle size={18} />
          Tips for connecting
        </summary>
        <ul className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-1.5 list-disc list-inside pl-1">
          <li>Use a Professional or Creator Instagram account.</li>
          <li>Enable &quot;Allow Access to Messages&quot; in Instagram settings.</li>
        </ul>
      </details>
    </div>
  );
};

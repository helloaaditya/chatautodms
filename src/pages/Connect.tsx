import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../api/supabase';
import { Instagram, Plus, RefreshCcw, Trash2, CheckCircle2, AlertCircle, Loader2, MessageSquare, ArrowRight, ArrowLeftRight, Edit3, X } from 'lucide-react';
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
  const [editingAccount, setEditingAccount] = useState<InstagramAccount | null>(null);
  const [editName, setEditName] = useState('');
  const [editPicture, setEditPicture] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const fetchAccounts = React.useCallback(async () => {
    setError(null);
    const { data: { session } } = await supabase.auth.getSession();
    let list: InstagramAccount[] = [];
    // 1) API (service role) – sees all rows for this user, often before RLS/replication
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
    // 2) Supabase (RLS) – merge with API result so we never drop a newly added account
    const { data: supabaseData, error: supabaseError } = await supabase.from('instagram_accounts').select('*');
    if (supabaseError) setError(supabaseError.message);
    if (Array.isArray(supabaseData) && supabaseData.length > 0) {
      const seen = new Set(list.map((a) => a.id));
      for (const row of supabaseData) {
        if (!seen.has(row.id)) {
          list = [...list, row];
          seen.add(row.id);
        }
      }
    }
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
      // Retry several times so new account from OAuth is visible (DB/API can be delayed)
      const timers: ReturnType<typeof setTimeout>[] = [];
      [0.5, 1, 2, 4, 6, 10, 15].forEach((sec) =>
        timers.push(setTimeout(() => fetchAccounts(), sec * 1000))
      );
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

  const openRename = (account: InstagramAccount) => {
    setEditingAccount(account);
    setEditName(account.account_name || '');
    setEditPicture(account.profile_picture || '');
    setEditError(null);
  };

  const saveRename = async () => {
    if (!editingAccount) return;
    setEditError(null);
    setSavingEdit(true);
    const name = editName.trim() || null;
    const picture = editPicture.trim() || null;
    const { error: err } = await supabase
      .from('instagram_accounts')
      .update({ account_name: name, profile_picture: picture })
      .eq('id', editingAccount.id);
    setSavingEdit(false);
    if (err) {
      setEditError(err.message);
      return;
    }
    setEditingAccount(null);
    fetchAccounts();
  };

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
            <div key={account.id} className="group relative bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-blue-500/30 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="relative shrink-0">
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700">
                    {account.profile_picture ? (
                      <img src={account.profile_picture} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Instagram className="text-gray-400" size={26} />
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 bg-white dark:bg-gray-800 rounded-full p-1 shadow border border-gray-200 dark:border-gray-600">
                    <Instagram className="text-pink-500" size={12} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-lg truncate">{account.account_name || 'Instagram'}</h4>
                    {(account.account_name === 'Instagram' || !account.account_name) && (
                      <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full">Set name</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5" title={account.instagram_business_id}>
                    {account.instagram_business_id}
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => openRename(account)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                      <Edit3 size={14} />
                      Rename
                    </button>
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-xs font-semibold">
                      <CheckCircle2 size={12} />
                      Active
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                Connected {account.created_at ? new Date(account.created_at).toLocaleDateString() : ''}
              </p>
            </div>
          ))}
        </div>

        {/* Rename account modal */}
        {editingAccount && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !savingEdit && setEditingAccount(null)}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Rename account</h3>
                <button type="button" onClick={() => !savingEdit && setEditingAccount(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
                  <X size={20} />
                </button>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Set a display name and optional profile picture URL so you can tell accounts apart.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Display name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="e.g. @myhandle or Brand Account"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Profile picture URL (optional)</label>
                  <input
                    type="url"
                    value={editPicture}
                    onChange={(e) => setEditPicture(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              {editError && <p className="mt-2 text-sm text-red-500">{editError}</p>}
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => !savingEdit && setEditingAccount(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                  Cancel
                </button>
                <button type="button" onClick={saveRename} disabled={savingEdit} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {savingEdit ? <Loader2 size={18} className="animate-spin" /> : null}
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
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

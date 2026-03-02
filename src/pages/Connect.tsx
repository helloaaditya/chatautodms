import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../api/supabase';
import { Instagram, Plus, RefreshCcw, Trash2, CheckCircle2, AlertCircle, Loader2, MessageSquare, ArrowRight } from 'lucide-react';
import { InstagramAccount } from '../types';

// instagram_manage_messages requires App Review approval - add after connecting
const INSTAGRAM_SCOPES = [
  'public_profile',
  'pages_show_list',
  'pages_read_engagement',
  'instagram_basic',
].join(',');

export const ConnectInstagram: React.FC = () => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = async () => {
    const { data } = await supabase.from('instagram_accounts').select('*');
    if (data) setAccounts(data);
    setLoading(false);
  };

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    const success = searchParams.get('success');
    const errorParam = searchParams.get('error');
    if (success === '1') {
      setSearchParams({}, { replace: true });
      setLoading(true);
      fetchAccounts();
    }
    if (errorParam) {
      const decoded = decodeURIComponent(errorParam);
      // OAuth codes are single-use; show friendlier message for retry
      const friendly =
        decoded.toLowerCase().includes('authorization code has been used')
          ? 'The connection link expired or was already used. Please try connecting again to get a fresh authorization.'
          : decoded;
      setError(friendly);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]);

  const handleConnectRedirect = () => {
    setError(null);
    const APP_ID = import.meta.env.VITE_META_APP_ID;
    // Use frontend callback so we can add auth header when calling Edge Function
    const REDIRECT_URI = `${window.location.origin}/auth/meta/callback`;
    if (!APP_ID) {
      setError('App configuration missing. Contact support.');
      return;
    }
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setError('Please log in first');
        return;
      }
      setConnecting(true);
      const redirectBase = encodeURIComponent(window.location.origin);
      const state = `${user.id}|${redirectBase}`;
      const url = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${INSTAGRAM_SCOPES}&response_type=code&state=${encodeURIComponent(state)}`;
      window.location.href = url;
    });
  };

  // Always use redirect flow - more reliable than FB.login when Meta restricts app
  const handleConnect = handleConnectRedirect;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Instagram Accounts</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Connect and manage your Instagram Business accounts.</p>
        </div>
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/20 transition-all active:scale-95"
        >
          {connecting ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
          <span>{connecting ? 'Connecting...' : 'Connect New Account'}</span>
        </button>
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
        <div className="flex flex-col items-center justify-center py-20 px-4 bg-white dark:bg-gray-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-center">
          <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-6">
            <Instagram className="text-blue-600 dark:text-blue-400" size={40} />
          </div>
          <h3 className="text-xl font-bold">Connect your Instagram account</h3>
          <p className="text-gray-500 mt-2 max-w-md">
            Click below to connect your Instagram Business account via Facebook. After connecting, you can set up auto DMs, comment replies, and lead capture.
          </p>
          <div className="mt-8 space-y-4">
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white rounded-xl font-semibold transition-colors flex items-center gap-2 mx-auto"
            >
              {connecting ? <Loader2 size={20} className="animate-spin" /> : <Instagram size={20} />}
              {connecting ? 'Connecting...' : 'Connect Instagram Account'}
            </button>
            <p className="text-xs text-gray-400">You&apos;ll be redirected to Facebook to authorize</p>
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

      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-2xl p-6 flex gap-4">
        <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-xl h-fit">
          <AlertCircle className="text-blue-600 dark:text-blue-400" size={24} />
        </div>
        <div>
          <h4 className="font-bold text-blue-900 dark:text-blue-100">Before you connect</h4>
          <ul className="mt-2 text-sm text-blue-700 dark:text-blue-300 space-y-1.5 list-disc list-inside">
            <li>Your Instagram account must be a <span className="font-semibold underline">Professional/Business</span> account.</li>
            <li>It must be connected to a <span className="font-semibold underline">Facebook Page</span> you manage.</li>
            <li>Make sure &quot;Allow Access to Messages&quot; is enabled in Instagram settings.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

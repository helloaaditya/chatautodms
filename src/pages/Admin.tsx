import React, { useEffect, useState, useCallback } from 'react';
import {
  Users,
  Instagram,
  MessageSquare,
  UserPlus,
  Shield,
  Loader2,
  Search,
  Pencil,
  Trash2,
  X,
  LayoutDashboard,
  BarChart3,
  Mail,
} from 'lucide-react';
import { supabase } from '../api/supabase';

const API = '/api/admin';

async function getSessionToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

type TabId = 'overview' | 'users' | 'accounts' | 'automations' | 'leads' | 'analytics' | 'message_logs';

interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
  subscription_tier: string;
  subscription_status: string;
  is_admin: boolean;
  created_at: string;
}

interface InstagramAccountRow {
  id: string;
  user_id: string;
  instagram_business_id: string;
  page_id: string;
  account_name: string | null;
  is_active: boolean;
  created_at: string;
}

interface AutomationRow {
  id: string;
  user_id: string;
  instagram_account_id: string;
  name: string;
  trigger_type: string;
  is_active: boolean;
  created_at: string;
}

interface LeadRow {
  id: string;
  user_id: string;
  instagram_account_id: string;
  instagram_user_id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
  created_at: string;
}

interface Stats {
  profiles: number;
  instagram_accounts: number;
  automations: number;
  leads: number;
  analytics_events: number;
  message_logs: number;
}

interface AnalyticsRow {
  id: string;
  user_id: string;
  instagram_account_id: string;
  automation_id: string | null;
  event_type: string;
  created_at: string;
}

interface MessageLogRow {
  id: string;
  user_id: string;
  instagram_account_id: string;
  sender_id: string;
  receiver_id: string;
  message_text: string | null;
  message_type: string;
  status: string | null;
  created_at: string;
}

export const Admin: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [accounts, setAccounts] = useState<InstagramAccountRow[]>([]);
  const [automations, setAutomations] = useState<AutomationRow[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [analyticsList, setAnalyticsList] = useState<AnalyticsRow[]>([]);
  const [messageLogsList, setMessageLogsList] = useState<MessageLogRow[]>([]);

  const [editModal, setEditModal] = useState<{ type: TabId; row: Record<string, unknown> } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
    const token = await getSessionToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    // Bypass edge/browser cache so admin always gets fresh data (avoids 304)
    const isGet = (options.method ?? 'GET') === 'GET';
    const finalUrl = isGet ? `${url}${url.includes('?') ? '&' : '?'}_t=${Date.now()}` : url;
    const res = await fetch(finalUrl, { ...options, headers, cache: 'no-store' });
    return res;
  }, []);

  /** Check admin via Supabase (same source as sidebar) so we don't depend on API for the gate. */
  const checkAdminViaSupabase = useCallback(async (): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return false;
    const { data } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
    return Boolean(data?.is_admin);
  }, []);

  const parseJson = useCallback(async (res: Response): Promise<unknown> => {
    const text = await res.text();
    try {
      return text ? JSON.parse(text) : null;
    } catch {
      return null;
    }
  }, []);

  const setErrorFromRes = useCallback((res: Response, data: unknown, fallback: string) => {
    if (res.ok) return;
    const msg = data && typeof data === 'object' && 'error' in data ? String((data as { error: string }).error) : fallback;
    setLoadError(`${fallback}: ${res.status} ${msg}`);
  }, []);

  const loadProfiles = useCallback(async () => {
    try {
      const res = await fetchWithAuth(API + '/profiles');
      const data = await parseJson(res);
      if (res.ok) setProfiles(Array.isArray(data) ? data : []); else setErrorFromRes(res, data, 'Profiles');
    } catch (_) {
      setLoadError('Failed to load profiles. Check network and try again.');
    }
  }, [fetchWithAuth, parseJson, setErrorFromRes]);

  const loadAccounts = useCallback(async () => {
    try {
      const res = await fetchWithAuth(API + '/instagram-accounts');
      const data = await parseJson(res);
      if (res.ok) setAccounts(Array.isArray(data) ? data : []); else setErrorFromRes(res, data, 'Accounts');
    } catch (_) {
      setLoadError('Failed to load accounts.');
    }
  }, [fetchWithAuth, parseJson, setErrorFromRes]);

  const loadAutomations = useCallback(async () => {
    try {
      const res = await fetchWithAuth(API + '/automations');
      const data = await parseJson(res);
      if (res.ok) setAutomations(Array.isArray(data) ? data : []); else setErrorFromRes(res, data, 'Automations');
    } catch (_) {
      setLoadError('Failed to load automations.');
    }
  }, [fetchWithAuth, parseJson, setErrorFromRes]);

  const loadLeads = useCallback(async () => {
    try {
      const res = await fetchWithAuth(API + '/leads');
      const data = await parseJson(res);
      if (res.ok) setLeads(Array.isArray(data) ? data : []); else setErrorFromRes(res, data, 'Leads');
    } catch (_) {
      setLoadError('Failed to load leads.');
    }
  }, [fetchWithAuth, parseJson, setErrorFromRes]);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetchWithAuth(API + '/stats');
      const data = await parseJson(res);
      if (res.ok && data && typeof data === 'object') setStats(data as Stats); else setErrorFromRes(res, data, 'Stats');
    } catch (_) {
      setLoadError('Failed to load stats.');
    }
  }, [fetchWithAuth, parseJson, setErrorFromRes]);

  const loadAnalytics = useCallback(async () => {
    try {
      const res = await fetchWithAuth(API + '/analytics');
      const data = await parseJson(res);
      if (res.ok) setAnalyticsList(Array.isArray(data) ? data : []); else setErrorFromRes(res, data, 'Analytics');
    } catch (_) {
      setLoadError('Failed to load analytics.');
    }
  }, [fetchWithAuth, parseJson, setErrorFromRes]);

  const loadMessageLogs = useCallback(async () => {
    try {
      const res = await fetchWithAuth(API + '/message-logs');
      const data = await parseJson(res);
      if (res.ok) setMessageLogsList(Array.isArray(data) ? data : []); else setErrorFromRes(res, data, 'Message logs');
    } catch (_) {
      setLoadError('Failed to load message logs.');
    }
  }, [fetchWithAuth, parseJson, setErrorFromRes]);

  const retryLoad = useCallback(() => {
    setLoadError(null);
    setLoading(true);
    Promise.all([
      loadProfiles(),
      loadAccounts(),
      loadAutomations(),
      loadLeads(),
      loadStats(),
      loadAnalytics(),
      loadMessageLogs(),
    ]).finally(() => setLoading(false));
  }, [loadProfiles, loadAccounts, loadAutomations, loadLeads, loadStats, loadAnalytics, loadMessageLogs]);

  useEffect(() => {
    (async () => {
      const isAdmin = await checkAdminViaSupabase();
      if (!isAdmin) {
        setForbidden(true);
        setLoading(false);
        return;
      }
      setLoadError(null);
      await Promise.all([
        loadProfiles(),
        loadAccounts(),
        loadAutomations(),
        loadLeads(),
        loadStats(),
        loadAnalytics(),
        loadMessageLogs(),
      ]);
      setLoading(false);
    })();
  }, [checkAdminViaSupabase, loadProfiles, loadAccounts, loadAutomations, loadLeads, loadStats, loadAnalytics, loadMessageLogs]);

  const handleUpdate = async (type: TabId, id: string, payload: Record<string, unknown>) => {
    setSaving(true);
    const endpoint =
      type === 'users' ? '/profiles' : type === 'accounts' ? '/instagram-accounts' : type === 'automations' ? '/automations' : '/leads';
    const res = await fetchWithAuth(API + endpoint, { method: 'PATCH', body: JSON.stringify({ id, ...payload }) });
    setSaving(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || 'Update failed');
      return;
    }
    setEditModal(null);
    if (type === 'users') loadProfiles();
    else if (type === 'accounts') loadAccounts();
    else if (type === 'automations') loadAutomations();
    else loadLeads();
  };

  const handleDelete = async (type: TabId, id: string) => {
    if (!window.confirm('Delete this record? This cannot be undone.')) return;
    setDeletingId(id);
    const endpoint =
      type === 'accounts' ? '/instagram-accounts' : type === 'automations' ? '/automations' : '/leads';
    const res = await fetchWithAuth(`${API}${endpoint}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    setDeletingId(null);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || 'Delete failed');
      return;
    }
    if (type === 'accounts') loadAccounts();
    else if (type === 'automations') loadAutomations();
    else loadLeads();
  };

  const filter = <T,>(arr: T[], keys: string[]): T[] => {
    if (!search.trim()) return arr;
    const s = search.toLowerCase();
    return arr.filter((row) =>
      keys.some((k) => String((row as Record<string, unknown>)[k] ?? '').toLowerCase().includes(s))
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-8 text-center">
        <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-red-800 dark:text-red-200">Admin access required</h2>
        <p className="text-red-600 dark:text-red-300 mt-2">You don’t have permission to view this page.</p>
      </div>
    );
  }

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'accounts', label: 'Instagram Accounts', icon: Instagram },
    { id: 'automations', label: 'Automations', icon: MessageSquare },
    { id: 'leads', label: 'Leads', icon: UserPlus },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'message_logs', label: 'Message logs', icon: Mail },
  ];

  const filteredProfiles = filter(profiles, ['email', 'full_name', 'subscription_tier']);
  const filteredAccounts = filter(accounts, ['account_name', 'instagram_business_id', 'page_id']);
  const filteredAutomations = filter(automations, ['name', 'trigger_type']);
  const filteredLeads = filter(leads, ['username', 'full_name', 'email']);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="w-8 h-8 text-amber-500" />
            Admin Panel
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">View and manage everything: overview, users, accounts, automations, leads, analytics, and message logs.</p>
        </div>
      </div>

      {loadError && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 flex items-center justify-between gap-4">
          <p className="text-amber-800 dark:text-amber-200 text-sm">{loadError}</p>
          <button
            type="button"
            onClick={retryLoad}
            className="shrink-0 px-4 py-2 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${
              tab === id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </div>

      {['users', 'accounts', 'automations', 'leads'].includes(tab) && (
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 max-w-xs rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      )}

      {/* Overview */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Dashboard</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'Users', value: stats?.profiles ?? profiles.length, icon: Users, color: 'bg-blue-500' },
              { label: 'Instagram accounts', value: stats?.instagram_accounts ?? accounts.length, icon: Instagram, color: 'bg-pink-500' },
              { label: 'Automations', value: stats?.automations ?? automations.length, icon: MessageSquare, color: 'bg-green-500' },
              { label: 'Leads', value: stats?.leads ?? leads.length, icon: UserPlus, color: 'bg-amber-500' },
              { label: 'Analytics events', value: stats?.analytics_events ?? analyticsList.length, icon: BarChart3, color: 'bg-purple-500' },
              { label: 'Message logs', value: stats?.message_logs ?? messageLogsList.length, icon: Mail, color: 'bg-cyan-500' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div
                key={label}
                className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm"
              >
                <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center text-white mb-3`}>
                  <Icon size={20} />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Quick links</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Use the tabs above to view and edit users, Instagram accounts, automations, leads, analytics events, and message logs.
            </p>
          </div>
        </div>
      )}

      {/* Users table */}
      {tab === 'users' && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Tier</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Admin</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3 font-semibold w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredProfiles.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 font-medium">{row.email}</td>
                    <td className="px-4 py-3">{row.full_name ?? '—'}</td>
                    <td className="px-4 py-3">{row.subscription_tier}</td>
                    <td className="px-4 py-3">{row.subscription_status}</td>
                    <td className="px-4 py-3">{row.is_admin ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(row.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setEditModal({ type: 'users', row: row as unknown as Record<string, unknown> })}
                        className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600"
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredProfiles.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-500">No users found.</div>
          )}
        </div>
      )}

      {/* Instagram accounts table */}
      {tab === 'accounts' && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Account name</th>
                  <th className="px-4 py-3 font-semibold">Business ID</th>
                  <th className="px-4 py-3 font-semibold">User ID</th>
                  <th className="px-4 py-3 font-semibold">Active</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3 font-semibold w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAccounts.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 font-medium">{row.account_name ?? row.instagram_business_id}</td>
                    <td className="px-4 py-3 font-mono text-xs">{row.instagram_business_id}</td>
                    <td className="px-4 py-3 font-mono text-xs truncate max-w-[120px]">{row.user_id}</td>
                    <td className="px-4 py-3">{row.is_active ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(row.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 flex gap-1">
                      <button
                        type="button"
                        onClick={() => setEditModal({ type: 'accounts', row: row as unknown as Record<string, unknown> })}
                        className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600"
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete('accounts', row.id)}
                        disabled={deletingId === row.id}
                        className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 disabled:opacity-50"
                        title="Delete"
                      >
                        {deletingId === row.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredAccounts.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-500">No Instagram accounts found.</div>
          )}
        </div>
      )}

      {/* Automations table */}
      {tab === 'automations' && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Trigger</th>
                  <th className="px-4 py-3 font-semibold">User ID</th>
                  <th className="px-4 py-3 font-semibold">Active</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3 font-semibold w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAutomations.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 font-medium">{row.name}</td>
                    <td className="px-4 py-3">{row.trigger_type}</td>
                    <td className="px-4 py-3 font-mono text-xs truncate max-w-[120px]">{row.user_id}</td>
                    <td className="px-4 py-3">{row.is_active ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(row.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 flex gap-1">
                      <button
                        type="button"
                        onClick={() => setEditModal({ type: 'automations', row: row as unknown as Record<string, unknown> })}
                        className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600"
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete('automations', row.id)}
                        disabled={deletingId === row.id}
                        className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 disabled:opacity-50"
                        title="Delete"
                      >
                        {deletingId === row.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredAutomations.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-500">No automations found.</div>
          )}
        </div>
      )}

      {/* Leads table */}
      {tab === 'leads' && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Username / Name</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">User ID</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3 font-semibold w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredLeads.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 font-medium">{row.username || row.full_name || row.instagram_user_id}</td>
                    <td className="px-4 py-3">{row.email ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs truncate max-w-[120px]">{row.user_id}</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(row.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 flex gap-1">
                      <button
                        type="button"
                        onClick={() => setEditModal({ type: 'leads', row: row as unknown as Record<string, unknown> })}
                        className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600"
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete('leads', row.id)}
                        disabled={deletingId === row.id}
                        className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 disabled:opacity-50"
                        title="Delete"
                      >
                        {deletingId === row.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredLeads.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-500">No leads found.</div>
          )}
        </div>
      )}

      {/* Analytics table */}
      {tab === 'analytics' && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Event type</th>
                  <th className="px-4 py-3 font-semibold">User ID</th>
                  <th className="px-4 py-3 font-semibold">Account ID</th>
                  <th className="px-4 py-3 font-semibold">Automation ID</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {analyticsList.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 font-medium">{row.event_type}</td>
                    <td className="px-4 py-3 font-mono text-xs truncate max-w-[140px]">{row.user_id}</td>
                    <td className="px-4 py-3 font-mono text-xs truncate max-w-[140px]">{row.instagram_account_id}</td>
                    <td className="px-4 py-3 font-mono text-xs truncate max-w-[140px]">{row.automation_id ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(row.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {analyticsList.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-500">No analytics events yet.</div>
          )}
        </div>
      )}

      {/* Message logs table */}
      {tab === 'message_logs' && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Sender</th>
                  <th className="px-4 py-3 font-semibold">Receiver</th>
                  <th className="px-4 py-3 font-semibold">Message</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {messageLogsList.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3">{row.message_type}</td>
                    <td className="px-4 py-3">{row.status ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs truncate max-w-[100px]">{row.sender_id}</td>
                    <td className="px-4 py-3 font-mono text-xs truncate max-w-[100px]">{row.receiver_id}</td>
                    <td className="px-4 py-3 max-w-[200px] truncate text-gray-600 dark:text-gray-400" title={row.message_text ?? ''}>
                      {row.message_text ? (row.message_text.length > 60 ? row.message_text.slice(0, 60) + '…' : row.message_text) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{new Date(row.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {messageLogsList.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-500">No message logs yet.</div>
          )}
        </div>
      )}

      {/* Edit modal */}
      {editModal && (
        <EditModal
          type={editModal.type}
          row={editModal.row}
          onSave={(payload) => handleUpdate(editModal.type, String(editModal.row.id), payload)}
          onClose={() => setEditModal(null)}
          saving={saving}
        />
      )}
    </div>
  );
};

function EditModal({
  type,
  row,
  onSave,
  onClose,
  saving,
}: {
  type: TabId;
  row: Record<string, unknown>;
  onSave: (payload: Record<string, unknown>) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<Record<string, unknown>>(row);

  useEffect(() => {
    setForm(row);
  }, [row]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = form.id as string;
    if (type === 'users') {
      onSave({ id, full_name: form.full_name, subscription_tier: form.subscription_tier, subscription_status: form.subscription_status, is_admin: form.is_admin });
    } else if (type === 'accounts') {
      onSave({ id, account_name: form.account_name, is_active: form.is_active });
    } else if (type === 'automations') {
      onSave({ id, name: form.name, is_active: form.is_active });
    } else {
      onSave({ id, username: form.username, full_name: form.full_name, email: form.email, phone: form.phone, tags: form.tags });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Edit {type === 'users' ? 'User' : type === 'accounts' ? 'Account' : type === 'automations' ? 'Automation' : 'Lead'}</h3>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {type === 'users' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email (read-only)</label>
                <input type="text" value={String(form.email ?? '')} readOnly className="w-full rounded-lg border bg-gray-100 dark:bg-gray-700 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full name</label>
                <input
                  type="text"
                  value={String(form.full_name ?? '')}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subscription tier</label>
                <select
                  value={String(form.subscription_tier ?? 'free')}
                  onChange={(e) => setForm((f) => ({ ...f, subscription_tier: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                >
                  <option value="free">free</option>
                  <option value="premium">premium</option>
                  <option value="ultra_premium">ultra_premium</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subscription status</label>
                <select
                  value={String(form.subscription_status ?? 'inactive')}
                  onChange={(e) => setForm((f) => ({ ...f, subscription_status: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                >
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                  <option value="past_due">past_due</option>
                  <option value="canceled">canceled</option>
                </select>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(form.is_admin)}
                  onChange={(e) => setForm((f) => ({ ...f, is_admin: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <span className="text-sm font-medium">Admin</span>
              </label>
            </>
          )}
          {type === 'accounts' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account name</label>
                <input
                  type="text"
                  value={String(form.account_name ?? '')}
                  onChange={(e) => setForm((f) => ({ ...f, account_name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                />
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(form.is_active)}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <span className="text-sm font-medium">Active</span>
              </label>
            </>
          )}
          {type === 'automations' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  value={String(form.name ?? '')}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                />
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(form.is_active)}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <span className="text-sm font-medium">Active</span>
              </label>
            </>
          )}
          {type === 'leads' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
                <input
                  type="text"
                  value={String(form.username ?? '')}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full name</label>
                <input
                  type="text"
                  value={String(form.full_name ?? '')}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input
                  type="text"
                  value={String(form.email ?? '')}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                <input
                  type="text"
                  value={String(form.phone ?? '')}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                />
              </div>
            </>
          )}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : null}
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Admin;

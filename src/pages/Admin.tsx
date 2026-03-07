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
} from 'lucide-react';

const API = '/api/admin';

function getAuthHeaders(): HeadersInit {
  const token = (window as unknown as { __SUPABASE_TOKEN__?: string }).__SUPABASE_TOKEN__;
  if (token) return { Authorization: `Bearer ${token}` };
  return {};
}

async function getSessionToken(): Promise<string | null> {
  const { supabase } = await import('../api/supabase');
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

type TabId = 'users' | 'accounts' | 'automations' | 'leads';

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

export const Admin: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [tab, setTab] = useState<TabId>('users');
  const [search, setSearch] = useState('');

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [accounts, setAccounts] = useState<InstagramAccountRow[]>([]);
  const [automations, setAutomations] = useState<AutomationRow[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);

  const [editModal, setEditModal] = useState<{ type: TabId; row: Record<string, unknown> } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
    const token = await getSessionToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    const res = await fetch(url, { ...options, headers });
    return res;
  }, []);

  const checkAdmin = useCallback(async () => {
    const res = await fetchWithAuth(`${API}/me`);
    const data = await res.json().catch(() => ({}));
    if (!data.isAdmin) {
      setForbidden(true);
      setLoading(false);
      return false;
    }
    return true;
  }, [fetchWithAuth]);

  const loadProfiles = useCallback(async () => {
    const res = await fetchWithAuth(API + '/profiles');
    if (res.ok) {
      const data = await res.json();
      setProfiles(Array.isArray(data) ? data : []);
    }
  }, [fetchWithAuth]);

  const loadAccounts = useCallback(async () => {
    const res = await fetchWithAuth(API + '/instagram-accounts');
    if (res.ok) {
      const data = await res.json();
      setAccounts(Array.isArray(data) ? data : []);
    }
  }, [fetchWithAuth]);

  const loadAutomations = useCallback(async () => {
    const res = await fetchWithAuth(API + '/automations');
    if (res.ok) {
      const data = await res.json();
      setAutomations(Array.isArray(data) ? data : []);
    }
  }, [fetchWithAuth]);

  const loadLeads = useCallback(async () => {
    const res = await fetchWithAuth(API + '/leads');
    if (res.ok) {
      const data = await res.json();
      setLeads(Array.isArray(data) ? data : []);
    }
  }, [fetchWithAuth]);

  useEffect(() => {
    (async () => {
      const ok = await checkAdmin();
      if (!ok) return;
      await Promise.all([loadProfiles(), loadAccounts(), loadAutomations(), loadLeads()]);
      setLoading(false);
    })();
  }, [checkAdmin, loadProfiles, loadAccounts, loadAutomations, loadLeads]);

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

  const filter = (arr: { [key: string]: unknown }[], keys: string[]) => {
    if (!search.trim()) return arr;
    const s = search.toLowerCase();
    return arr.filter((row) => keys.some((k) => String(row[k] ?? '').toLowerCase().includes(s)));
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
    { id: 'users', label: 'Users', icon: Users },
    { id: 'accounts', label: 'Instagram Accounts', icon: Instagram },
    { id: 'automations', label: 'Automations', icon: MessageSquare },
    { id: 'leads', label: 'Leads', icon: UserPlus },
  ];

  const filteredProfiles = filter(profiles as unknown as { [key: string]: unknown }[], ['email', 'full_name', 'subscription_tier']);
  const filteredAccounts = filter(accounts as unknown as { [key: string]: unknown }[], ['account_name', 'instagram_business_id', 'page_id']);
  const filteredAutomations = filter(automations as unknown as { [key: string]: unknown }[], ['name', 'trigger_type']);
  const filteredLeads = filter(leads as unknown as { [key: string]: unknown }[], ['username', 'full_name', 'email']);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="w-8 h-8 text-amber-500" />
            Admin Panel
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">View and manage all users, accounts, automations, and leads.</p>
        </div>
      </div>

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

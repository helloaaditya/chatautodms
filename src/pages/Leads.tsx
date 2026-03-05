import React, { useState, useEffect } from 'react';
import { supabase } from '../api/supabase';
import { Users, MessageSquare, ChevronDown, ChevronRight, Instagram, Loader2 } from 'lucide-react';
import type { Lead, MessageLog } from '../types';

type LeadWithAccount = Lead & { account_name?: string };
type LeadWithMessages = LeadWithAccount & { messages: MessageLog[] };

export const Leads: React.FC = () => {
  const [leads, setLeads] = useState<LeadWithMessages[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: leadsRows, error: leadsErr } = await supabase
        .from('leads')
        .select('id, user_id, instagram_account_id, instagram_user_id, username, full_name, email, phone, tags, created_at, updated_at')
        .order('updated_at', { ascending: false });

      if (leadsErr || !leadsRows?.length) {
        setLeads([]);
        setLoading(false);
        return;
      }

      const accountIds = [...new Set(leadsRows.map((l) => l.instagram_account_id))];
      const { data: accounts } = await supabase
        .from('instagram_accounts')
        .select('id, account_name')
        .in('id', accountIds);
      const accountMap = new Map((accounts ?? []).map((a) => [a.id, a.account_name ?? 'Instagram']));

      const { data: messages } = await supabase
        .from('message_logs')
        .select('id, instagram_account_id, sender_id, receiver_id, message_text, message_type, status, source, created_at')
        .order('created_at', { ascending: true });

      const messagesByLead = new Map<string, MessageLog[]>();
      (messages ?? []).forEach((m) => {
        const contactId = m.message_type === 'incoming' ? m.sender_id : m.receiver_id;
        const key = `${m.instagram_account_id}:${contactId}`;
        if (!messagesByLead.has(key)) messagesByLead.set(key, []);
        messagesByLead.get(key)!.push(m as MessageLog);
      });

      setLeads(
        leadsRows.map((l) => ({
          ...l,
          tags: Array.isArray(l.tags) ? l.tags : [],
          account_name: accountMap.get(l.instagram_account_id),
          messages: messagesByLead.get(`${l.instagram_account_id}:${l.instagram_user_id}`) ?? [],
        })) as LeadWithMessages[]
      );
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Leads</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Contacts and conversations from comment-to-DM and messages. Account and message details are stored here.
        </p>
      </div>

      {leads.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No leads yet</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-sm mx-auto">
            When someone comments with your keyword and receives an auto-DM, they’ll appear here with the full conversation.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-8" />
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Contact</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Account</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Last activity</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Messages</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const lastMsg = lead.messages[lead.messages.length - 1];
                  const isExpanded = expandedId === lead.id;
                  return (
                    <React.Fragment key={lead.id}>
                      <tr
                        className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-800/30"
                      >
                        <td className="py-2 px-4">
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : lead.id)}
                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                          >
                            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                              {(lead.username || lead.instagram_user_id).slice(0, 1).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {lead.username || `@${lead.instagram_user_id.slice(0, 12)}…`}
                              </span>
                              {lead.instagram_user_id && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">ID: {lead.instagram_user_id}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                            <Instagram size={14} className="text-pink-500" />
                            {lead.account_name || 'Instagram'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
                          {lastMsg ? new Date(lastMsg.created_at).toLocaleString() : new Date(lead.updated_at ?? lead.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
                          {lead.messages.length} message{lead.messages.length !== 1 ? 's' : ''}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={5} className="bg-gray-50 dark:bg-gray-900/50 p-4">
                            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 max-h-80 overflow-y-auto space-y-3">
                              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                <MessageSquare size={16} /> Conversation
                              </h4>
                              {lead.messages.length === 0 ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400">No messages in this thread.</p>
                              ) : (
                                lead.messages.map((m) => (
                                  <div
                                    key={m.id}
                                    className={`flex ${m.message_type === 'outgoing' ? 'justify-end' : 'justify-start'}`}
                                  >
                                    <div
                                      className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                                        m.message_type === 'outgoing'
                                          ? 'bg-blue-600 text-white rounded-br-md'
                                          : 'bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-bl-md'
                                      }`}
                                    >
                                      <p className="whitespace-pre-wrap">{m.message_text || '—'}</p>
                                      <p className={`text-xs mt-1 ${m.message_type === 'outgoing' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                                        {m.message_type === 'incoming' ? 'Them' : 'You'} · {new Date(m.created_at).toLocaleString()}
                                        {m.source ? ` · ${m.source}` : ''}
                                      </p>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

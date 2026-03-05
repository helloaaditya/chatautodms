import React, { useState, useEffect } from 'react';
import { supabase } from '../api/supabase';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  ArrowUpRight,
  ArrowDownRight,
  MessageSquare,
  Users,
  MousePointer2,
  Calendar,
  Filter,
  Download,
  Loader2,
} from 'lucide-react';

const DAYS = 7;
const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getLastNDays(n: number): { date: string; label: string }[] {
  const out: { date: string; label: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    out.push({ date: dateStr, label: dayLabels[d.getDay()] });
  }
  return out;
}

export const Analytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(DAYS);
  const [totalMessages, setTotalMessages] = useState(0);
  const [totalLeads, setTotalLeads] = useState(0);
  const [activeAutomations, setActiveAutomations] = useState(0);
  const [chartData, setChartData] = useState<{ name: string; messages: number; leads: number; conversion: number }[]>([]);
  const [topAutomations, setTopAutomations] = useState<{ name: string; count: number }[]>([]);
  const [prevMessages, setPrevMessages] = useState<number | null>(null);
  const [prevLeads, setPrevLeads] = useState<number | null>(null);
  const [conversionPct, setConversionPct] = useState(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const userId = user.id;

      const now = new Date();
      const start = new Date(now);
      start.setDate(start.getDate() - range);
      const startStr = start.toISOString().slice(0, 10);
      const endStr = now.toISOString().slice(0, 10);

      const prevStart = new Date(start);
      prevStart.setDate(prevStart.getDate() - range);
      const prevStartStr = prevStart.toISOString().slice(0, 10);

      const [analyticsRes, leadsRes, automationsRes, analyticsPrevRes, leadsPrevRes] = await Promise.all([
        supabase.from('analytics').select('id, event_type, created_at, automation_id').eq('user_id', userId).eq('event_type', 'message_sent').gte('created_at', startStr).lte('created_at', endStr + 'T23:59:59.999Z'),
        supabase.from('leads').select('id, created_at').eq('user_id', userId),
        supabase.from('automations').select('id, name').eq('user_id', userId).eq('is_active', true),
        supabase.from('analytics').select('id').eq('user_id', userId).eq('event_type', 'message_sent').gte('created_at', prevStartStr).lt('created_at', startStr),
        supabase.from('leads').select('id').eq('user_id', userId).lt('created_at', startStr),
      ]);

      const messages = analyticsRes.data ?? [];
      const allLeads = leadsRes.data ?? [];
      const automations = automationsRes.data ?? [];

      const leadsInRange = allLeads.filter((l) => (l.created_at as string).slice(0, 10) >= startStr && (l.created_at as string).slice(0, 10) <= endStr).length;
      setTotalMessages(messages.length);
      setTotalLeads(allLeads.length);
      setActiveAutomations(automations.length);
      setPrevMessages(analyticsPrevRes.data?.length ?? null);
      setPrevLeads(leadsPrevRes.data?.length ?? null);

      const days = getLastNDays(range);
      const messagesByDay: Record<string, number> = {};
      const leadsByDay: Record<string, number> = {};
      days.forEach((d) => {
        messagesByDay[d.date] = 0;
        leadsByDay[d.date] = 0;
      });
      messages.forEach((a) => {
        const d = (a.created_at as string).slice(0, 10);
        if (messagesByDay[d] !== undefined) messagesByDay[d]++;
      });
      allLeads.forEach((l) => {
        const d = (l.created_at as string).slice(0, 10);
        if (leadsByDay[d] !== undefined && d >= startStr && d <= endStr) leadsByDay[d]++;
      });

      setChartData(
        days.map((d) => {
          const m = messagesByDay[d.date] ?? 0;
          const l = leadsByDay[d.date] ?? 0;
          return {
            name: d.label,
            messages: m,
            leads: l,
            conversion: m > 0 ? Math.round((l / m) * 1000) / 10 : 0,
          };
        })
      );

      const automationCounts: Record<string, number> = {};
      messages.forEach((a) => {
        const aid = a.automation_id ?? 'unknown';
        automationCounts[aid] = (automationCounts[aid] ?? 0) + 1;
      });
      const automationList = automations.map((a) => ({ id: a.id, name: a.name, count: automationCounts[a.id] ?? 0 }));
      automationList.sort((a, b) => b.count - a.count);
      setTopAutomations(automationList.slice(0, 5).map((a) => ({ name: a.name, count: a.count })));
      setConversionPct(messages.length > 0 ? Math.round((leadsInRange / messages.length) * 100) : 0);

      setLoading(false);
    };
    load();
  }, [range]);

  const pct = (curr: number, prev: number | null) => {
    if (prev == null || prev === 0) return curr > 0 ? '+' : null;
    const ch = ((curr - prev) / prev) * 100;
    return ch >= 0 ? `+${ch.toFixed(1)}%` : `${ch.toFixed(1)}%`;
  };
  const msgChange = pct(totalMessages, prevMessages);
  const leadsChange = pct(totalLeads, prevLeads);

  const statCards = [
    { name: 'Messages Sent', value: String(totalMessages), change: msgChange, icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { name: 'Total Leads', value: String(totalLeads), change: leadsChange, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    { name: 'Conversion', value: `${conversionPct}%`, change: null, icon: MousePointer2, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
    { name: 'Active Automations', value: String(activeAutomations), change: null, icon: Calendar, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Real-time performance metrics for your Instagram automations.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setRange(DAYS)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${range === DAYS ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50'}`}
          >
            <Filter size={16} />
            Last 7 Days
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
            <Download size={16} />
            Export Data
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div key={stat.name} className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm transition-transform hover:scale-[1.02]">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              {stat.change != null && (
                <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${stat.change.startsWith('+') ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'}`}>
                  {stat.change.startsWith('+') ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {stat.change}
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.name}</p>
              <h4 className="text-2xl font-bold mt-1 tracking-tight">{stat.value}</h4>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h4 className="text-xl font-bold">Engagement Trends</h4>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Messages</div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Leads</div>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" className="dark:stroke-gray-600" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                />
                <Line type="monotone" dataKey="messages" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, fill: '#3B82F6', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="leads" stroke="#A855F7" strokeWidth={3} dot={{ r: 4, fill: '#A855F7', strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <h4 className="text-xl font-bold mb-8">Top Automations</h4>
          {topAutomations.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No automation activity yet. Messages sent from your flows will appear here.</p>
          ) : (
            <div className="space-y-6">
              {topAutomations.map((a, i) => (
                <div key={a.name + i} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-bold truncate pr-2">{a.name}</span>
                    <span className="text-gray-500 shrink-0">{a.count} sent</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${Math.max(5, (a.count / (topAutomations[0]?.count || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

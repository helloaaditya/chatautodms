import React, { useState, useEffect } from 'react';
import { supabase } from '../api/supabase';
import { 
  BarChart, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  MessageSquare, 
  Users, 
  MousePointer2, 
  Calendar,
  Filter,
  Download
} from 'lucide-react';

const sampleData = [
  { name: 'Mon', messages: 450, leads: 24, conversion: 5.3 },
  { name: 'Tue', messages: 600, leads: 32, conversion: 5.3 },
  { name: 'Wed', messages: 300, leads: 18, conversion: 6.0 },
  { name: 'Thu', messages: 900, leads: 54, conversion: 6.0 },
  { name: 'Fri', messages: 750, leads: 42, conversion: 5.6 },
  { name: 'Sat', messages: 400, leads: 22, conversion: 5.5 },
  { name: 'Sun', messages: 550, leads: 28, conversion: 5.1 },
];

const statCards = [
  { name: 'Total Messages', value: '12,450', change: '+12.5%', icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  { name: 'Total Leads', value: '842', change: '+8.2%', icon: Users, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  { name: 'Conversion Rate', value: '6.8%', change: '+2.4%', icon: MousePointer2, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
  { name: 'Active Automations', value: '24', change: '+4', icon: Calendar, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
];

export const Analytics: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Real-time performance metrics for your Instagram automations.</p>
        </div>
        <div className="flex gap-2">
           <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
             <Filter size={16} />
             Last 7 Days
           </button>
           <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/20 transition-all">
             <Download size={16} />
             Export Data
           </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div key={stat.name} className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm transition-transform hover:scale-[1.02]">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${stat.change.startsWith('+') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                 {stat.change.startsWith('+') ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                 {stat.change}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.name}</p>
              <h4 className="text-2xl font-bold mt-1 tracking-tight">{stat.value}</h4>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Engagement Chart */}
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
              <LineChart data={sampleData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}}
                />
                <Line type="monotone" dataKey="messages" stroke="#3B82F6" strokeWidth={3} dot={{r: 4, fill: '#3B82F6', strokeWidth: 2}} activeDot={{r: 6}} />
                <Line type="monotone" dataKey="leads" stroke="#A855F7" strokeWidth={3} dot={{r: 4, fill: '#A855F7', strokeWidth: 2}} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Conversion Chart */}
        <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm">
           <h4 className="text-xl font-bold mb-8">Top Keywords</h4>
           <div className="space-y-6">
             {[
               { name: 'PROMO', count: 450, color: 'bg-blue-500' },
               { name: 'JOIN', count: 320, color: 'bg-purple-500' },
               { name: 'PRICE', count: 280, color: 'bg-pink-500' },
               { name: 'DISCOUNT', count: 210, color: 'bg-green-500' },
               { name: 'FREE', count: 180, color: 'bg-orange-500' },
             ].map((keyword) => (
               <div key={keyword.name} className="space-y-2">
                 <div className="flex justify-between text-sm">
                   <span className="font-bold">{keyword.name}</span>
                   <span className="text-gray-500">{keyword.count} uses</span>
                 </div>
                 <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className={`h-full ${keyword.color}`} style={{ width: `${(keyword.count/450)*100}%` }} />
                 </div>
               </div>
             ))}
           </div>
           <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
             <button className="w-full py-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 text-gray-700 dark:text-gray-200 font-bold rounded-2xl transition-colors">
               View All Keywords
             </button>
           </div>
        </div>
      </div>
    </div>
  );
};

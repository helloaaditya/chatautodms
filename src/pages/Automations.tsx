import React, { useState, useEffect } from 'react';
import { supabase } from '../api/supabase';
import { 
  MessageSquare, 
  Plus, 
  Search, 
  ToggleLeft as Toggle, 
  Trash2, 
  Copy, 
  Edit3, 
  MoreHorizontal,
  Mail,
  MessageCircle,
  Hash,
  ArrowRight
} from 'lucide-react';
import { Automation } from '../types';

export const Automations: React.FC = () => {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAutomations = async () => {
    const { data, error } = await supabase
      .from('automations')
      .select('*, flows(*)')
      .order('created_at', { ascending: false });
    
    if (data) setAutomations(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchAutomations();
  }, []);

  const triggerIcons = {
    dm: { icon: MessageCircle, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    comment: { icon: Hash, color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-900/20' },
    mention: { icon: Mail, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    first_interaction: { icon: MessageSquare, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl text-white">
              <MessageSquare size={24} />
            </div>
            Automations
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage and track your active automation rules.</p>
        </div>
        <button 
          className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/20 transition-all hover:translate-y-[-2px] active:scale-95"
        >
          <Plus size={20} />
          <span>New Automation</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search automations..." 
            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select className="px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none shadow-sm focus:ring-2 focus:ring-blue-500/50">
          <option>All Triggers</option>
          <option>Direct Messages</option>
          <option>Comments</option>
          <option>Mentions</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
             <div key={i} className="h-24 bg-white dark:bg-gray-800 animate-pulse rounded-2xl border border-gray-200 dark:border-gray-700" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {automations.map((automation) => {
            const trigger = triggerIcons[automation.trigger_type as keyof typeof triggerIcons] || triggerIcons.dm;
            return (
              <div 
                key={automation.id} 
                className="group bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-blue-500/30 transition-all duration-300"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${trigger.bg} ${trigger.color}`}>
                    <trigger.icon size={24} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h4 className="font-bold text-lg truncate">{automation.name}</h4>
                      {automation.is_active ? (
                        <span className="flex items-center gap-1.5 px-2 py-0.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-xs font-semibold">
                          Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-lg text-xs font-semibold">
                          Draft
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                       <span className="flex items-center gap-1 capitalize">
                         <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                         {automation.trigger_type} trigger
                       </span>
                       <span className="flex items-center gap-1.5">
                         <Hash size={14} className="text-gray-400" />
                         {automation.trigger_keywords.length > 0 ? automation.trigger_keywords.join(', ') : 'No keywords'}
                       </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors">
                      <Edit3 size={18} />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                      <Copy size={18} />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                      <Trash2 size={18} />
                    </button>
                    <div className="w-px h-8 bg-gray-100 dark:bg-gray-700 mx-2" />
                    <button className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all flex items-center gap-2 group/btn">
                      Build Flow
                      <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

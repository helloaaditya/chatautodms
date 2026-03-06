import React, { useState, useEffect } from 'react';
import { supabase } from '../api/supabase';
import { Link } from 'react-router-dom';
import {
  User,
  Mail,
  CreditCard,
  Shield,
  Loader2,
  Check,
  Sparkles,
} from 'lucide-react';

type SubscriptionTier = 'free' | 'premium' | 'ultra_premium';

const TIER_LABELS: Record<string, string> = {
  free: 'Free',
  premium: 'Premium',
  ultra_premium: 'Ultra Premium',
};

export const Settings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ email?: string; full_name?: string; subscription_tier?: string; subscription_status?: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data: p } = await supabase.from('profiles').select('email, full_name, subscription_tier, subscription_status').eq('id', user.id).single();
      setProfile(p ?? { email: user.email ?? '', full_name: user.user_metadata?.full_name, subscription_tier: 'free', subscription_status: 'inactive' });
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const tier = (profile?.subscription_tier ?? 'free') as SubscriptionTier;
  const isPremium = tier === 'premium' || tier === 'ultra_premium';
  const isUltra = tier === 'ultra_premium';

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-xl">
            <Shield size={24} className="text-gray-600 dark:text-gray-300" />
          </div>
          Settings
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Account and subscription.</p>
      </div>

      {/* Profile */}
      <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <h3 className="font-semibold text-lg flex items-center gap-2 text-gray-900 dark:text-white">
          <User size={20} />
          Profile
        </h3>
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3">
            <Mail className="text-gray-400" size={18} />
            <span className="text-gray-700 dark:text-gray-300">{profile?.email ?? '—'}</span>
          </div>
          <div className="flex items-center gap-3">
            <User className="text-gray-400" size={18} />
            <span className="text-gray-700 dark:text-gray-300">{profile?.full_name || '—'}</span>
          </div>
        </div>
      </section>

      {/* Subscription summary */}
      <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <h3 className="font-semibold text-lg flex items-center gap-2 text-gray-900 dark:text-white">
          <CreditCard size={20} />
          Subscription
        </h3>
        <div className="mt-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
              tier === 'ultra_premium' ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' :
              tier === 'premium' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
              'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
            }`}>
              {TIER_LABELS[tier] ?? tier}
            </span>
            {profile?.subscription_status === 'active' && (
              <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <Check size={14} /> Active
              </span>
            )}
          </div>
          <Link
            to="/billing"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition-colors"
          >
            <CreditCard size={16} />
            Manage billing
          </Link>
        </div>
        <ul className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <li className="flex items-center gap-2"><Check size={16} className="text-green-500 shrink-0" /> Comment & DM automations</li>
          {isPremium && <li className="flex items-center gap-2"><Check size={16} className="text-green-500 shrink-0" /> Follow CTA & premium features</li>}
          {isUltra && <li className="flex items-center gap-2"><Sparkles size={16} className="text-violet-500 shrink-0" /> 1:1 setup included</li>}
        </ul>
      </section>
    </div>
  );
};

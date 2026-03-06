import React, { useState, useEffect } from 'react';
import { supabase } from '../api/supabase';
import {
  CreditCard,
  Check,
  Loader2,
  Zap,
  Crown,
  Sparkles,
} from 'lucide-react';
import { SUBSCRIPTION_TIERS, normalizeTier, type SubscriptionTier } from '../lib/subscription';

const PLANS = [
  {
    id: 'free' as const,
    name: 'Free',
    icon: Zap,
    price: '₹0',
    period: 'forever',
    description: 'Comment & DM automations',
    features: [
      'Comment-to-DM flows',
      'Direct message automations',
      '1 Instagram account',
      'Basic analytics',
    ],
    cta: 'Current plan',
    highlighted: false,
  },
  {
    id: 'premium' as const,
    name: 'Premium',
    icon: Crown,
    price: '₹999',
    period: '/month',
    description: 'Follow CTA & premium features',
    features: [
      'Everything in Free',
      'Follow CTA (Visit profile + I\'m following)',
      'Premium automation features',
      'Priority support',
    ],
    cta: 'Upgrade to Premium',
    highlighted: true,
  },
  {
    id: 'ultra_premium' as const,
    name: 'Ultra Premium',
    icon: Sparkles,
    price: '₹999',
    period: '/month',
    setupPrice: '₹599 one-time setup',
    description: '1:1 setup + everything in Premium',
    features: [
      'Everything in Premium',
      '1:1 onboarding & setup call',
      'Dedicated support',
      'Custom workflow help',
    ],
    cta: 'Upgrade to Ultra',
    highlighted: true,
  },
];

export const Billing: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>('free');
  const [upgradingId, setUpgradingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data: p } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
      const tier = normalizeTier(p?.subscription_tier);
      setCurrentTier(tier);
      setLoading(false);
    };
    load();
  }, []);

  const handleUpgrade = async (planId: SubscriptionTier) => {
    if (!SUBSCRIPTION_TIERS.includes(planId) || planId === currentTier || planId === 'free') return;
    setUpgradingId(planId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase
        .from('profiles')
        .update({
          subscription_tier: planId,
          subscription_status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      if (!error) setCurrentTier(planId);
      // In production: redirect to Stripe/payment gateway here instead of direct DB update
    } finally {
      setUpgradingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold tracking-tight flex items-center justify-center gap-3">
          <CreditCard size={28} className="text-blue-600" />
          Billing & plans
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Free includes Comment & DM. Upgrade for Follow CTA, premium features, or 1:1 setup.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const isCurrent = currentTier === plan.id;
          const isUpgrade = (plan.id === 'premium' || plan.id === 'ultra_premium') && currentTier !== plan.id;

          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border-2 p-6 flex flex-col ${
                plan.highlighted
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10 dark:border-blue-400'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              }`}
            >
              {isCurrent && (
                <div className="absolute top-4 right-4">
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-xs font-medium">
                    Current
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 mb-4">
                <div className={`p-2 rounded-xl ${plan.highlighted ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                  <Icon size={22} className={plan.highlighted ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'} />
                </div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">{plan.name}</h3>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{plan.description}</p>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{plan.price}</span>
                <span className="text-gray-500 dark:text-gray-400 text-sm">{plan.period}</span>
              </div>
              {plan.setupPrice && (
                <p className="text-sm text-amber-600 dark:text-amber-400 mb-4">+ {plan.setupPrice}</p>
              )}
              <ul className="space-y-2 flex-1 mb-6">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <Check size={16} className="text-green-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleUpgrade(plan.id)}
                disabled={isCurrent || !!upgradingId}
                className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                  isCurrent
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 cursor-default'
                    : plan.highlighted
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white'
                }`}
              >
                {upgradingId === plan.id ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : isCurrent ? (
                  plan.cta
                ) : (
                  plan.cta
                )}
              </button>
            </div>
          );
        })}
      </div>

      <div className="text-center space-y-2">
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
          Premium: ₹999/month. Ultra Premium: ₹999/month + ₹599 one-time setup (includes 1:1 onboarding).
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Payment gateway can be connected for production; upgrades above update your plan for testing.
        </p>
      </div>
    </div>
  );
};

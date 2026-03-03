import React from 'react';
import { X, MessageSquare, Image, HelpCircle, Send } from 'lucide-react';

export type TemplateId = 'comment_to_dm' | 'story_reply' | 'ice_breakers' | 'dm_auto_responder';

export const TEMPLATES: Array<{
  id: TemplateId;
  title: string;
  description: string;
  features: string[];
  icon: React.ComponentType<{ size?: number; className?: string }>;
}> = [
  {
    id: 'comment_to_dm',
    title: 'Comment to DM Flow',
    description: 'Automatically reply to comments and send personalized DMs with interactive buttons.',
    features: ['Auto-reply to comments', 'Send DM with buttons', 'Keyword triggers', 'Link delivery on click'],
    icon: MessageSquare,
  },
  {
    id: 'story_reply',
    title: 'Story Reply Flow',
    description: 'Respond to story replies instantly and convert viewers into customers with automated DMs.',
    features: ['Story reply triggers', 'Instant DM responses', 'Interactive buttons', 'Link delivery system'],
    icon: Image,
  },
  {
    id: 'ice_breakers',
    title: 'Ice Breakers',
    description: 'Help users start conversations with pre-set frequently asked questions.',
    features: ['Up to 4 custom questions', 'Quick conversation starters', 'Mobile-only feature', 'Automated responses'],
    icon: HelpCircle,
  },
  {
    id: 'dm_auto_responder',
    title: 'DM Auto Responder',
    description: 'Automatically reply to direct messages with personalized responses and call-to-action buttons.',
    features: ['Auto-reply to DMs', 'Keyword-based triggers', 'Personalized DM replies', 'Interactive buttons & link delivery'],
    icon: Send,
  },
];

interface TemplatesModalProps {
  open: boolean;
  onClose: () => void;
  onSelectTemplate?: (templateId: TemplateId) => void;
}

export const TemplatesModal: React.FC<TemplatesModalProps> = ({ open, onClose, onSelectTemplate }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700">
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-t-2xl z-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Templates</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>
        <div className="p-6 grid gap-4 sm:grid-cols-2">
          {TEMPLATES.map((template) => {
            const Icon = template.icon;
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => {
                  onSelectTemplate?.(template.id);
                  onClose();
                }}
                className="text-left p-5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 hover:border-blue-500/50 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all shadow-sm hover:shadow-md group"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                    <Icon size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900 dark:text-white">{template.title}</h3>
                      <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded">⚡ quick</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{template.description}</p>
                    <ul className="mt-3 space-y-1.5">
                      {template.features.map((feature, i) => (
                        <li key={i} className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                          <span className="w-1 h-1 rounded-full bg-blue-400" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

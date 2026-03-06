import type { SubscriptionTier } from '../lib/subscription';
export type { SubscriptionTier };

export type Profile = {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  subscription_tier: SubscriptionTier;
  subscription_status: 'active' | 'inactive' | 'past_due' | 'canceled';
  stripe_customer_id?: string;
  created_at: string;
};

export type InstagramAccount = {
  id: string;
  user_id: string;
  instagram_business_id: string;
  page_id: string;
  account_name: string;
  profile_picture?: string;
  is_active: boolean;
  token_expiry: string;
  created_at: string;
};

export type Automation = {
  id: string;
  user_id: string;
  instagram_account_id: string;
  name: string;
  trigger_type: 'dm' | 'comment' | 'mention' | 'first_interaction';
  trigger_keywords: string[];
  is_active: boolean;
  created_at: string;
  flows?: Flow[];
};

export type FlowNode = {
  id: string;
  type: 'start' | 'message' | 'question' | 'delay' | 'lead_capture' | 'comment_reply' | 'condition';
  data: any;
  position: { x: number; y: number };
};

export type FlowEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
};

export type Flow = {
  id: string;
  automation_id: string;
  user_id: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  created_at: string;
};

export type Lead = {
  id: string;
  user_id: string;
  instagram_account_id: string;
  instagram_user_id: string;
  username?: string | null;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  profile_picture?: string | null;
  tags: string[];
  created_at: string;
  updated_at?: string;
  account_name?: string;
};

export type MessageLog = {
  id: string;
  user_id: string;
  instagram_account_id: string;
  automation_id?: string | null;
  sender_id: string;
  receiver_id: string;
  message_text: string | null;
  message_type: 'incoming' | 'outgoing';
  status: string | null;
  source?: string | null;
  created_at: string;
}

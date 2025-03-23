export interface Plan {
  id: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  recommended?: boolean;
  stripe_id?: string;
}

export interface SubscriptionProps {
  id?: string;
  business_id?: string;
  plan?: string;
  status?: "trialing" | "active" | "canceled" | "past_due";
  start_date?: string;
  end_date?: string | null;
  trial_end_date?: string | null;
  stripe_subscription_id?: string | null;
  created_at?: string;
  updated_at?: string;
  email?: string;
}

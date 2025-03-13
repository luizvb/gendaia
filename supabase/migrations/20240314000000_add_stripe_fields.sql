-- Add Stripe fields to businesses table
ALTER TABLE businesses
ADD COLUMN stripe_customer_id text;

-- Add Stripe fields to subscriptions table
ALTER TABLE subscriptions
ADD COLUMN stripe_subscription_id text,
ADD COLUMN stripe_customer_id text,
ADD COLUMN trial_end_date timestamptz,
ADD COLUMN updated_at timestamptz DEFAULT now();

-- Add indexes for Stripe fields
CREATE INDEX idx_businesses_stripe_customer_id ON businesses(stripe_customer_id);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id); 
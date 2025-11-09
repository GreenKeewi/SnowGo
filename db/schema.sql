-- SnowGo Database Schema
-- PostgreSQL database schema for Milton, ON snow-shoveling marketplace

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table: unified for homeowner, shoveler, and admin
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id text UNIQUE NOT NULL,
  email text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('homeowner','shoveler','admin')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_users_clerk_id ON users(clerk_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Shovelers profile
CREATE TABLE shovelers (
  id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name text,
  phone text,
  bio text,
  max_houses integer DEFAULT 5,
  active boolean DEFAULT true,
  stripe_account_id text,
  onboarding_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_shovelers_active ON shovelers(active);
CREATE INDEX idx_shovelers_stripe_account ON shovelers(stripe_account_id);

-- Homeowners addresses
CREATE TABLE addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  label text,
  line1 text NOT NULL,
  line2 text,
  city text NOT NULL,
  province text DEFAULT 'ON',
  postal_code text NOT NULL,
  lat double precision,
  lon double precision,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_addresses_user_id ON addresses(user_id);
CREATE INDEX idx_addresses_location ON addresses(lat, lon);
CREATE INDEX idx_addresses_postal_code ON addresses(postal_code);

-- Jobs
CREATE TABLE jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_id uuid REFERENCES users(id) ON DELETE CASCADE,
  address_id uuid REFERENCES addresses(id) ON DELETE CASCADE,
  shoveler_id uuid REFERENCES users(id) ON DELETE SET NULL,
  scheduled_at timestamptz NOT NULL,
  type text NOT NULL CHECK (type IN ('one_time','subscription_occurrence')),
  status text NOT NULL CHECK (status IN ('open','claimed','in_progress','completed','cancelled')),
  price_cents integer NOT NULL,
  platform_fee_cents integer NOT NULL,
  payout_cents integer NOT NULL,
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  claimed_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_jobs_homeowner_id ON jobs(homeowner_id);
CREATE INDEX idx_jobs_shoveler_id ON jobs(shoveler_id);
CREATE INDEX idx_jobs_address_id ON jobs(address_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_type ON jobs(type);
CREATE INDEX idx_jobs_scheduled_at ON jobs(scheduled_at);
CREATE INDEX idx_jobs_stripe_payment_intent ON jobs(stripe_payment_intent_id);

-- Subscriptions (Stripe)
CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_id uuid REFERENCES users(id) ON DELETE CASCADE,
  address_id uuid REFERENCES addresses(id) ON DELETE CASCADE,
  stripe_subscription_id text UNIQUE NOT NULL,
  stripe_customer_id text,
  plan_id text NOT NULL,
  frequency text NOT NULL CHECK (frequency IN ('weekly','biweekly','monthly')),
  price_cents integer NOT NULL,
  active boolean DEFAULT true,
  cancelled_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_subscriptions_homeowner_id ON subscriptions(homeowner_id);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_active ON subscriptions(active);

-- Admin settings
CREATE TABLE admin_settings (
  id integer PRIMARY KEY DEFAULT 1,
  platform_fee_cents integer DEFAULT 500,
  default_max_houses_per_shoveler integer DEFAULT 5,
  allowed_city text DEFAULT 'Milton',
  payout_schedule text DEFAULT 'weekly',
  base_one_time_price_cents integer DEFAULT 4000,
  weekly_subscription_price_cents integer DEFAULT 15000,
  biweekly_subscription_price_cents integer DEFAULT 25000,
  monthly_subscription_price_cents integer DEFAULT 40000,
  max_search_radius_km integer DEFAULT 50,
  milton_postal_code_prefixes text DEFAULT 'L9T,L9E,L0P',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Insert default admin settings
INSERT INTO admin_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Payouts tracking
CREATE TABLE payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shoveler_id uuid REFERENCES users(id) ON DELETE CASCADE,
  job_id uuid REFERENCES jobs(id) ON DELETE SET NULL,
  amount_cents integer NOT NULL,
  stripe_transfer_id text,
  status text NOT NULL CHECK (status IN ('pending','processing','completed','failed')),
  failure_reason text,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_payouts_shoveler_id ON payouts(shoveler_id);
CREATE INDEX idx_payouts_job_id ON payouts(job_id);
CREATE INDEX idx_payouts_status ON payouts(status);
CREATE INDEX idx_payouts_stripe_transfer_id ON payouts(stripe_transfer_id);

-- Audit log for admin actions
CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shovelers_updated_at BEFORE UPDATE ON shovelers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_addresses_updated_at BEFORE UPDATE ON addresses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_settings_updated_at BEFORE UPDATE ON admin_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payouts_updated_at BEFORE UPDATE ON payouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

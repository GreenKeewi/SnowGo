// Database types matching schema

export type UserRole = 'homeowner' | 'shoveler' | 'admin';

export interface User {
  id: string;
  clerk_id: string;
  email: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}

export interface Shoveler {
  id: string;
  display_name: string | null;
  phone: string | null;
  bio: string | null;
  max_houses: number;
  active: boolean;
  stripe_account_id: string | null;
  onboarding_completed: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Address {
  id: string;
  user_id: string;
  label: string | null;
  line1: string;
  line2: string | null;
  city: string;
  province: string;
  postal_code: string;
  lat: number | null;
  lon: number | null;
  created_at: Date;
  updated_at: Date;
}

export type JobType = 'one_time' | 'subscription_occurrence';
export type JobStatus = 'open' | 'claimed' | 'in_progress' | 'completed' | 'cancelled';

export interface Job {
  id: string;
  homeowner_id: string;
  address_id: string;
  shoveler_id: string | null;
  scheduled_at: Date;
  type: JobType;
  status: JobStatus;
  price_cents: number;
  platform_fee_cents: number;
  payout_cents: number;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  claimed_at: Date | null;
  started_at: Date | null;
  completed_at: Date | null;
  cancelled_at: Date | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export type SubscriptionFrequency = 'weekly' | 'biweekly' | 'monthly';

export interface Subscription {
  id: string;
  homeowner_id: string;
  address_id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string | null;
  plan_id: string;
  frequency: SubscriptionFrequency;
  price_cents: number;
  active: boolean;
  cancelled_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface AdminSettings {
  id: number;
  platform_fee_cents: number;
  default_max_houses_per_shoveler: number;
  allowed_city: string;
  payout_schedule: string;
  base_one_time_price_cents: number;
  weekly_subscription_price_cents: number;
  biweekly_subscription_price_cents: number;
  monthly_subscription_price_cents: number;
  max_search_radius_km: number;
  milton_postal_code_prefixes: string;
  created_at: Date;
  updated_at: Date;
}

export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Payout {
  id: string;
  shoveler_id: string;
  job_id: string | null;
  amount_cents: number;
  stripe_transfer_id: string | null;
  status: PayoutStatus;
  failure_reason: string | null;
  processed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, any> | null;
  created_at: Date;
}

// API Request/Response types

export interface CreateAddressRequest {
  label?: string;
  line1: string;
  line2?: string;
  city: string;
  postal_code: string;
}

export interface BookOneTimeRequest {
  address_id: string;
  scheduled_at: string;
}

export interface CreateSubscriptionRequest {
  address_id: string;
  frequency: SubscriptionFrequency;
}

export interface ClaimJobRequest {
  shoveler_lat?: number;
  shoveler_lon?: number;
}

export interface UpdateAdminSettingsRequest {
  platform_fee_cents?: number;
  default_max_houses_per_shoveler?: number;
  base_one_time_price_cents?: number;
  weekly_subscription_price_cents?: number;
  biweekly_subscription_price_cents?: number;
  monthly_subscription_price_cents?: number;
  max_search_radius_km?: number;
}

export interface JobWithDistance extends Job {
  distance_km?: number;
  address?: Address;
}

export interface ShovelerProfile extends Shoveler {
  total_completed_jobs: number;
  total_earnings_cents: number;
  pending_balance_cents: number;
  active_houses_count: number;
}

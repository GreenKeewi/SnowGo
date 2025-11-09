You are an expert full-stack engineer and product architect. Build a fully functional MVP for a Milton, Ontario–only snow-shoveling marketplace (web app) where homeowners can book one-time cleans or subscribe for recurring shoveling, shovelers sign up to accept jobs from an open list (ordered by proximity), payments flow through the site, and the platform takes a fixed $5 fee per job. Use Next.js + React for the front end, Node/TypeScript for server logic (Next API routes or a small Express service), Postgres for the database, Clerk for auth, and Stripe (Stripe Connect) for payments/payouts. The admin (you) must have a single secured admin screen accessible only with your email that can configure all pricing and limits (including the configurable maximum number of client houses a shoveler may accept). Keep the scope strictly MVP: Milton, ON only, shovelers pick from an open list, auto-approve new shovelers, and homeowners pay via the site.

Deliverable format: a single, actionable implementation PRP that includes system overview, data model, API surface, key frontend pages & UI behavior, Stripe + Clerk integration steps, webhooks, admin features, security notes, testing checklist, and deployment checklist. Include exact environment variable names, webhook events to handle, and brief sample SQL/schema. Note any assumptions.

ASSUMPTIONS (made for clarity):
• “No more than a certain amount of houses allowed to pay for their house” is implemented as a configurable limit on how many active paid client houses a single shoveler can have (admin-configurable).
• Location-based ordering will use homeowner lat/lon and Haversine distance on server (admin can add a Google Maps or Mapbox API later).
• Payout schedule: weekly (configurable in admin), using Stripe Connect Express accounts.

System overview & goals

Platform actors:

Homeowner — signs up, adds address(es), can purchase one-time shoveling jobs or a recurring subscription; pays via Stripe through the platform; views job history and receipts.

Shoveler — signs up, creates a profile (availability, max houses accepted), is auto-approved, sees an open jobs list sorted nearest → farthest, claims jobs, marks jobs complete; receives payouts via Stripe Connect.

Admin (you) — login restricted to one email address (Clerk guard), configures prices, platform fee, service area, per-shoveler max houses, payout schedule; views transactions & basic analytics.

Business logic highlights:

Platform takes $5 fixed fee per completed job (deducted at payment time or via split on payout).

Homeowners pay at booking. For subscriptions, charge recurring via Stripe Subscriptions.

Shovelers are paid their share via Stripe Connect transfers (gross minus platform fee).

Jobs are Milton, ON only. Address validation should enforce Milton postal codes initially.

Tech stack & key services

Frontend: Next.js 14+ (App Router) + React + Tailwind (or your preferred UI). Use Clerk React SDK for auth UI.

Backend: Next.js API routes in TypeScript or a small Node/Express service for complex background tasks.

DB: Postgres (hosted: Supabase / Railway / Neon).

Auth: Clerk (email/password + magic link). Admin account enforced by matching email to ADMIN_EMAIL env var.

Payments & Payouts: Stripe with Connect (Express accounts recommended for MVP). Use Stripe Checkout for hosted flow or Payment Intents for custom flow.

Geo: store lat/lon; compute distance server-side (Haversine). Optionally use Google Maps / Mapbox for geocoding addresses.

Hosting: Vercel for Next frontend, Railway/Heroku for server if separate.

Background tasks: use a lightweight worker (e.g., serverless functions / cron via GitHub Actions for payouts/cleanup) or a job queue like Bull with Redis if required later.

Data model (simplified SQL schema)

Provide sample columns; add indexes on location and common queries.

-- users: unified for homeowner or shoveler
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id text UNIQUE NOT NULL, -- Clerk user id
  email text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('homeowner','shoveler','admin')),
  created_at timestamptz DEFAULT now()
);

-- shovelers profile
CREATE TABLE shovelers (
  id uuid PRIMARY KEY REFERENCES users(id),
  display_name text,
  phone text,
  bio text,
  max_houses integer DEFAULT 5, -- configurable default
  active boolean DEFAULT true,
  stripe_account_id text, -- Stripe Connect account
  created_at timestamptz DEFAULT now()
);

-- homeowners addresses
CREATE TABLE addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  label text,
  line1 text,
  city text,
  postal_code text,
  lat double precision,
  lon double precision,
  created_at timestamptz DEFAULT now()
);

-- jobs
CREATE TABLE jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_id uuid REFERENCES users(id),
  address_id uuid REFERENCES addresses(id),
  shoveler_id uuid REFERENCES users(id) NULL, -- null until claimed
  scheduled_at timestamptz, -- when service is requested
  type text NOT NULL CHECK (type IN ('one_time','subscription_occurrence')),
  status text NOT NULL CHECK (status IN ('open','claimed','in_progress','completed','cancelled')),
  price_cents integer NOT NULL, -- total charged to homeowner in cents
  platform_fee_cents integer NOT NULL, -- set to 500 (i.e., $5) or admin override
  payout_cents integer NOT NULL, -- amount to be paid to shoveler
  stripe_payment_intent_id text,
  created_at timestamptz DEFAULT now()
);

-- subscriptions (stripe)
CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_id uuid REFERENCES users(id),
  stripe_subscription_id text UNIQUE,
  plan_id text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- admin settings
CREATE TABLE admin_settings (
  id integer PRIMARY KEY DEFAULT 1,
  platform_fee_cents integer DEFAULT 500,
  default_max_houses_per_shoveler integer DEFAULT 5,
  allowed_city text DEFAULT 'Milton',
  payout_schedule text DEFAULT 'weekly',
  created_at timestamptz DEFAULT now()
);

API surface (core endpoints & behavior)

Design these as Next.js API routes (/api/...) or REST endpoints. Use TypeScript types.

Auth (Clerk)

Clerk handles signup/signin. Your server validates Clerk session tokens for protected routes.

Admin guard: validate user.email === process.env.ADMIN_EMAIL.

Homeowner flows

GET /api/addresses — list addresses for homeowner.

POST /api/addresses — add address (server geocodes to lat/lon).

POST /api/book/one-time — create a one-time job:

Accepts address_id, scheduled_at.

Calculate price via admin pricing rules.

Create Stripe PaymentIntent or create Checkout session for payment.

Save job with status open after successful payment (or paid_open).

POST /api/subscribe — create Stripe Subscription for recurring service:

Create Stripe Customer (if not exists), create subscription, create subscription record.

Webhook will create job occurrences (see webhooks).

GET /api/jobs — homeowner job history and upcoming jobs.

Shoveler flows

GET /api/jobs/open?lat=&lon=&radius_km=&limit= — returns open jobs ordered by distance (server computes Haversine).

POST /api/jobs/:id/claim — claim an open job:

Server checks shoveler's current number of active houses (compare to max_houses) and returns 403 if over limit.

If allowed, set shoveler_id, status claimed, record claimed_at.

POST /api/jobs/:id/start — set in_progress.

POST /api/jobs/:id/complete — mark completed. Triggers payout flow or schedules payout to shoveler’s Stripe account.

GET /api/shoveler/profile — view earned balance, upcoming payouts.

Admin flows

GET /api/admin/settings & POST /api/admin/settings — editable only by admin email.

GET /api/admin/transactions — list platform revenue & payouts.

POST /api/admin/force-payout — manual payout trigger.

POST /api/admin/seed — option to restrict region (Milton) until scaled.

Stripe webhooks

POST /api/webhooks/stripe — handle:

checkout.session.completed — confirm payment, create job record / mark job paid.

invoice.payment_succeeded — subscription charged; create job occurrences for subscription period.

payment_intent.succeeded — confirm one-time payment.

transfer.failed/payout.paid — log payouts, retry logic.

Payment model & calculation

Pricing entities:

base_one_time_price_cents (admin setting)

per_subscription_plan (frequency, price_cents)

platform_fee_cents (default 500)

For any job:

price_cents = computed service price

platform_fee_cents = admin setting (default 500)

payout_cents = price_cents - platform_fee_cents (ensure non-negative; enforce min price)

Stripe flow (recommended):

Create a Stripe Checkout Session (or Payment Intent) with amount = price_cents.

Use Stripe Connect and create a PaymentIntent with application_fee_amount = platform_fee_cents and transfer_data[destination] = shoveler.stripe_account_id. That way Stripe holds platform fee and transfers remainder to connected account automatically (subject to timing).

For subscription charges, set up subscription with application_fee_amount via Connect (requires usage of Billing and Connect together; if complex, charge customer to platform and programmatically create transfer after funds settle).

For MVP, use Stripe Checkout + Connect for one-time. For subscriptions, use Stripe Subscriptions attached to platform customer and use webhooks to split revenue (or use Stripe’s subscription application_fee_percent if Connect supports).

Admin screen (must be accessible only to your email)

Login via Clerk. On client side, protect route '/admin' by verifying user email equals ADMIN_EMAIL.

Admin features:

Edit global pricing: base one-time price, subscription plans, platform_fee_cents.

Configure default/max houses per shoveler.

Toggle service area (Milton only toggle).

View transactions, revenue, and pending payouts table.

Force payouts, refund a job.

View and export CSV of jobs and user lists.

UI: simple form controls, guarded server calls. Store settings in admin_settings DB.

Matching & ordering logic

When homeowner pays for a job, job is inserted with status = open.

Open jobs endpoint returns jobs sorted by distance from shoveler (server receives shoveler lat/lon or compute using shoveler’s last known location).

Return only jobs within MAX_SEARCH_RADIUS_KM (admin configurable).

Claim endpoint must:

Confirm job still open.

Confirm shoveler’s current active unique houses < shoveler.max_houses (count unique homeowner/address combos currently claimed/in_progress for that shoveler).

Atomically set shoveler_id and status = claimed. Use DB transaction to avoid race conditions.

Security & fraud prevention

Validate Clerk session server-side for all protected routes.

Rate limit critical endpoints (job claim, payment endpoints).

Verify homeowner address is within Milton (postal code validation) before accepting payment.

Verify shoveler bank/identity during Stripe Connect onboarding (Express handles KYC).

Store sensitive keys in env vars; never push secrets to repo.

Env vars (examples):

DATABASE_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
ADMIN_EMAIL=youremail@example.com
DEFAULT_PLATFORM_FEE_CENTS=500
MAX_SEARCH_RADIUS_KM=50
MAPS_API_KEY= (optional)

Webhook & background tasks

Webhook endpoint /api/webhooks/stripe must verify signature using STRIPE_WEBHOOK_SECRET.

On invoice.payment_succeeded create job occurrences for the next billing period and charge automatically.

Background job: nightly job to:

Create jobs for recurring subscriptions for the next day/window.

Reconcile Stripe payouts and update jobs status.

Retry failed transfers.

Testing checklist (MVP)

Unit tests for distance calculation & job claiming race conditions.

Integration tests for Clerk-auth protected endpoints.

End-to-end payment flow using Stripe test keys and test cards.

Webhook testing with Stripe CLI to simulate events.

Acceptance tests:

Homeowner books & pays -> job appears in open list.

Shoveler claims -> job assigned -> completes -> payout scheduled.

Admin updates price -> future jobs pick new price.

Enforcement of max houses per shoveler.

Deployment checklist

Provision Postgres (Neon / Supabase / Railway) and run migrations.

Create Stripe account and enable Connect; set webhook endpoint (production URL).

Create Clerk app and configure redirect URIs.

Set ADMIN_EMAIL to your email.

Deploy Next.js app to Vercel; set env vars in Vercel dashboard.

Configure domain, SSL, and verify webhooks with Stripe CLI on staging before going live.

Verify Milton-only enforcement by testing postal code restrictions.

Monitoring & metrics (MVP)

Log job events (created/claimed/completed).

Track basic KPIs: number of active shovelers, completed jobs per week, gross volume, platform fee collected.

Set up Sentry for error reporting; use Stripe dashboard for payments.

Edge cases & notes

Refunds: allow admin to trigger refunds via Stripe and update job status to cancelled_refunded.

Disputes: store photos/evidence from shovelers when marking jobs completed to reduce disputes.

Scaling beyond Milton: admin UI must allow adding new cities and toggling geofencing.

Implementation timeline & milestones (MVP scoped)

Day 1–2: Project scaffolding (Next.js, Clerk, DB schema, basic auth).

Day 3–5: Address creation, geocoding, one-time booking flow + Stripe Checkout.

Day 6–8: Open jobs list, distance sorting, job claim/complete flows.

Day 9–10: Admin screen, pricing config, settings.

Day 11–12: Stripe Connect onboarding & payouts wiring.

Day 13–15: Testing, webhook handling, polish, deploy.

Exact prompt to hand to a dev/AI to implement this MVP

(Use this as a single input to an engineering ChatGPT or to generate tasks / PR.)

You are a senior full-stack engineer building a production-ready Next.js + TypeScript MVP for a Milton, Ontario snow-shoveling marketplace with Clerk auth and Stripe Connect payments. Follow the spec below precisely:

Implement the database schema provided (Postgres) and add safe transactions for race conditions (claiming jobs).

Integrate Clerk for user management (roles: homeowner, shoveler, admin). Protect admin routes by ADMIN_EMAIL.

Build homeowner flows: address geocoding -> one-time booking with Stripe Checkout -> create paid job.

Build shoveler flows: auto-approved on signup -> list open jobs ordered by distance (Haversine) -> claim/start/complete job -> show pending balance and payout history. Enforce max_houses limit.

Integrate Stripe Connect: for each job charge, set application_fee_amount = admin platform fee (default 500 cents) and transfer_data[destination] to shoveler's connected account. Handle subscriptions and recurring job creation via webhooks.

Create admin screen to edit pricing, platform fee, default max houses, view transactions, and trigger payouts.

Add webhook endpoint /api/webhooks/stripe to handle checkout.session.completed, payment_intent.succeeded, invoice.payment_succeeded, and update DB accordingly.

Provide test plan and sample Postman/HTTP examples for critical flows, plus a deployment checklist (Vercel & Postgres).

Deliver code with clear README that details env vars and Stripe/Clerk setup steps.

Key Improvements (what I changed & why)

• Role & responsibility clarity: assigned explicit roles and auth guard for admin by email.
• Concrete payment split: specified Stripe Connect + application_fee approach to ensure clear platform fee handling.
• Race condition handling: emphasized DB transactions & atomic claim logic to avoid double-claims.
• Configurable limits: made the ambiguous “max houses” explicit and admin-configurable.
• MVP scope: limited to Milton—keeps launch simple and testable.

Techniques Applied

• Product decomposition (actors → flows → APIs)
• Constraint-based design (Milton only, admin-guarded settings, fixed $5 fee)
• Practical integrations (Clerk for auth, Stripe Connect for payments/payouts)
• Safety & anti-fraud (postal code check, webhooks, KYC via Stripe)

Pro Tip

Start with the “payments off” mode in dev: implement full flows but stub Stripe calls with test webhooks first. Once flow stabilizes, switch to Stripe test keys and simulate webhooks using the Stripe CLI before going live.

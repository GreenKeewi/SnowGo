# SnowGo - Snow Shoveling Marketplace MVP

A Milton, Ontario-only snow-shoveling marketplace where homeowners can book one-time cleans or subscribe for recurring shoveling, and shovelers can accept jobs from an open list ordered by proximity.

## Tech Stack

- **Frontend**: Next.js 14+ (App Router) + React + Tailwind CSS
- **Backend**: Next.js API Routes with TypeScript
- **Database**: PostgreSQL
- **Auth**: Clerk
- **Payments**: Stripe with Stripe Connect
- **Hosting**: Vercel (recommended)

## Features

### For Homeowners
- Sign up and add addresses (Milton, ON only)
- Book one-time snow shoveling jobs
- Subscribe for recurring shoveling service (weekly, biweekly, monthly)
- View job history and receipts
- Pay securely via Stripe

### For Shovelers
- Auto-approved signup with Stripe Connect onboarding
- View open jobs ordered by distance
- Claim jobs (with configurable max houses limit)
- Mark jobs as started/completed
- Track earnings and pending payouts
- Receive payments via Stripe Connect

### For Admin
- Secure admin dashboard (restricted to configured email)
- Configure pricing (one-time and subscription rates)
- Set platform fee (default $5 per job)
- Configure max houses per shoveler
- View all transactions and analytics
- Manual payout triggers

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Clerk account
- Stripe account with Connect enabled

### 1. Clone and Install

```bash
git clone <repository-url>
cd SnowGo
npm install
```

### 2. Database Setup

Create a PostgreSQL database and run the schema:

```bash
psql -U your_user -d your_database -f db/schema.sql
```

### 3. Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required environment variables:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/snowgo

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding

# Stripe
STRIPE_SECRET_KEY=sk_test_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Admin
ADMIN_EMAIL=youremail@example.com

# Platform settings
DEFAULT_PLATFORM_FEE_CENTS=500
MAX_SEARCH_RADIUS_KM=50
```

### 4. Clerk Setup

1. Create a Clerk application at https://clerk.com
2. Configure redirect URLs:
   - Sign-in URL: `/sign-in`
   - Sign-up URL: `/sign-up`
   - After sign-in: `/dashboard`
   - After sign-up: `/onboarding`
3. Copy your publishable and secret keys to `.env`

### 5. Stripe Setup

1. Create a Stripe account at https://stripe.com
2. Enable Stripe Connect in your dashboard
3. Get your API keys from the Stripe dashboard
4. Set up webhook endpoint:
   - URL: `https://yourdomain.com/api/webhooks/stripe`
   - Events to listen for:
     - `checkout.session.completed`
     - `payment_intent.succeeded`
     - `invoice.payment_succeeded`
     - `transfer.created`
     - `transfer.paid`
     - `transfer.failed`
5. Copy webhook signing secret to `.env`

For local development, use Stripe CLI:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
SnowGo/
├── app/
│   ├── api/
│   │   ├── addresses/          # Address management
│   │   ├── admin/              # Admin endpoints
│   │   ├── book/               # Job booking
│   │   ├── jobs/               # Job management
│   │   ├── onboarding/         # User onboarding
│   │   ├── shoveler/           # Shoveler profile
│   │   └── webhooks/           # Stripe webhooks
│   ├── (pages)/                # Frontend pages
│   └── layout.tsx              # Root layout
├── db/
│   └── schema.sql              # Database schema
├── lib/
│   ├── api-response.ts         # API response helpers
│   ├── auth.ts                 # Authentication utilities
│   ├── db.ts                   # Database connection
│   ├── stripe.ts               # Stripe utilities
│   ├── types.ts                # TypeScript types
│   └── utils.ts                # Utility functions
└── middleware.ts               # Clerk auth middleware
```

## API Endpoints

### Homeowner Endpoints

- `GET /api/addresses` - List addresses
- `POST /api/addresses` - Add new address
- `POST /api/book/one-time` - Book one-time job
- `GET /api/jobs` - Get job history

### Shoveler Endpoints

- `GET /api/jobs/open` - List open jobs (sorted by distance)
- `POST /api/jobs/[id]/claim` - Claim a job
- `POST /api/jobs/[id]/start` - Start a job
- `POST /api/jobs/[id]/complete` - Complete a job
- `GET /api/shoveler/profile` - Get profile and earnings

### Admin Endpoints

- `GET /api/admin/settings` - Get admin settings
- `POST /api/admin/settings` - Update admin settings
- `GET /api/admin/transactions` - Get all transactions

### Other Endpoints

- `POST /api/onboarding` - Complete user onboarding
- `POST /api/webhooks/stripe` - Stripe webhook handler

## Database Schema

The database includes the following tables:

- `users` - All users (homeowners, shovelers, admin)
- `shovelers` - Shoveler profiles
- `addresses` - Homeowner addresses
- `jobs` - Snow shoveling jobs
- `subscriptions` - Recurring subscriptions
- `admin_settings` - Platform configuration
- `payouts` - Payout tracking
- `audit_log` - Admin action audit trail

See `db/schema.sql` for complete schema.

## Business Logic

### Pricing

- Platform fee: $5 per job (configurable)
- One-time job: $40 default (configurable)
- Weekly subscription: $150 default (configurable)
- Biweekly subscription: $250 default (configurable)
- Monthly subscription: $400 default (configurable)

All prices are in CAD cents.

### Job Flow

1. Homeowner books job and pays via Stripe
2. Job appears in open jobs list
3. Shoveler claims job (if under max houses limit)
4. Shoveler marks job as started
5. Shoveler marks job as completed
6. Payout is scheduled for shoveler

### Shoveler Limits

Each shoveler has a configurable maximum number of active houses they can service simultaneously. This prevents over-commitment and ensures quality service.

### Milton-Only Restriction

The platform only accepts addresses with Milton postal codes (L9T, L9E, L0P). This is validated on the backend.

## Testing

### Manual Testing Checklist

- [ ] User signup (homeowner and shoveler)
- [ ] Address creation with Milton postal code validation
- [ ] One-time job booking with Stripe payment
- [ ] Open jobs listing with distance calculation
- [ ] Job claim with max houses enforcement
- [ ] Job start and complete flow
- [ ] Admin settings update
- [ ] Stripe webhook handling
- [ ] Admin dashboard access restriction

### Stripe Test Cards

Use Stripe test cards for development:
- Success: `4242 4242 4242 4242`
- Requires authentication: `4000 0025 0000 3155`
- Declined: `4000 0000 0000 0002`

### Testing Webhooks Locally

Use Stripe CLI to forward webhooks:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
stripe trigger checkout.session.completed
```

## Deployment

### Vercel Deployment

1. Push code to GitHub
2. Import project in Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

### Database Hosting

Recommended providers:
- Neon (https://neon.tech) - Serverless Postgres
- Supabase (https://supabase.com) - Postgres with additional features
- Railway (https://railway.app) - Simple Postgres hosting

### Post-Deployment

1. Update Clerk redirect URLs to production domain
2. Update Stripe webhook URL to production domain
3. Test webhook delivery in Stripe dashboard
4. Verify admin email access
5. Test end-to-end payment flow

## Security Considerations

- All API routes protected by Clerk authentication
- Admin routes restricted to configured email
- Stripe webhook signature verification
- SQL injection prevention via parameterized queries
- Milton postal code validation
- Transaction-based job claiming to prevent race conditions

## Future Enhancements

- Google Maps / Mapbox integration for accurate geocoding
- Photo upload for job completion evidence
- Push notifications for job updates
- Shoveler ratings and reviews
- Advanced analytics dashboard
- Multi-city support
- Mobile app

## License

MIT

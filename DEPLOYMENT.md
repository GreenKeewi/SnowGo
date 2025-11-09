# SnowGo MVP - Deployment Guide

## Pre-Deployment Checklist

### 1. Database Setup

#### Option A: Neon (Recommended for MVP)
1. Sign up at https://neon.tech
2. Create a new project named "SnowGo"
3. Copy the connection string
4. Run the schema:
```bash
psql "YOUR_CONNECTION_STRING" -f db/schema.sql
```

#### Option B: Supabase
1. Sign up at https://supabase.com
2. Create a new project
3. Go to Database → SQL Editor
4. Paste and run the contents of `db/schema.sql`
5. Copy the connection string from Settings → Database

#### Option C: Railway
1. Sign up at https://railway.app
2. Create new project → Add PostgreSQL
3. Copy connection string
4. Connect and run schema

### 2. Clerk Setup

1. Go to https://clerk.com and create an account
2. Create a new application
3. Configure settings:
   - **Application name**: SnowGo
   - **Enable email/password** and **Magic Links**
   
4. Configure redirect URLs in Clerk Dashboard:
   - Sign-in URL: `https://yourdomain.com/sign-in`
   - Sign-up URL: `https://yourdomain.com/sign-up`
   - After sign-in: `https://yourdomain.com/dashboard`
   - After sign-up: `https://yourdomain.com/onboarding`

5. Copy your keys:
   - Publishable Key → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - Secret Key → `CLERK_SECRET_KEY`

### 3. Stripe Setup

1. Go to https://stripe.com and create an account (or use existing)
2. Switch to **Test mode** for initial setup
3. Enable Stripe Connect:
   - Go to Connect → Get Started
   - Choose "Platform or Marketplace"
   - Complete onboarding

4. Get API Keys:
   - Go to Developers → API Keys
   - Copy **Publishable key** → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - Copy **Secret key** → `STRIPE_SECRET_KEY`

5. Set up Webhook:
   - Go to Developers → Webhooks
   - Click "Add endpoint"
   - Endpoint URL: `https://yourdomain.com/api/webhooks/stripe`
   - Events to listen for:
     - `checkout.session.completed`
     - `payment_intent.succeeded`
     - `invoice.payment_succeeded`
     - `transfer.created`
   - Copy **Signing secret** → `STRIPE_WEBHOOK_SECRET`

### 4. Vercel Deployment

1. Push code to GitHub repository
2. Go to https://vercel.com
3. Click "New Project"
4. Import your GitHub repository
5. Configure environment variables (see below)
6. Deploy

### 5. Environment Variables

Set these in Vercel dashboard (Settings → Environment Variables):

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx
CLERK_SECRET_KEY=sk_live_xxxxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding

# Stripe
STRIPE_SECRET_KEY=sk_live_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Admin (YOUR EMAIL)
ADMIN_EMAIL=youremail@example.com

# Platform Settings
DEFAULT_PLATFORM_FEE_CENTS=500
MAX_SEARCH_RADIUS_KM=50
```

## Post-Deployment Tasks

### 1. Update Webhook URLs

After deployment, update the webhook URL in Stripe:
1. Go to Stripe Dashboard → Developers → Webhooks
2. Edit your webhook endpoint
3. Update URL to production domain: `https://yourdomain.com/api/webhooks/stripe`

### 2. Update Clerk Redirect URLs

1. Go to Clerk Dashboard
2. Update all redirect URLs to use your production domain
3. Test sign-in/sign-up flow

### 3. Test Complete Flow

#### Homeowner Flow
1. Sign up as homeowner
2. Complete onboarding (select "Homeowner")
3. Add an address in Milton (use L9T postal code)
4. Book a one-time job
5. Complete payment with test card: `4242 4242 4242 4242`
6. Verify job appears in "My Jobs"

#### Shoveler Flow
1. Sign up as shoveler (use different email)
2. Complete onboarding (select "Shoveler")
3. Fill in profile information
4. Complete Stripe Connect onboarding
5. View available jobs
6. Claim a job
7. Start the job
8. Complete the job
9. Verify payout is pending

#### Admin Flow
1. Sign in with admin email
2. Go to `/dashboard/admin`
3. Verify you can view statistics
4. Update platform settings
5. Verify changes are saved

### 4. Switch to Live Mode

Once testing is complete:

1. **Stripe**:
   - Switch to Live mode in Stripe Dashboard
   - Get new Live API keys
   - Update webhook for Live mode
   - Update environment variables in Vercel

2. **Clerk**:
   - Already using live keys if on production

3. **Test with Real Cards**:
   - Use real payment methods
   - Monitor transactions in Stripe Dashboard

## Monitoring & Maintenance

### Regular Tasks

1. **Weekly**:
   - Check Stripe Dashboard for failed payments
   - Review pending payouts
   - Monitor error logs in Vercel

2. **Monthly**:
   - Review admin statistics
   - Check database performance
   - Update pricing if needed

3. **As Needed**:
   - Process manual payouts if required
   - Handle customer support issues
   - Update admin settings

### Error Monitoring

1. Set up Vercel Analytics (included)
2. Consider adding Sentry for error tracking:
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

### Database Backups

- **Neon**: Automatic backups included
- **Supabase**: Automatic backups included
- **Railway**: Configure backup schedule in settings

## Troubleshooting

### Common Issues

1. **"Clerk is not configured" error**:
   - Verify all Clerk environment variables are set
   - Check that publishable key format is correct (pk_live_ or pk_test_)

2. **Stripe webhook not working**:
   - Verify webhook secret is correct
   - Check that webhook URL is accessible
   - Use Stripe CLI to test locally:
     ```bash
     stripe listen --forward-to localhost:3000/api/webhooks/stripe
     ```

3. **Database connection error**:
   - Verify DATABASE_URL is correct
   - Check database is accessible from Vercel
   - Ensure database allows connections from Vercel IPs

4. **Jobs not appearing for shovelers**:
   - Verify jobs have valid lat/lon coordinates
   - Check max_search_radius_km setting
   - Ensure job status is 'open'

5. **Payment not processing**:
   - Check Stripe API keys are correct
   - Verify webhook events are being received
   - Check Stripe logs for errors

### Support Resources

- **Next.js**: https://nextjs.org/docs
- **Clerk**: https://clerk.com/docs
- **Stripe**: https://stripe.com/docs
- **Vercel**: https://vercel.com/docs
- **PostgreSQL**: https://www.postgresql.org/docs/

## Scaling Considerations

When ready to scale beyond MVP:

1. **Geographic Expansion**:
   - Update postal code validation to include new cities
   - Add city selector in address form
   - Update admin settings to manage multiple service areas

2. **Performance**:
   - Add Redis for caching
   - Implement database connection pooling
   - Add CDN for static assets (Vercel handles this)

3. **Features**:
   - Implement subscription creation endpoint
   - Add photo upload for job completion
   - Implement rating/review system
   - Add push notifications
   - Create mobile app

4. **Payment Processing**:
   - Implement automatic payout schedule
   - Add support for refunds
   - Handle payment disputes

## Security Checklist

- [x] All API routes protected by authentication
- [x] Admin routes restricted to specific email
- [x] SQL injection prevented via parameterized queries
- [x] Stripe webhook signature verification
- [x] Sensitive data in environment variables
- [x] HTTPS enabled (Vercel automatic)
- [ ] Rate limiting (consider adding for production)
- [ ] CORS configuration (if needed for API)

## Launch Checklist

Before going live:

- [ ] Database schema deployed and verified
- [ ] All environment variables set in production
- [ ] Clerk configured with production domain
- [ ] Stripe configured with production domain and live keys
- [ ] Webhook endpoints tested and verified
- [ ] Admin email configured correctly
- [ ] Test homeowner flow end-to-end
- [ ] Test shoveler flow end-to-end
- [ ] Test admin dashboard access
- [ ] Domain configured and SSL enabled
- [ ] Privacy policy and terms of service added
- [ ] Contact information displayed
- [ ] Error monitoring set up

## Maintenance Mode

To put the platform in maintenance mode:

1. Create a maintenance page component
2. Update `middleware.ts` to redirect all routes to maintenance page
3. Deploy changes
4. Perform maintenance
5. Revert middleware changes
6. Deploy

## Contact

For issues or questions about deployment, refer to the main README.md or open an issue in the repository.

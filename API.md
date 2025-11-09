# SnowGo API Documentation

## Base URL

- Development: `http://localhost:3000`
- Production: `https://yourdomain.com`

All API routes are prefixed with `/api`.

## Authentication

All routes except webhooks require authentication via Clerk. Include the Clerk session token in requests.

Admin routes additionally verify that the authenticated user's email matches `ADMIN_EMAIL`.

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message"
}
```

## Endpoints

### Addresses

#### GET /api/addresses
List all addresses for the authenticated homeowner.

**Authentication**: Required (homeowner)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "label": "Home",
      "line1": "123 Main St",
      "line2": null,
      "city": "Milton",
      "province": "ON",
      "postal_code": "L9T 1A1",
      "lat": 43.5183,
      "lon": -79.8774,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### POST /api/addresses
Create a new address.

**Authentication**: Required (homeowner)

**Request Body**:
```json
{
  "label": "Home",
  "line1": "123 Main St",
  "line2": "Apt 4",
  "city": "Milton",
  "postal_code": "L9T 1A1"
}
```

**Validation**:
- `line1`, `city`, `postal_code` are required
- City must be "Milton"
- Postal code must start with L9T, L9E, or L0P

**Response**: Same as GET (single address object)

---

### Jobs

#### GET /api/jobs
Get all jobs for the authenticated homeowner.

**Authentication**: Required (homeowner)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "homeowner_id": "uuid",
      "address_id": "uuid",
      "shoveler_id": "uuid",
      "scheduled_at": "2024-01-15T08:00:00Z",
      "type": "one_time",
      "status": "completed",
      "price_cents": 4000,
      "platform_fee_cents": 500,
      "payout_cents": 3500,
      "line1": "123 Main St",
      "city": "Milton",
      "postal_code": "L9T 1A1",
      "shoveler_name": "John Doe",
      "shoveler_email": "john@example.com"
    }
  ]
}
```

#### GET /api/jobs/open
Get open jobs for shovelers, sorted by distance.

**Authentication**: Required (shoveler)

**Query Parameters**:
- `lat` (optional): Shoveler's latitude (default: 43.5183)
- `lon` (optional): Shoveler's longitude (default: -79.8774)
- `limit` (optional): Max number of jobs to return (default: 50)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "scheduled_at": "2024-01-15T08:00:00Z",
      "type": "one_time",
      "status": "open",
      "price_cents": 4000,
      "payout_cents": 3500,
      "line1": "123 Main St",
      "city": "Milton",
      "postal_code": "L9T 1A1",
      "distance_km": 2.5,
      "homeowner_email": "homeowner@example.com"
    }
  ]
}
```

#### POST /api/jobs/[id]/claim
Claim an open job.

**Authentication**: Required (shoveler)

**Validation**:
- Job must be in 'open' status
- Shoveler must not have reached max houses limit

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "claimed",
    "claimed_at": "2024-01-14T12:00:00Z",
    ...
  }
}
```

#### POST /api/jobs/[id]/start
Mark a job as started.

**Authentication**: Required (shoveler)

**Validation**:
- Job must be in 'claimed' status
- Job must belong to authenticated shoveler

**Response**: Updated job object

#### POST /api/jobs/[id]/complete
Mark a job as completed.

**Authentication**: Required (shoveler)

**Validation**:
- Job must be in 'in_progress' or 'claimed' status
- Job must belong to authenticated shoveler

**Response**: Updated job object

**Side Effect**: Creates a payout record in 'pending' status

---

### Booking

#### POST /api/book/one-time
Book a one-time snow shoveling job.

**Authentication**: Required (homeowner)

**Request Body**:
```json
{
  "address_id": "uuid",
  "scheduled_at": "2024-01-15T08:00:00Z"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "job": { ... },
    "checkout_url": "https://checkout.stripe.com/..."
  }
}
```

**Flow**:
1. Job is created with status 'open'
2. Stripe Checkout session is created
3. User is redirected to Stripe for payment
4. On successful payment, webhook confirms the job

---

### Shoveler

#### GET /api/shoveler/profile
Get shoveler profile with earnings and statistics.

**Authentication**: Required (shoveler)

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "display_name": "John Doe",
    "phone": "(555) 123-4567",
    "bio": "Experienced snow removal",
    "max_houses": 5,
    "active": true,
    "stripe_account_id": "acct_...",
    "onboarding_completed": true,
    "total_completed_jobs": 15,
    "total_earnings_cents": 52500,
    "pending_balance_cents": 3500,
    "active_houses_count": 2,
    "recent_jobs": [ ... ]
  }
}
```

---

### Onboarding

#### POST /api/onboarding
Complete user onboarding and set role.

**Authentication**: Required

**Request Body**:
```json
{
  "role": "homeowner | shoveler",
  "display_name": "John Doe",
  "phone": "(555) 123-4567",
  "bio": "Optional bio"
}
```

**Response (Homeowner)**:
```json
{
  "success": true,
  "data": {
    "user": { ... }
  }
}
```

**Response (Shoveler)**:
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "onboarding_url": "https://connect.stripe.com/..."
  }
}
```

**Flow for Shovelers**:
1. User record created with role 'shoveler'
2. Shoveler profile created
3. Stripe Connect account created
4. User redirected to Stripe Connect onboarding
5. After Stripe onboarding, user redirected back to dashboard

---

### Admin

#### GET /api/admin/settings
Get platform settings.

**Authentication**: Required (admin)

**Response**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "platform_fee_cents": 500,
    "default_max_houses_per_shoveler": 5,
    "allowed_city": "Milton",
    "payout_schedule": "weekly",
    "base_one_time_price_cents": 4000,
    "weekly_subscription_price_cents": 15000,
    "biweekly_subscription_price_cents": 25000,
    "monthly_subscription_price_cents": 40000,
    "max_search_radius_km": 50,
    "milton_postal_code_prefixes": "L9T,L9E,L0P"
  }
}
```

#### POST /api/admin/settings
Update platform settings.

**Authentication**: Required (admin)

**Request Body** (all fields optional):
```json
{
  "platform_fee_cents": 500,
  "default_max_houses_per_shoveler": 5,
  "base_one_time_price_cents": 4000,
  "weekly_subscription_price_cents": 15000,
  "biweekly_subscription_price_cents": 25000,
  "monthly_subscription_price_cents": 40000,
  "max_search_radius_km": 50
}
```

**Response**: Updated settings object

#### GET /api/admin/transactions
Get all transactions and statistics.

**Authentication**: Required (admin)

**Response**:
```json
{
  "success": true,
  "data": {
    "jobs": [ ... ],
    "payouts": [ ... ],
    "statistics": {
      "total_jobs": 100,
      "completed_jobs": 85,
      "total_revenue_cents": 340000,
      "platform_revenue_cents": 42500,
      "total_payouts_cents": 297500
    }
  }
}
```

---

### Webhooks

#### POST /api/webhooks/stripe
Stripe webhook handler.

**Authentication**: Stripe signature verification

**Events Handled**:
- `checkout.session.completed`: Confirms job payment
- `payment_intent.succeeded`: Logs payment success
- `invoice.payment_succeeded`: Creates job for subscription
- `transfer.created`: Updates payout status

**Request**: Raw Stripe webhook payload

**Response**:
```json
{
  "success": true,
  "data": {
    "received": true
  }
}
```

---

## Error Codes

- `200`: Success
- `201`: Created
- `400`: Bad Request (invalid input)
- `401`: Unauthorized (not authenticated)
- `403`: Forbidden (authenticated but not authorized)
- `404`: Not Found
- `500`: Internal Server Error

## Rate Limiting

Not currently implemented. Consider adding for production:
- 100 requests per minute per user
- 1000 requests per hour per user

## Examples

### Book a Job (cURL)

```bash
curl -X POST https://yourdomain.com/api/book/one-time \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -d '{
    "address_id": "123e4567-e89b-12d3-a456-426614174000",
    "scheduled_at": "2024-01-15T08:00:00Z"
  }'
```

### Claim a Job (cURL)

```bash
curl -X POST https://yourdomain.com/api/jobs/123e4567-e89b-12d3-a456-426614174000/claim \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN"
```

### Update Admin Settings (cURL)

```bash
curl -X POST https://yourdomain.com/api/admin/settings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -d '{
    "platform_fee_cents": 600,
    "base_one_time_price_cents": 4500
  }'
```

## Testing with Stripe

### Test Cards

- **Success**: `4242 4242 4242 4242`
- **Requires Authentication**: `4000 0025 0000 3155`
- **Declined**: `4000 0000 0000 0002`

### Webhook Testing

Use Stripe CLI to forward webhooks to local development:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Trigger specific events:

```bash
stripe trigger checkout.session.completed
stripe trigger payment_intent.succeeded
```

## Notes

- All timestamps are in ISO 8601 format (UTC)
- All prices are in Canadian cents (CAD)
- Distance calculations use Haversine formula (km)
- Postal code validation is specific to Milton, ON (L9T, L9E, L0P)

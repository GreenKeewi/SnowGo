import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { createCheckoutSession } from '@/lib/stripe';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
} from '@/lib/api-response';
import { BookOneTimeRequest } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body: BookOneTimeRequest = await request.json();

    const { address_id, scheduled_at } = body;

    // Validate required fields
    if (!address_id || !scheduled_at) {
      return errorResponse('Missing required fields: address_id, scheduled_at');
    }

    // Verify address belongs to user
    const addressResult = await query(
      'SELECT * FROM addresses WHERE id = $1 AND user_id = $2',
      [address_id, user.id]
    );

    if (addressResult.rows.length === 0) {
      return errorResponse('Address not found or does not belong to user', 404);
    }

    // Get admin settings for pricing
    const settingsResult = await query('SELECT * FROM admin_settings WHERE id = 1');
    const settings = settingsResult.rows[0];

    if (!settings) {
      return serverErrorResponse('Admin settings not configured');
    }

    const price_cents = settings.base_one_time_price_cents;
    const platform_fee_cents = settings.platform_fee_cents;
    const payout_cents = Math.max(0, price_cents - platform_fee_cents);

    // Create job record with status 'open' (will be confirmed after payment)
    const jobResult = await query(
      `INSERT INTO jobs (
        homeowner_id, address_id, scheduled_at, type, status,
        price_cents, platform_fee_cents, payout_cents
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        user.id,
        address_id,
        scheduled_at,
        'one_time',
        'open',
        price_cents,
        platform_fee_cents,
        payout_cents,
      ]
    );

    const job = jobResult.rows[0];

    // Create Stripe checkout session
    const baseUrl = request.headers.get('origin') || 'http://localhost:3000';
    const session = await createCheckoutSession({
      priceInCents: price_cents,
      jobId: job.id,
      successUrl: `${baseUrl}/dashboard/homeowner?payment=success&job_id=${job.id}`,
      cancelUrl: `${baseUrl}/dashboard/homeowner?payment=cancelled`,
      customerEmail: user.email,
    });

    // Update job with checkout session ID
    await query(
      'UPDATE jobs SET stripe_checkout_session_id = $1 WHERE id = $2',
      [session.id, job.id]
    );

    return successResponse({
      job,
      checkout_url: session.url,
    });
  } catch (error: any) {
    console.error('Error booking one-time job:', error);
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    return serverErrorResponse('Failed to book job');
  }
}

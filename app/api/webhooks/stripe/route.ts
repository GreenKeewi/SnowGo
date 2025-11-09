import { NextRequest } from 'next/server';
import { constructWebhookEvent } from '@/lib/stripe';
import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return errorResponse('Missing stripe-signature header', 400);
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error('STRIPE_WEBHOOK_SECRET not configured');
      return errorResponse('Webhook secret not configured', 500);
    }

    // Verify webhook signature
    const event = constructWebhookEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    console.log('Received Stripe webhook:', event.type);

    // Handle different webhook events
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as any);
        break;

      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as any);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as any);
        break;

      case 'transfer.created':
        await handleTransferPaid(event.data.object as any);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return successResponse({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return errorResponse(`Webhook error: ${error.message}`, 400);
  }
}

async function handleCheckoutSessionCompleted(session: any) {
  console.log('Checkout session completed:', session.id);

  const jobId = session.metadata?.job_id;
  if (!jobId) {
    console.warn('No job_id in checkout session metadata');
    return;
  }

  // Update job with payment intent ID (already set as open, just confirm)
  await query(
    `UPDATE jobs 
     SET stripe_payment_intent_id = $1
     WHERE id = $2 AND stripe_checkout_session_id = $3`,
    [session.payment_intent, jobId, session.id]
  );

  console.log(`Job ${jobId} payment confirmed via checkout session`);
}

async function handlePaymentIntentSucceeded(paymentIntent: any) {
  console.log('Payment intent succeeded:', paymentIntent.id);

  // Find job by payment intent ID
  const result = await query(
    'SELECT * FROM jobs WHERE stripe_payment_intent_id = $1',
    [paymentIntent.id]
  );

  if (result.rows.length > 0) {
    console.log(`Payment confirmed for job ${result.rows[0].id}`);
  }
}

async function handleInvoicePaymentSucceeded(invoice: any) {
  console.log('Invoice payment succeeded:', invoice.id);

  const subscriptionId = invoice.subscription;
  if (!subscriptionId) {
    console.warn('No subscription in invoice');
    return;
  }

  // Get subscription details
  const subResult = await query(
    'SELECT * FROM subscriptions WHERE stripe_subscription_id = $1',
    [subscriptionId]
  );

  if (subResult.rows.length === 0) {
    console.warn(`Subscription ${subscriptionId} not found in database`);
    return;
  }

  const subscription = subResult.rows[0];

  // Get admin settings for pricing
  const settingsResult = await query('SELECT * FROM admin_settings WHERE id = 1');
  const settings = settingsResult.rows[0];

  // Calculate next scheduled date (simple: today + interval)
  const scheduledAt = new Date();
  scheduledAt.setHours(8, 0, 0, 0); // Default to 8 AM

  // Create job occurrence for this subscription payment
  await query(
    `INSERT INTO jobs (
      homeowner_id, address_id, scheduled_at, type, status,
      price_cents, platform_fee_cents, payout_cents
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      subscription.homeowner_id,
      subscription.address_id,
      scheduledAt.toISOString(),
      'subscription_occurrence',
      'open',
      subscription.price_cents,
      settings.platform_fee_cents,
      Math.max(0, subscription.price_cents - settings.platform_fee_cents),
    ]
  );

  console.log(`Created job occurrence for subscription ${subscriptionId}`);
}

async function handleTransferPaid(transfer: any) {
  console.log('Transfer paid:', transfer.id);

  // Update payout status if we have metadata
  if (transfer.metadata?.payout_id) {
    await query(
      `UPDATE payouts 
       SET status = 'completed', stripe_transfer_id = $1, processed_at = now()
       WHERE id = $2`,
      [transfer.id, transfer.metadata.payout_id]
    );
  }
}

async function handleTransferFailed(transfer: any) {
  console.log('Transfer failed:', transfer.id);

  if (transfer.metadata?.payout_id) {
    await query(
      `UPDATE payouts 
       SET status = 'failed', failure_reason = $1
       WHERE id = $2`,
      [transfer.failure_message || 'Unknown error', transfer.metadata.payout_id]
    );
  }
}

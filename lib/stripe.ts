import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not defined');
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-10-29.clover',
      typescript: true,
    });
  }
  return stripeInstance;
}

export const stripe = new Proxy({} as Stripe, {
  get: (_, prop) => {
    return getStripe()[prop as keyof Stripe];
  },
});

export async function createCheckoutSession({
  priceInCents,
  jobId,
  successUrl,
  cancelUrl,
  customerEmail,
}: {
  priceInCents: number;
  jobId: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
}): Promise<Stripe.Checkout.Session> {
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'cad',
          product_data: {
            name: 'Snow Shoveling Service',
            description: 'One-time snow shoveling service',
          },
          unit_amount: priceInCents,
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      job_id: jobId,
    },
    customer_email: customerEmail,
  });

  return session;
}

export async function createConnectAccountLink(
  accountId: string,
  returnUrl: string,
  refreshUrl: string
): Promise<string> {
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });

  return accountLink.url;
}

export async function createConnectAccount(email: string): Promise<Stripe.Account> {
  const account = await stripe.accounts.create({
    type: 'express',
    country: 'CA',
    email: email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });

  return account;
}

export async function createSubscription({
  customerId,
  priceInCents,
  frequency,
  metadata,
}: {
  customerId: string;
  priceInCents: number;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  metadata: Record<string, string>;
}): Promise<Stripe.Subscription> {
  // Create a price for the subscription
  const price = await stripe.prices.create({
    currency: 'cad',
    unit_amount: priceInCents,
    recurring: {
      interval: frequency === 'weekly' ? 'week' : frequency === 'biweekly' ? 'week' : 'month',
      interval_count: frequency === 'biweekly' ? 2 : 1,
    },
    product_data: {
      name: `Snow Shoveling - ${frequency}`,
    },
  });

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: price.id }],
    metadata,
  });

  return subscription;
}

export async function createOrGetCustomer(
  email: string,
  metadata?: Record<string, string>
): Promise<Stripe.Customer> {
  // Try to find existing customer
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0];
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email,
    metadata,
  });

  return customer;
}

export async function createTransfer({
  amount,
  destination,
  metadata,
}: {
  amount: number;
  destination: string;
  metadata: Record<string, string>;
}): Promise<Stripe.Transfer> {
  const transfer = await stripe.transfers.create({
    amount,
    currency: 'cad',
    destination,
    metadata,
  });

  return transfer;
}

export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
  secret: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(payload, signature, secret);
}

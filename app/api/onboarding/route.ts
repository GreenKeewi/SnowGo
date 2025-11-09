import { NextRequest } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { query } from '@/lib/db';
import { createConnectAccount, createConnectAccountLink } from '@/lib/stripe';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
} from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return errorResponse('Unauthorized', 401);
    }

    const body = await request.json();
    const { role, display_name, phone, bio } = body;

    if (!role || !['homeowner', 'shoveler'].includes(role)) {
      return errorResponse('Invalid role. Must be "homeowner" or "shoveler"');
    }

    const email = clerkUser.emailAddresses[0]?.emailAddress;
    if (!email) {
      return errorResponse('Email not found');
    }

    // Create or update user
    const userResult = await query(
      `INSERT INTO users (clerk_id, email, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (clerk_id)
       DO UPDATE SET role = EXCLUDED.role, email = EXCLUDED.email
       RETURNING *`,
      [clerkUser.id, email, role]
    );

    const user = userResult.rows[0];

    // If shoveler, create shoveler profile and Stripe Connect account
    if (role === 'shoveler') {
      // Check if shoveler profile already exists
      const shovelerCheck = await query(
        'SELECT * FROM shovelers WHERE id = $1',
        [user.id]
      );

      let stripeAccountId = shovelerCheck.rows[0]?.stripe_account_id;
      let onboardingUrl = null;

      if (shovelerCheck.rows.length === 0) {
        // Create Stripe Connect account
        const stripeAccount = await createConnectAccount(email);
        stripeAccountId = stripeAccount.id;

        // Get admin settings for default max houses
        const settingsResult = await query(
          'SELECT default_max_houses_per_shoveler FROM admin_settings WHERE id = 1'
        );
        const maxHouses = settingsResult.rows[0]?.default_max_houses_per_shoveler || 5;

        // Create shoveler profile
        await query(
          `INSERT INTO shovelers (id, display_name, phone, bio, stripe_account_id, max_houses)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [user.id, display_name || null, phone || null, bio || null, stripeAccountId, maxHouses]
        );

        // Create account link for onboarding
        const baseUrl = request.headers.get('origin') || 'http://localhost:3000';
        onboardingUrl = await createConnectAccountLink(
          stripeAccountId,
          `${baseUrl}/dashboard/shoveler?onboarding=complete`,
          `${baseUrl}/onboarding`
        );
      } else {
        // Update existing profile
        await query(
          `UPDATE shovelers
           SET display_name = COALESCE($1, display_name),
               phone = COALESCE($2, phone),
               bio = COALESCE($3, bio)
           WHERE id = $4`,
          [display_name || null, phone || null, bio || null, user.id]
        );

        // If Stripe account exists but onboarding not complete, create new link
        if (stripeAccountId && !shovelerCheck.rows[0].onboarding_completed) {
          const baseUrl = request.headers.get('origin') || 'http://localhost:3000';
          onboardingUrl = await createConnectAccountLink(
            stripeAccountId,
            `${baseUrl}/dashboard/shoveler?onboarding=complete`,
            `${baseUrl}/onboarding`
          );
        }
      }

      return successResponse({
        user,
        onboarding_url: onboardingUrl,
      });
    }

    return successResponse({ user });
  } catch (error: any) {
    console.error('Error in onboarding:', error);
    return serverErrorResponse('Failed to complete onboarding');
  }
}

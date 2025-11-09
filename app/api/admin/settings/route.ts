import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { query } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
} from '@/lib/api-response';
import { UpdateAdminSettingsRequest } from '@/lib/types';

export async function GET() {
  try {
    await requireAdmin();

    const result = await query('SELECT * FROM admin_settings WHERE id = 1');
    
    if (result.rows.length === 0) {
      return errorResponse('Admin settings not found', 404);
    }

    return successResponse(result.rows[0]);
  } catch (error: any) {
    console.error('Error fetching admin settings:', error);
    if (error.message.includes('Forbidden') || error.message.includes('admin')) {
      return errorResponse('Forbidden: admin access required', 403);
    }
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    return serverErrorResponse('Failed to fetch admin settings');
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body: UpdateAdminSettingsRequest = await request.json();

    const allowedFields = [
      'platform_fee_cents',
      'default_max_houses_per_shoveler',
      'base_one_time_price_cents',
      'weekly_subscription_price_cents',
      'biweekly_subscription_price_cents',
      'monthly_subscription_price_cents',
      'max_search_radius_km',
    ];

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(body)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updates.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return errorResponse('No valid fields to update');
    }

    const updateQuery = `
      UPDATE admin_settings
      SET ${updates.join(', ')}
      WHERE id = 1
      RETURNING *
    `;

    const result = await query(updateQuery, values);

    return successResponse(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating admin settings:', error);
    if (error.message.includes('Forbidden') || error.message.includes('admin')) {
      return errorResponse('Forbidden: admin access required', 403);
    }
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    return serverErrorResponse('Failed to update admin settings');
  }
}

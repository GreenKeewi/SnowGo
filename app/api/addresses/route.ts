import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { geocodeAddress, isValidMiltonPostalCode } from '@/lib/utils';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
} from '@/lib/api-response';
import { CreateAddressRequest } from '@/lib/types';

export async function GET() {
  try {
    const user = await requireUser();

    const result = await query(
      'SELECT * FROM addresses WHERE user_id = $1 ORDER BY created_at DESC',
      [user.id]
    );

    return successResponse(result.rows);
  } catch (error: any) {
    console.error('Error fetching addresses:', error);
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    return serverErrorResponse('Failed to fetch addresses');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body: CreateAddressRequest = await request.json();

    const { label, line1, line2, city, postal_code } = body;

    // Validate required fields
    if (!line1 || !city || !postal_code) {
      return errorResponse('Missing required fields: line1, city, postal_code');
    }

    // Normalize city to Milton
    const normalizedCity = city.trim().toLowerCase();
    if (normalizedCity !== 'milton') {
      return errorResponse('Service is only available in Milton, ON');
    }

    // Validate Milton postal code
    if (!isValidMiltonPostalCode(postal_code)) {
      return errorResponse(
        'Invalid postal code for Milton, ON. Must start with L9T, L9E, or L0P'
      );
    }

    // Geocode the address (stub for MVP)
    const coordinates = await geocodeAddress({ line1, city, postalCode: postal_code });
    
    if (!coordinates) {
      return errorResponse('Unable to geocode address');
    }

    // Insert address
    const result = await query(
      `INSERT INTO addresses (user_id, label, line1, line2, city, province, postal_code, lat, lon)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        user.id,
        label || null,
        line1,
        line2 || null,
        'Milton',
        'ON',
        postal_code.toUpperCase(),
        coordinates.lat,
        coordinates.lon,
      ]
    );

    return successResponse(result.rows[0], 201);
  } catch (error: any) {
    console.error('Error creating address:', error);
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    return serverErrorResponse('Failed to create address');
  }
}

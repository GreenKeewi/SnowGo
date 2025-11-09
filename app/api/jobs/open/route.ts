import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { haversineDistance } from '@/lib/utils';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
} from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const searchParams = request.nextUrl.searchParams;

    // Get query parameters
    const lat = parseFloat(searchParams.get('lat') || '43.5183'); // Default to Milton center
    const lon = parseFloat(searchParams.get('lon') || '-79.8774');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Get max search radius from admin settings
    const settingsResult = await query('SELECT max_search_radius_km FROM admin_settings WHERE id = 1');
    const maxRadius = settingsResult.rows[0]?.max_search_radius_km || 50;

    // Get all open jobs with address details
    const result = await query(
      `SELECT 
        j.*,
        a.line1, a.line2, a.city, a.postal_code, a.lat, a.lon,
        u.email as homeowner_email
      FROM jobs j
      JOIN addresses a ON j.address_id = a.id
      JOIN users u ON j.homeowner_id = u.id
      WHERE j.status = 'open'
        AND a.lat IS NOT NULL
        AND a.lon IS NOT NULL
      ORDER BY j.scheduled_at ASC
      LIMIT $1`,
      [limit * 2] // Get more results to filter by distance
    );

    // Calculate distances and filter by max radius
    const jobsWithDistance = result.rows
      .map((job: any) => {
        const distance = haversineDistance(lat, lon, job.lat, job.lon);
        return {
          ...job,
          distance_km: Math.round(distance * 100) / 100, // Round to 2 decimal places
        };
      })
      .filter((job: any) => job.distance_km <= maxRadius)
      .sort((a: any, b: any) => a.distance_km - b.distance_km)
      .slice(0, limit);

    return successResponse(jobsWithDistance);
  } catch (error: any) {
    console.error('Error fetching open jobs:', error);
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    return serverErrorResponse('Failed to fetch open jobs');
  }
}

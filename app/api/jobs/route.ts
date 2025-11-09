import { requireUser } from '@/lib/auth';
import { query } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
} from '@/lib/api-response';

export async function GET() {
  try {
    const user = await requireUser();

    // Get all jobs for homeowner with address details
    const result = await query(
      `SELECT 
        j.*,
        a.line1, a.line2, a.city, a.postal_code,
        s.display_name as shoveler_name,
        u.email as shoveler_email
      FROM jobs j
      LEFT JOIN addresses a ON j.address_id = a.id
      LEFT JOIN shovelers s ON j.shoveler_id = s.id
      LEFT JOIN users u ON j.shoveler_id = u.id
      WHERE j.homeowner_id = $1
      ORDER BY j.scheduled_at DESC`,
      [user.id]
    );

    return successResponse(result.rows);
  } catch (error: any) {
    console.error('Error fetching jobs:', error);
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    return serverErrorResponse('Failed to fetch jobs');
  }
}

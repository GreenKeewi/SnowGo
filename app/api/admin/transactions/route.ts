import { requireAdmin } from '@/lib/auth';
import { query } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
} from '@/lib/api-response';

export async function GET() {
  try {
    await requireAdmin();

    // Get all jobs with details
    const jobsResult = await query(
      `SELECT 
        j.*,
        u_h.email as homeowner_email,
        u_s.email as shoveler_email,
        s.display_name as shoveler_name,
        a.line1, a.city, a.postal_code
      FROM jobs j
      LEFT JOIN users u_h ON j.homeowner_id = u_h.id
      LEFT JOIN users u_s ON j.shoveler_id = u_s.id
      LEFT JOIN shovelers s ON j.shoveler_id = s.id
      LEFT JOIN addresses a ON j.address_id = a.id
      ORDER BY j.created_at DESC
      LIMIT 100`
    );

    // Get payouts summary
    const payoutsResult = await query(
      `SELECT 
        p.*,
        u.email as shoveler_email,
        s.display_name as shoveler_name
      FROM payouts p
      LEFT JOIN users u ON p.shoveler_id = u.id
      LEFT JOIN shovelers s ON p.shoveler_id = s.id
      ORDER BY p.created_at DESC
      LIMIT 100`
    );

    // Get revenue statistics
    const statsResult = await query(
      `SELECT 
        COUNT(*) as total_jobs,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_jobs,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN price_cents ELSE 0 END), 0) as total_revenue_cents,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN platform_fee_cents ELSE 0 END), 0) as platform_revenue_cents,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN payout_cents ELSE 0 END), 0) as total_payouts_cents
      FROM jobs`
    );

    return successResponse({
      jobs: jobsResult.rows,
      payouts: payoutsResult.rows,
      statistics: statsResult.rows[0],
    });
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    if (error.message.includes('Forbidden') || error.message.includes('admin')) {
      return errorResponse('Forbidden: admin access required', 403);
    }
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    return serverErrorResponse('Failed to fetch transactions');
  }
}

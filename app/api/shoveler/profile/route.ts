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

    // Get shoveler profile
    const shovelerResult = await query(
      'SELECT * FROM shovelers WHERE id = $1',
      [user.id]
    );

    if (shovelerResult.rows.length === 0) {
      return errorResponse('Shoveler profile not found', 404);
    }

    const shoveler = shovelerResult.rows[0];

    // Get total completed jobs
    const completedJobsResult = await query(
      `SELECT COUNT(*) as count
       FROM jobs
       WHERE shoveler_id = $1 AND status = 'completed'`,
      [user.id]
    );

    // Get total earnings (completed jobs)
    const earningsResult = await query(
      `SELECT COALESCE(SUM(payout_cents), 0) as total
       FROM jobs
       WHERE shoveler_id = $1 AND status = 'completed'`,
      [user.id]
    );

    // Get pending balance (payouts not yet processed)
    const pendingBalanceResult = await query(
      `SELECT COALESCE(SUM(amount_cents), 0) as total
       FROM payouts
       WHERE shoveler_id = $1 AND status IN ('pending', 'processing')`,
      [user.id]
    );

    // Get active houses count
    const activeHousesResult = await query(
      `SELECT COUNT(DISTINCT address_id) as count
       FROM jobs
       WHERE shoveler_id = $1 AND status IN ('claimed', 'in_progress')`,
      [user.id]
    );

    // Get recent jobs
    const recentJobsResult = await query(
      `SELECT j.*, a.line1, a.city, a.postal_code
       FROM jobs j
       LEFT JOIN addresses a ON j.address_id = a.id
       WHERE j.shoveler_id = $1
       ORDER BY j.created_at DESC
       LIMIT 10`,
      [user.id]
    );

    return successResponse({
      ...shoveler,
      total_completed_jobs: parseInt(completedJobsResult.rows[0].count, 10),
      total_earnings_cents: parseInt(earningsResult.rows[0].total, 10),
      pending_balance_cents: parseInt(pendingBalanceResult.rows[0].total, 10),
      active_houses_count: parseInt(activeHousesResult.rows[0].count, 10),
      recent_jobs: recentJobsResult.rows,
    });
  } catch (error: any) {
    console.error('Error fetching shoveler profile:', error);
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    return serverErrorResponse('Failed to fetch shoveler profile');
  }
}

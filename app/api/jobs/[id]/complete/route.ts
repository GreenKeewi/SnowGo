import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { query } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  forbiddenResponse,
} from '@/lib/api-response';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id: jobId } = await params;

    // Verify job belongs to shoveler and is in_progress
    const jobResult = await query(
      'SELECT * FROM jobs WHERE id = $1 AND shoveler_id = $2',
      [jobId, user.id]
    );

    if (jobResult.rows.length === 0) {
      return forbiddenResponse('Job not found or does not belong to you');
    }

    const job = jobResult.rows[0];

    if (job.status !== 'in_progress' && job.status !== 'claimed') {
      return forbiddenResponse(`Cannot complete job with status: ${job.status}`);
    }

    // Update job status to completed
    const updateResult = await query(
      `UPDATE jobs
       SET status = 'completed', completed_at = now()
       WHERE id = $1
       RETURNING *`,
      [jobId]
    );

    const completedJob = updateResult.rows[0];

    // Create payout record
    await query(
      `INSERT INTO payouts (shoveler_id, job_id, amount_cents, status)
       VALUES ($1, $2, $3, 'pending')`,
      [user.id, jobId, completedJob.payout_cents]
    );

    return successResponse(completedJob);
  } catch (error: any) {
    console.error('Error completing job:', error);
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    return serverErrorResponse('Failed to complete job');
  }
}

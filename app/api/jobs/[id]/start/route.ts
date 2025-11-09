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

    // Verify job belongs to shoveler and is claimed
    const jobResult = await query(
      'SELECT * FROM jobs WHERE id = $1 AND shoveler_id = $2',
      [jobId, user.id]
    );

    if (jobResult.rows.length === 0) {
      return forbiddenResponse('Job not found or does not belong to you');
    }

    const job = jobResult.rows[0];

    if (job.status !== 'claimed') {
      return forbiddenResponse(`Cannot start job with status: ${job.status}`);
    }

    // Update job status to in_progress
    const updateResult = await query(
      `UPDATE jobs
       SET status = 'in_progress', started_at = now()
       WHERE id = $1
       RETURNING *`,
      [jobId]
    );

    return successResponse(updateResult.rows[0]);
  } catch (error: any) {
    console.error('Error starting job:', error);
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    return serverErrorResponse('Failed to start job');
  }
}

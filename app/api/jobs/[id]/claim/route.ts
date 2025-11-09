import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { transaction } from '@/lib/db';
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

    // Use transaction to ensure atomicity
    const result = await transaction(async (client) => {
      // Get shoveler profile
      const shovelerResult = await client.query(
        'SELECT * FROM shovelers WHERE id = $1',
        [user.id]
      );

      const shoveler = shovelerResult.rows[0];
      if (!shoveler) {
        throw new Error('Shoveler profile not found. Please complete onboarding.');
      }

      if (!shoveler.active) {
        throw new Error('Shoveler account is not active');
      }

      // Check how many active houses the shoveler currently has
      const activeHousesResult = await client.query(
        `SELECT COUNT(DISTINCT address_id) as count
         FROM jobs
         WHERE shoveler_id = $1
           AND status IN ('claimed', 'in_progress')`,
        [user.id]
      );

      const activeHousesCount = parseInt(activeHousesResult.rows[0].count, 10);

      if (activeHousesCount >= shoveler.max_houses) {
        throw new Error(
          `Maximum houses limit reached (${shoveler.max_houses}). Complete or cancel existing jobs first.`
        );
      }

      // Check if job exists and is open
      const jobResult = await client.query(
        'SELECT * FROM jobs WHERE id = $1 FOR UPDATE',
        [jobId]
      );

      if (jobResult.rows.length === 0) {
        throw new Error('Job not found');
      }

      const job = jobResult.rows[0];

      if (job.status !== 'open') {
        throw new Error(`Job is not available (status: ${job.status})`);
      }

      // Claim the job
      const updateResult = await client.query(
        `UPDATE jobs
         SET shoveler_id = $1, status = 'claimed', claimed_at = now()
         WHERE id = $2
         RETURNING *`,
        [user.id, jobId]
      );

      return updateResult.rows[0];
    });

    return successResponse(result);
  } catch (error: any) {
    console.error('Error claiming job:', error);
    if (error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (
      error.message.includes('not found') ||
      error.message.includes('not available') ||
      error.message.includes('limit reached') ||
      error.message.includes('not active')
    ) {
      return forbiddenResponse(error.message);
    }
    return serverErrorResponse('Failed to claim job');
  }
}

import { auth, currentUser } from '@clerk/nextjs/server';
import { query } from './db';
import { User, UserRole } from './types';

export async function getCurrentUser(): Promise<User | null> {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  const result = await query('SELECT * FROM users WHERE clerk_id = $1', [userId]);
  return result.rows[0] || null;
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

export async function requireRole(role: UserRole): Promise<User> {
  const user = await requireUser();
  if (user.role !== role) {
    throw new Error(`Forbidden: requires ${role} role`);
  }
  return user;
}

export async function isAdmin(): Promise<boolean> {
  const user = await currentUser();
  if (!user) {
    return false;
  }
  return user.emailAddresses[0]?.emailAddress === process.env.ADMIN_EMAIL;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  const clerkUser = await currentUser();
  
  if (clerkUser?.emailAddresses[0]?.emailAddress !== process.env.ADMIN_EMAIL) {
    throw new Error('Forbidden: admin access required');
  }
  
  return user;
}

export async function createOrUpdateUser(
  clerkId: string,
  email: string,
  role: UserRole
): Promise<User> {
  const result = await query(
    `INSERT INTO users (clerk_id, email, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (clerk_id)
     DO UPDATE SET email = EXCLUDED.email, updated_at = now()
     RETURNING *`,
    [clerkId, email, role]
  );
  return result.rows[0];
}

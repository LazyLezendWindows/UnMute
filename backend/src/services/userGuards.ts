import { getDatabase } from '../config/database';
import { AppError } from '../middleware/errorHandler';

/** 404s unless `userId` is an active account. */
export async function assertActiveUser(userId: string): Promise<void> {
  const user = await getDatabase().get('SELECT id FROM users WHERE id = ? AND is_active = 1', [userId]);
  if (!user) {
    throw new AppError('User not found', 404);
  }
}

/** Target must be an active user with no block in either direction. */
export async function assertInteractable(actorId: string, targetId: string): Promise<void> {
  await assertActiveUser(targetId);
  const blocked = await getDatabase().get(
    'SELECT id FROM blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)',
    [actorId, targetId, targetId, actorId]
  );
  if (blocked) {
    throw new AppError('Action not allowed', 403);
  }
}

/** 404s unless `userId` exists (any status: deactivated accounts can still be blocked or reported). */
export async function assertUserExists(userId: string): Promise<void> {
  const user = await getDatabase().get('SELECT id FROM users WHERE id = ?', [userId]);
  if (!user) {
    throw new AppError('User not found', 404);
  }
}

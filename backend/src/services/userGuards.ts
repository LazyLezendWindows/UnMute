import { AppError } from '../middleware/errorHandler';
import { UserRepository } from '../repositories/userRepository';
import { SafetyRepository } from '../repositories/safetyRepository';

/** 404s unless `userId` is an active account. */
export async function assertActiveUser(userId: string): Promise<void> {
  if (!(await UserRepository.isActive(userId))) {
    throw new AppError('User not found', 404);
  }
}

/** 404s unless `userId` exists (any status: deactivated accounts can still be blocked or reported). */
export async function assertUserExists(userId: string): Promise<void> {
  if (!(await UserRepository.findById(userId))) {
    throw new AppError('User not found', 404);
  }
}

/** Target must be an active user with no block in either direction. */
export async function assertInteractable(actorId: string, targetId: string): Promise<void> {
  await assertActiveUser(targetId);
  if (await SafetyRepository.isBlockedBetween(actorId, targetId)) {
    throw new AppError('Action not allowed', 403);
  }
}

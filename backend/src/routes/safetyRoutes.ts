import { Router } from 'express';
import { SafetyController } from '../controllers/safetyController';
import { requireAuth } from '../middleware/auth';
import { validateBody, validateParams } from '../middleware/validate';
import { reportRateLimiter } from '../middleware/rateLimiter';
import { blockUserSchema, reportUserSchema, blockedUserParamsSchema } from '../validators/safetyValidator';

const router = Router();

router.use(requireAuth);

router.post('/block', validateBody(blockUserSchema), SafetyController.blockUser);
router.delete('/blocks/:userId', validateParams(blockedUserParamsSchema), SafetyController.unblockUser);
// Deprecated: DELETE with a JSON body (dropped by some proxies and clients). Kept for installed
// PWA builds that still call it; use DELETE /blocks/:userId.
router.delete('/block', validateBody(blockUserSchema), SafetyController.unblockUser);
router.get('/blocked', SafetyController.getBlockedUsers);
router.post('/reports', reportRateLimiter, validateBody(reportUserSchema), SafetyController.reportUser);

export default router;

import { Router } from 'express';
import { SafetyController } from '../controllers/safetyController';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { reportRateLimiter } from '../middleware/rateLimiter';
import { blockUserSchema, reportUserSchema } from '../validators/safetyValidator';

const router = Router();

router.use(requireAuth);

router.post('/block', validateBody(blockUserSchema), SafetyController.blockUser);
router.delete('/block', validateBody(blockUserSchema), SafetyController.unblockUser);
router.get('/blocked', SafetyController.getBlockedUsers);
router.post('/reports', reportRateLimiter, validateBody(reportUserSchema), SafetyController.reportUser);

export default router;

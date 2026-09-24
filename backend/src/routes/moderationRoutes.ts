import { Router } from 'express';
import { ModerationController } from '../controllers/moderationController';
import { requireAuth, requireRole } from '../middleware/auth';
import { validateBody, validateParams, validateQuery } from '../middleware/validate';
import { idParamsSchema } from '../validators/common';
import { reportDecisionSchema, reportListQuerySchema, suspendSchema, unsuspendSchema } from '../validators/moderationValidator';

const router = Router();

// Staff only; everyone else sees a 404 (see requireRole).
router.use(requireAuth, requireRole('moderator', 'admin'));

router.get('/reports', validateQuery(reportListQuerySchema), ModerationController.listReports);
router.get('/reports/:id', validateParams(idParamsSchema), ModerationController.getReport);
router.post('/reports/:id/decision', validateParams(idParamsSchema), validateBody(reportDecisionSchema), ModerationController.decideReport);
router.post('/users/:id/suspend', validateParams(idParamsSchema), validateBody(suspendSchema), ModerationController.suspend);
router.post('/users/:id/unsuspend', validateParams(idParamsSchema), validateBody(unsuspendSchema), ModerationController.unsuspend);

export default router;

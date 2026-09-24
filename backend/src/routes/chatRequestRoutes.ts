import { Router } from 'express';
import { ChatRequestController } from '../controllers/chatRequestController';
import { requireAuth } from '../middleware/auth';
import { validateBody, validateParams } from '../middleware/validate';
import { chatRequestRateLimiter } from '../middleware/rateLimiter';
import { idParamsSchema } from '../validators/common';
import { createChatRequestSchema } from '../validators/chatRequestValidator';

const router = Router();

router.use(requireAuth);

// Message someone: a request awaiting their approval, or straight into an existing chat.
router.post('/', chatRequestRateLimiter, validateBody(createChatRequestSchema), ChatRequestController.create);
router.get('/incoming', ChatRequestController.listIncoming);
router.get('/sent', ChatRequestController.listSent);
router.get('/:id', validateParams(idParamsSchema), ChatRequestController.get);
router.post('/:id/accept', validateParams(idParamsSchema), ChatRequestController.accept);
router.post('/:id/decline', validateParams(idParamsSchema), ChatRequestController.decline);
router.post('/:id/cancel', validateParams(idParamsSchema), ChatRequestController.cancel);

export default router;

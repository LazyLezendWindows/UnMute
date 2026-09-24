import { Router } from 'express';
import { ChatController } from '../controllers/chatController';
import { requireAuth } from '../middleware/auth';
import { validateBody, validateParams, validateQuery } from '../middleware/validate';
import { idParamsSchema } from '../validators/common';
import { messagePageSchema, sendMessageSchema } from '../validators/chatValidator';
import { messageRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.use(requireAuth);

router.get('/', ChatController.getConversations);
router.get(
  '/:id/messages',
  validateParams(idParamsSchema),
  validateQuery(messagePageSchema),
  ChatController.getMessages
);
router.post(
  '/:id/messages',
  messageRateLimiter,
  validateParams(idParamsSchema),
  validateBody(sendMessageSchema),
  ChatController.sendMessage
);

export default router;

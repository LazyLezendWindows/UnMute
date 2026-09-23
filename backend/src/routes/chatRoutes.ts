import { Router } from 'express';
import { ChatController } from '../controllers/chatController';
import { requireAuth } from '../middleware/auth';
import { validateBody, validateParams, validateQuery } from '../middleware/validate';
import { idParamsSchema, paginationSchema } from '../validators/common';
import { sendMessageSchema } from '../validators/chatValidator';

const router = Router();

router.use(requireAuth);

router.get('/', ChatController.getConversations);
router.get(
  '/:id/messages',
  validateParams(idParamsSchema),
  validateQuery(paginationSchema(50, 100)),
  ChatController.getMessages
);
router.post('/:id/messages', validateParams(idParamsSchema), validateBody(sendMessageSchema), ChatController.sendMessage);

export default router;

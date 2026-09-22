import { Router } from 'express';
import { ChatController } from '../controllers/chatController';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { sendMessageSchema } from '../validators/chatValidator';

const router = Router();

router.use(requireAuth);

router.get('/', ChatController.getConversations);
router.get('/:id/messages', ChatController.getMessages);
router.post('/:id/messages', validateBody(sendMessageSchema), ChatController.sendMessage);

export default router;

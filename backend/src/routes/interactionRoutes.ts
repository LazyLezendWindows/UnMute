import { Router } from 'express';
import { InteractionController } from '../controllers/interactionController';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { interactionSchema } from '../validators/interactionValidator';

const router = Router();

router.use(requireAuth);

router.post('/like', validateBody(interactionSchema), InteractionController.like);
router.post('/pass', validateBody(interactionSchema), InteractionController.pass);
// People who liked you and are waiting for your answer.
router.get('/incoming', InteractionController.incomingLikes);

export default router;

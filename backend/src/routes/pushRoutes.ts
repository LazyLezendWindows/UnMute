import { Router } from 'express';
import { PushController } from '../controllers/pushController';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { pushSubscriptionSchema } from '../validators/pushValidator';

const router = Router();

router.use(requireAuth);

router.get('/config', PushController.getConfig);
// One subscription per signed-in session (this device); PUT replaces it.
router.put('/subscription', validateBody(pushSubscriptionSchema), PushController.subscribe);
router.delete('/subscription', PushController.unsubscribe);

export default router;

import { Router } from 'express';
import { DiscoverController } from '../controllers/discoverController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', DiscoverController.getFeed);

export default router;

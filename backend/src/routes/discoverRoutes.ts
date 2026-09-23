import { Router } from 'express';
import { DiscoverController } from '../controllers/discoverController';
import { requireAuth } from '../middleware/auth';
import { validateQuery } from '../middleware/validate';
import { discoverQuerySchema } from '../validators/discoverValidator';

const router = Router();

router.use(requireAuth);

router.get('/', validateQuery(discoverQuerySchema), DiscoverController.getFeed);

export default router;

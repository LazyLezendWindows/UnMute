import { Router } from 'express';
import { DiscoverController } from '../controllers/discoverController';
import { requireAuth } from '../middleware/auth';
import { validateQuery } from '../middleware/validate';
import { paginationSchema } from '../validators/common';

const router = Router();

router.use(requireAuth);

router.get('/', validateQuery(paginationSchema(20, 50)), DiscoverController.getFeed);

export default router;

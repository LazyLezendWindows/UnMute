import { Router } from 'express';
import { MatchController } from '../controllers/matchController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', MatchController.getMatches);

export default router;

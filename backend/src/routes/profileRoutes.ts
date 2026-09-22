import { Router } from 'express';
import { ProfileController } from '../controllers/profileController';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { updateProfileSchema } from '../validators/profileValidator';

const router = Router();

router.use(requireAuth);

router.get('/me', ProfileController.getMyProfile);
router.patch('/me', validateBody(updateProfileSchema), ProfileController.updateMyProfile);
router.get('/interests', ProfileController.getInterests);

export default router;

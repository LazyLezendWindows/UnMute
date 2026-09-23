import { Router } from 'express';
import { ProfileController } from '../controllers/profileController';
import { LocationController } from '../controllers/locationController';
import { EducationController } from '../controllers/educationController';
import { requireAuth } from '../middleware/auth';
import { locationRateLimiter } from '../middleware/rateLimiter';
import { validateBody } from '../middleware/validate';
import { updateProfileSchema } from '../validators/profileValidator';
import { setLocationSchema, updatePrecisionSchema } from '../validators/locationValidator';
import { setEducationSchema } from '../validators/educationValidator';

const router = Router();

router.use(requireAuth);

router.get('/me', ProfileController.getMyProfile);
router.patch('/me', validateBody(updateProfileSchema), ProfileController.updateMyProfile);
router.get('/interests', ProfileController.getInterests);

router.put('/me/location', locationRateLimiter, validateBody(setLocationSchema), LocationController.setMyLocation);
router.patch('/me/location', validateBody(updatePrecisionSchema), LocationController.updateMyPrecision);
router.delete('/me/location', LocationController.clearMyLocation);

router.put('/me/education', validateBody(setEducationSchema), EducationController.setMyEducation);
router.delete('/me/education', EducationController.clearMyEducation);

export default router;

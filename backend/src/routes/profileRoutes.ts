import { Router } from 'express';
import { ProfileController } from '../controllers/profileController';
import { LocationController } from '../controllers/locationController';
import { EducationController } from '../controllers/educationController';
import { AccountController } from '../controllers/accountController';
import { PhotoController } from '../controllers/photoController';
import { requireAuth } from '../middleware/auth';
import { locationRateLimiter, photoRateLimiter } from '../middleware/rateLimiter';
import { validateBody } from '../middleware/validate';
import { updateProfileSchema, deleteAccountSchema, confirmPhotoSchema } from '../validators/profileValidator';
import { setLocationSchema, updatePrecisionSchema } from '../validators/locationValidator';
import { setEducationSchema } from '../validators/educationValidator';

const router = Router();

router.use(requireAuth);

router.get('/me', ProfileController.getMyProfile);
router.patch('/me', validateBody(updateProfileSchema), ProfileController.updateMyProfile);
router.get('/interests', ProfileController.getInterests);

// Profile photo: get a signed permission, upload straight to Cloudinary, then confirm it here.
router.post('/me/photo/upload', photoRateLimiter, PhotoController.createUpload);
router.put('/me/photo', validateBody(confirmPhotoSchema), PhotoController.confirmUpload);
router.delete('/me/photo', PhotoController.removePhoto);

router.get('/me/export', AccountController.exportData);
router.post('/me/deactivate', AccountController.deactivate);
router.delete('/me', validateBody(deleteAccountSchema), AccountController.deleteAccount);

router.put('/me/location', locationRateLimiter, validateBody(setLocationSchema), LocationController.setMyLocation);
router.patch('/me/location', validateBody(updatePrecisionSchema), LocationController.updateMyPrecision);
router.delete('/me/location', LocationController.clearMyLocation);

router.put('/me/education', validateBody(setEducationSchema), EducationController.setMyEducation);
router.delete('/me/education', EducationController.clearMyEducation);

export default router;

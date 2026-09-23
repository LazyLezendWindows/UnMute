import { Router } from 'express';
import { LocationController } from '../controllers/locationController';
import { requireAuth } from '../middleware/auth';
import { validateParams, validateQuery } from '../middleware/validate';
import { idParamsSchema } from '../validators/common';
import { pincodeParamsSchema, placeChildrenQuerySchema, placeSearchQuerySchema } from '../validators/locationValidator';

const router = Router();

router.use(requireAuth);

router.get('/states', LocationController.states);
router.get('/search', validateQuery(placeSearchQuerySchema), LocationController.search);
router.get('/pincodes/:pincode', validateParams(pincodeParamsSchema), LocationController.pincode);
router.get(
  '/:id/children',
  validateParams(idParamsSchema),
  validateQuery(placeChildrenQuerySchema),
  LocationController.children
);

export default router;

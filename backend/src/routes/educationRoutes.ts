import { Router } from 'express';
import { EducationController } from '../controllers/educationController';
import { requireAuth } from '../middleware/auth';
import { validateParams, validateQuery } from '../middleware/validate';
import { idParamsSchema } from '../validators/common';
import { institutionSearchQuerySchema } from '../validators/educationValidator';

const router = Router();

router.use(requireAuth);

router.get('/institutions', validateQuery(institutionSearchQuerySchema), EducationController.searchInstitutions);
router.get('/institutions/:id', validateParams(idParamsSchema), EducationController.getInstitution);

export default router;

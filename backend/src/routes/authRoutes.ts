import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { validateBody } from '../middleware/validate';
import { authRateLimiter } from '../middleware/rateLimiter';
import { requireAuth } from '../middleware/auth';
import { registerSchema, loginSchema } from '../validators/authValidator';

const router = Router();

router.post('/register', authRateLimiter, validateBody(registerSchema), AuthController.register);
router.post('/login', authRateLimiter, validateBody(loginSchema), AuthController.login);
router.post('/logout', AuthController.logout);
router.get('/me', requireAuth, AuthController.me);

export default router;

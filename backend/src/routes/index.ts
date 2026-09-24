import { Router } from 'express';
import authRoutes from './authRoutes';
import profileRoutes from './profileRoutes';
import discoverRoutes from './discoverRoutes';
import interactionRoutes from './interactionRoutes';
import matchRoutes from './matchRoutes';
import chatRoutes from './chatRoutes';
import chatRequestRoutes from './chatRequestRoutes';
import safetyRoutes from './safetyRoutes';
import locationRoutes from './locationRoutes';
import educationRoutes from './educationRoutes';
import moderationRoutes from './moderationRoutes';
import pushRoutes from './pushRoutes';

const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', profileRoutes);
apiRouter.use('/discover', discoverRoutes);
apiRouter.use('/interactions', interactionRoutes);
apiRouter.use('/matches', matchRoutes);
apiRouter.use('/conversations', chatRoutes);
apiRouter.use('/chat-requests', chatRequestRoutes);
apiRouter.use('/safety', safetyRoutes);
apiRouter.use('/locations', locationRoutes);
apiRouter.use('/education', educationRoutes);
apiRouter.use('/moderation', moderationRoutes);
apiRouter.use('/push', pushRoutes);

export default apiRouter;

import { Router } from 'express';
import authRoutes from './authRoutes';
import profileRoutes from './profileRoutes';
import discoverRoutes from './discoverRoutes';
import interactionRoutes from './interactionRoutes';
import matchRoutes from './matchRoutes';
import chatRoutes from './chatRoutes';
import safetyRoutes from './safetyRoutes';

const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', profileRoutes);
apiRouter.use('/discover', discoverRoutes);
apiRouter.use('/interactions', interactionRoutes);
apiRouter.use('/matches', matchRoutes);
apiRouter.use('/conversations', chatRoutes);
apiRouter.use('/safety', safetyRoutes);

export default apiRouter;

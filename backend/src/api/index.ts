import { Router } from 'express';
import { levelsRouter } from './levels.js';
import { eventsRouter } from './events.js';
import { alertsRouter } from './alerts.js';

export const apiRouter = Router();

apiRouter.use('/levels', levelsRouter);
apiRouter.use('/events', eventsRouter);
apiRouter.use('/alerts', alertsRouter);

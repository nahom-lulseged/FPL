import { Router } from 'express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import helmet from 'helmet';
import { env } from '../../../config/env';
import { getAllQueues } from '../../../jobs/queue';

export function createBullBoardRouter(): Router {
  const router = Router();

  if (!env.ENABLE_BULLMQ) {
    router.use((_req, res) => {
      res.status(503).json({ error: 'BullMQ is disabled' });
    });
    return router;
  }

  router.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
        },
      },
    }),
  );

  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  const queues = getAllQueues().map((queue) => new BullMQAdapter(queue));

  createBullBoard({
    queues,
    serverAdapter,
  });

  router.use('/', serverAdapter.getRouter());

  return router;
}

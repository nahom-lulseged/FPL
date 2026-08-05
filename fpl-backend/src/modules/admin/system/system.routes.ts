import { Router } from 'express';
import { adminGuard } from '../../../middleware/adminGuard';
import { resolveAccessToken } from '../../../middleware/authGuard';
import { validateQuery, validateRequest } from '../../../middleware/validateRequest';
import {
  getSystemHealth,
  getSystemLogs,
  getAlertConfigs,
  updateAlertConfigs,
  buildQueuesSessionCookie,
} from './system.service';
import { logsQuerySchema, updateAlertsSchema, type LogsQuery, type UpdateAlertsBody } from './system.validation';
import { notifyIngestionFailure } from './alert.service';

const router = Router();

router.get('/health', adminGuard, async (_req, res, next) => {
  try {
    const health = await getSystemHealth();
    res.status(200).json(health);
  } catch (err) {
    next(err);
  }
});

router.get(
  '/logs',
  adminGuard,
  validateQuery(logsQuerySchema),
  async (_req, res, next) => {
    try {
      const logs = getSystemLogs(res.locals.validatedQuery as LogsQuery);
      res.status(200).json({ logs });
    } catch (err) {
      next(err);
    }
  },
);

router.get('/alerts', adminGuard, async (_req, res, next) => {
  try {
    const configs = await getAlertConfigs();
    res.status(200).json({ configs });
  } catch (err) {
    next(err);
  }
});

router.put(
  '/alerts',
  adminGuard,
  validateRequest(updateAlertsSchema),
  async (req, res, next) => {
    try {
      const configs = await updateAlertConfigs(
        (req.body as UpdateAlertsBody).configs,
      );
      res.status(200).json({ configs });
    } catch (err) {
      next(err);
    }
  },
);

router.post('/alerts/test', adminGuard, async (_req, res, next) => {
  try {
    const sent = await notifyIngestionFailure('Test alert from admin panel');
    res.status(200).json({ sent });
  } catch (err) {
    next(err);
  }
});

router.post('/queues/session', adminGuard, (req, res) => {
  const token = resolveAccessToken(req);
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  res.setHeader('Set-Cookie', buildQueuesSessionCookie(token));
  res.status(200).json({ ok: true });
});

export default router;

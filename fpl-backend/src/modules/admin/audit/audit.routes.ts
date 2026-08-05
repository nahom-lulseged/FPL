import { Router } from 'express';
import { adminGuard } from '../../../middleware/adminGuard';
import { validateQuery } from '../../../middleware/validateRequest';
import * as auditService from './audit.service';
import {
  listAuditLogsQuerySchema,
  type ListAuditLogsQuery,
} from './audit.validation';

const router = Router();

router.get(
  '/',
  adminGuard,
  validateQuery(listAuditLogsQuerySchema),
  async (_req, res, next) => {
    try {
      const result = await auditService.listAuditLogs(
        res.locals.validatedQuery as ListAuditLogsQuery,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

export default router;

import { Router, Response, NextFunction } from 'express';
import { adminGuard } from '../../../middleware/adminGuard';
import {
  validateParams,
  validateQuery,
  validateRequest,
} from '../../../middleware/validateRequest';
import { captureAuditBefore } from '../audit/auditLogger';
import * as adminUsersService from './adminUsers.service';
import {
  confirmActionSchema,
  listUsersQuerySchema,
  suspendUserSchema,
  userIdParamSchema,
  type ConfirmActionBody,
  type ListUsersQuery,
  type SuspendUserBody,
  type UserIdParam,
} from './adminUsers.validation';

const router = Router();

router.get(
  '/',
  adminGuard,
  validateQuery(listUsersQuerySchema),
  async (_req, res, next) => {
    try {
      const result = await adminUsersService.listUsers(
        res.locals.validatedQuery as ListUsersQuery,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/:id',
  adminGuard,
  validateParams(userIdParamSchema),
  async (_req, res, next) => {
    try {
      const { id } = res.locals.validatedParams as UserIdParam;
      const user = await adminUsersService.getUserDetail(id);

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.status(200).json(user);
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/:id/suspend',
  adminGuard,
  validateParams(userIdParamSchema),
  captureAuditBefore({ loadBefore: adminUsersService.loadUserAuditBefore }),
  validateRequest(suspendUserSchema),
  async (req, res: Response, next: NextFunction) => {
    try {
      const { id } = res.locals.validatedParams as UserIdParam;
      const body = req.body as SuspendUserBody;
      const result = await adminUsersService.suspendUser(
        id,
        req.user!.userId,
        body,
        req.auditBefore as NonNullable<
          Awaited<ReturnType<typeof adminUsersService.loadUserAuditBefore>>
        >,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/:id/promote',
  adminGuard,
  validateParams(userIdParamSchema),
  captureAuditBefore({ loadBefore: adminUsersService.loadUserAuditBefore }),
  validateRequest(confirmActionSchema),
  async (req, res: Response, next: NextFunction) => {
    try {
      const { id } = res.locals.validatedParams as UserIdParam;
      const body = req.body as ConfirmActionBody;
      const result = await adminUsersService.promoteUser(
        id,
        req.user!.userId,
        body,
        req.auditBefore as NonNullable<
          Awaited<ReturnType<typeof adminUsersService.loadUserAuditBefore>>
        >,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/:id/reset-password',
  adminGuard,
  validateParams(userIdParamSchema),
  captureAuditBefore({ loadBefore: adminUsersService.loadUserAuditBefore }),
  async (req, res: Response, next: NextFunction) => {
    try {
      const { id } = res.locals.validatedParams as UserIdParam;
      const result = await adminUsersService.resetUserPassword(
        id,
        req.user!.userId,
        req.auditBefore as NonNullable<
          Awaited<ReturnType<typeof adminUsersService.loadUserAuditBefore>>
        >,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  '/:id',
  adminGuard,
  validateParams(userIdParamSchema),
  captureAuditBefore({ loadBefore: adminUsersService.loadUserAuditBefore }),
  validateRequest(confirmActionSchema),
  async (req, res: Response, next: NextFunction) => {
    try {
      const { id } = res.locals.validatedParams as UserIdParam;
      const body = req.body as ConfirmActionBody;
      const result = await adminUsersService.deleteUser(
        id,
        req.user!.userId,
        body,
        req.auditBefore as NonNullable<
          Awaited<ReturnType<typeof adminUsersService.loadUserAuditBefore>>
        >,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

export default router;

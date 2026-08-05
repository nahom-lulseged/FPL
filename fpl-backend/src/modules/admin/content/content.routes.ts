import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../../config/db';
import { adminGuard } from '../../../middleware/adminGuard';
import {
  validateParams,
  validateQuery,
  validateRequest,
} from '../../../middleware/validateRequest';
import { captureAuditBefore } from '../audit/auditLogger';
import * as contentService from './content.service';
import {
  idParamSchema,
  listAdminFixturesQuerySchema,
  listAdminGameweeksQuerySchema,
  listAdminPlayersQuerySchema,
  listAdminRealTeamsQuerySchema,
  updateFixtureSchema,
  updateGameweekSchema,
  updatePlayerSchema,
  updateRealTeamSchema,
  type IdParam,
  type ListAdminFixturesQuery,
  type ListAdminGameweeksQuery,
  type ListAdminPlayersQuery,
  type ListAdminRealTeamsQuery,
  type UpdateFixtureBody,
  type UpdateGameweekBody,
  type UpdatePlayerBody,
  type UpdateRealTeamBody,
} from './content.validation';

const router = Router();
const announcementSchema = z.object({
  title: z.string().trim().min(1).max(120),
  message: z.string().trim().min(1).max(2_000),
  actionUrl: z.string().trim().max(500).optional(),
  publishedAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
});
const notificationSchema = z.object({
  userId: z.string().optional(),
  type: z.enum(['DEADLINE', 'WALLET', 'LEAGUE', 'WINNER', 'SYSTEM']).default('SYSTEM'),
  title: z.string().trim().min(1).max(120),
  message: z.string().trim().min(1).max(2_000),
  actionUrl: z.string().trim().max(500).optional(),
});

router.get('/announcements', adminGuard, async (_req, res, next) => {
  try {
    res.status(200).json({ data: await prisma.announcement.findMany({ orderBy: { publishedAt: 'desc' } }) });
  } catch (error) { next(error); }
});

router.post('/announcements', adminGuard, async (req, res, next) => {
  try {
    const input = announcementSchema.parse(req.body);
    res.status(201).json(await prisma.announcement.create({ data: input }));
  } catch (error) { next(error); }
});

router.patch('/announcements/:id', adminGuard, async (req, res, next) => {
  try {
    const input = announcementSchema.partial().parse(req.body);
    res.status(200).json(await prisma.announcement.update({ where: { id: String(req.params.id) }, data: input }));
  } catch (error) { next(error); }
});

router.delete('/announcements/:id', adminGuard, async (req, res, next) => {
  try {
    await prisma.announcement.delete({ where: { id: String(req.params.id) } });
    res.status(204).send();
  } catch (error) { next(error); }
});

router.post('/notifications', adminGuard, async (req, res, next) => {
  try {
    const input = notificationSchema.parse(req.body);
    if (input.userId) {
      const notification = await prisma.notification.create({ data: input as Required<Pick<typeof input, 'userId' | 'type' | 'title' | 'message'>> & typeof input });
      res.status(201).json({ delivered: 1, notification });
      return;
    }
    const users = await prisma.user.findMany({ where: { isSuspended: false }, select: { id: true } });
    const result = await prisma.notification.createMany({ data: users.map((user) => ({ userId: user.id, type: input.type, title: input.title, message: input.message, actionUrl: input.actionUrl })) });
    res.status(201).json({ delivered: result.count });
  } catch (error) { next(error); }
});

router.get(
  '/players',
  adminGuard,
  validateQuery(listAdminPlayersQuerySchema),
  async (_req, res, next) => {
    try {
      const result = await contentService.listPlayers(
        res.locals.validatedQuery as ListAdminPlayersQuery,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/players/:id',
  adminGuard,
  validateParams(idParamSchema),
  async (_req, res, next) => {
    try {
      const { id } = res.locals.validatedParams as IdParam;
      const player = await contentService.getPlayerDetail(id);
      if (!player) {
        res.status(404).json({ error: 'Player not found' });
        return;
      }
      res.status(200).json(player);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/players/:id/sync-summary',
  adminGuard,
  validateParams(idParamSchema),
  async (_req, res, next) => {
    try {
      const { id } = res.locals.validatedParams as IdParam;
      const synced = await contentService.syncPlayerElementSummary(id);
      if (!synced) {
        res.status(404).json({ error: 'Player not found' });
        return;
      }
      res.status(200).json(synced);
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/players/:id',
  adminGuard,
  validateParams(idParamSchema),
  captureAuditBefore({ loadBefore: contentService.loadPlayerAuditBefore }),
  validateRequest(updatePlayerSchema),
  async (req, res: Response, next: NextFunction) => {
    try {
      const { id } = res.locals.validatedParams as IdParam;
      const body = req.body as UpdatePlayerBody;
      const player = await contentService.updatePlayer(
        id,
        req.user!.userId,
        body,
        req.auditBefore as NonNullable<
          Awaited<ReturnType<typeof contentService.loadPlayerAuditBefore>>
        >,
      );

      if (!player) {
        res.status(404).json({ error: 'Player not found' });
        return;
      }

      res.status(200).json(player);
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/real-teams',
  adminGuard,
  validateQuery(listAdminRealTeamsQuerySchema),
  async (_req, res, next) => {
    try {
      const result = await contentService.listRealTeams(
        res.locals.validatedQuery as ListAdminRealTeamsQuery,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/real-teams/:id',
  adminGuard,
  validateParams(idParamSchema),
  async (_req, res, next) => {
    try {
      const { id } = res.locals.validatedParams as IdParam;
      const team = await contentService.getRealTeam(id);

      if (!team) {
        res.status(404).json({ error: 'Real team not found' });
        return;
      }

      res.status(200).json(team);
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/real-teams/:id',
  adminGuard,
  validateParams(idParamSchema),
  captureAuditBefore({ loadBefore: contentService.loadRealTeamAuditBefore }),
  validateRequest(updateRealTeamSchema),
  async (req, res: Response, next: NextFunction) => {
    try {
      const { id } = res.locals.validatedParams as IdParam;
      const body = req.body as UpdateRealTeamBody;
      const team = await contentService.updateRealTeam(
        id,
        req.user!.userId,
        body,
        req.auditBefore as NonNullable<
          Awaited<ReturnType<typeof contentService.loadRealTeamAuditBefore>>
        >,
      );

      if (!team) {
        res.status(404).json({ error: 'Real team not found' });
        return;
      }

      res.status(200).json(team);
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/fixtures',
  adminGuard,
  validateQuery(listAdminFixturesQuerySchema),
  async (_req, res, next) => {
    try {
      const result = await contentService.listFixtures(
        res.locals.validatedQuery as ListAdminFixturesQuery,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/fixtures/:id',
  adminGuard,
  validateParams(idParamSchema),
  captureAuditBefore({ loadBefore: contentService.loadFixtureAuditBefore }),
  validateRequest(updateFixtureSchema),
  async (req, res: Response, next: NextFunction) => {
    try {
      const { id } = res.locals.validatedParams as IdParam;
      const body = req.body as UpdateFixtureBody;
      const fixture = await contentService.updateFixture(
        id,
        req.user!.userId,
        body,
        req.auditBefore as NonNullable<
          Awaited<ReturnType<typeof contentService.loadFixtureAuditBefore>>
        >,
      );

      if (!fixture) {
        res.status(404).json({ error: 'Fixture not found' });
        return;
      }

      res.status(200).json(fixture);
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/gameweeks',
  adminGuard,
  validateQuery(listAdminGameweeksQuerySchema),
  async (_req, res, next) => {
    try {
      const result = await contentService.listGameweeks(
        res.locals.validatedQuery as ListAdminGameweeksQuery,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/gameweeks/:id',
  adminGuard,
  validateParams(idParamSchema),
  captureAuditBefore({ loadBefore: contentService.loadGameweekAuditBefore }),
  validateRequest(updateGameweekSchema),
  async (req, res: Response, next: NextFunction) => {
    try {
      const { id } = res.locals.validatedParams as IdParam;
      const body = req.body as UpdateGameweekBody;
      const gameweek = await contentService.updateGameweek(
        id,
        req.user!.userId,
        body,
        req.auditBefore as NonNullable<
          Awaited<ReturnType<typeof contentService.loadGameweekAuditBefore>>
        >,
      );

      if (!gameweek) {
        res.status(404).json({ error: 'Gameweek not found' });
        return;
      }

      res.status(200).json(gameweek);
    } catch (err) {
      next(err);
    }
  },
);

export default router;

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { prisma } from './config/db';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { authGuard } from './middleware/authGuard';
import { adminGuard } from './middleware/adminGuard';
import authRoutes from './modules/auth/auth.routes';
import playersRoutes from './modules/players/players.routes';
import fixturesRoutes from './modules/fixtures/fixtures.routes';
import gameweeksRoutes from './modules/gameweeks/gameweeks.routes';
import realTeamsRoutes from './modules/realTeams/realTeams.routes';
import teamsRoutes from './modules/teams/teams.routes';
import leaguesRoutes from './modules/leagues/leagues.routes';
import walletRoutes from './modules/wallet/wallet.routes';
import paymentsRoutes from './modules/payments/payments.routes';
import kycRoutes from './modules/kyc/kyc.routes';
import stakedLeaguesRoutes from './modules/staked-leagues/stakedLeagues.routes';
import adminRoutes from './modules/admin/admin.routes';
import docsRoutes from './modules/docs/docs.routes';
import { adminRateLimiter } from './middleware/adminRateLimiter';
import { createBullBoardRouter } from './modules/admin/system/bullBoard';
import * as teamsController from './modules/teams/teams.controller';
import { getMyTeamQuerySchema } from './modules/teams/teams.validation';
import { validateQuery } from './middleware/validateRequest';
import telegramRoutes from './modules/telegram/telegram.routes';
import experienceRoutes from './modules/experience/experience.routes';
import fplCatalogRoutes from './modules/fplCatalog/fplCatalog.routes';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/fpl', fplCatalogRoutes);
app.use('/api', experienceRoutes);
app.use('/api', docsRoutes);
app.use('/api/players', playersRoutes);
app.use('/api/real-teams', realTeamsRoutes);
app.use('/api/fixtures', fixturesRoutes);
app.use('/api/gameweeks', gameweeksRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/leagues', leaguesRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/staked-leagues', stakedLeaguesRoutes);
app.use('/admin/queues', adminGuard, createBullBoardRouter());
app.use('/api/admin', adminRateLimiter, adminRoutes);

app.get('/api/me', authGuard, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        phoneE164: true,
        contactSharedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
});

app.get(
  '/api/me/team',
  authGuard,
  validateQuery(getMyTeamQuerySchema),
  teamsController.getMyTeam,
);

app.use(errorHandler);

export default app;

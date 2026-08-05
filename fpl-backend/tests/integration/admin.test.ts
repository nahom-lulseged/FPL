import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/config/db';
import { redis } from '../../src/config/redis';
import * as fplClient from '../../src/modules/ingestion/fpl.client';
import * as ingestionService from '../../src/modules/ingestion/ingestion.service';
import {
  __setSyncInProgressForTests,
} from '../../src/modules/ingestion/ingestion.routes';
import { recordIngestionSync } from '../../src/modules/ingestion/ingestion.status';
import { createTestSession } from '../helpers/auth';

const testUser = {
  email: 'admin-test@example.com',
  password: 'password123',
  name: 'Admin Test',
};

async function clearRedisKeys(): Promise<void> {
  const keys = await redis.keys('refresh:*');
  if (keys.length > 0) {
    await redis.del(...keys);
  }
  await redis.del('ingestion:lastSync');
}

async function getAdminToken(): Promise<string> {
  const session = await createTestSession({
    email: testUser.email,
    name: testUser.name,
    role: 'ADMIN',
    aal: 'aal2',
  });
  return session.token;
}

async function getUserToken(email = testUser.email): Promise<string> {
  const session = await createTestSession({
    email,
    name: 'Regular Test User',
  });
  return session.token;
}

describe('admin routes', () => {
  beforeEach(async () => {
    await prisma.auditLog.deleteMany();
    await prisma.syncLog.deleteMany();
    await prisma.player.deleteMany();
    await prisma.realTeam.deleteMany();
    await prisma.fixture.deleteMany();
    await prisma.user.deleteMany();
    await prisma.team.deleteMany();
    await prisma.league.deleteMany();
    await prisma.gameweek.deleteMany();
    await clearRedisKeys();
    __setSyncInProgressForTests(false);
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await prisma.$disconnect();
    await redis.quit();
  });

  describe('access control', () => {
    it('returns 401 for /api/admin/health without a token', async () => {
      const res = await request(app).get('/api/admin/health');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('returns 403 for /api/admin/health with non-admin token', async () => {
      const session = await createTestSession({
        email: testUser.email,
        name: testUser.name,
      });

      const res = await request(app)
        .get('/api/admin/health')
        .set(session.authHeader);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
    });

    it('returns 200 for /api/admin/health with admin token', async () => {
      const token = await getAdminToken();

      const res = await request(app)
        .get('/api/admin/health')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok', role: 'admin' });
    });
  });

  describe('dashboard summary', () => {
    it('returns 401 without a token', async () => {
      const res = await request(app).get('/api/admin/dashboard/summary');
      expect(res.status).toBe(401);
    });

    it('returns 403 with non-admin token', async () => {
      const token = await getUserToken();

      const res = await request(app)
        .get('/api/admin/dashboard/summary')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('returns summary with admin token', async () => {
      const token = await getAdminToken();

      await prisma.gameweek.create({
        data: {
          number: 1,
          deadline: new Date('2026-08-15T11:00:00.000Z'),
          isCurrent: true,
          status: 'UPCOMING',
        },
      });

      await recordIngestionSync(true);

      const res = await request(app)
        .get('/api/admin/dashboard/summary')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        totalUsers: 1,
        totalTeams: 0,
        activeLeagues: 0,
        dbConnectionOk: true,
        redisConnectionOk: true,
      });
      expect(res.body.currentGameweek).toMatchObject({
        number: 1,
        isCurrent: true,
      });
      expect(res.body.lastIngestionSync.success).toBe(true);
      expect(res.body.lastIngestionSync.timestamp).toBeTruthy();
    });
  });

  describe('dashboard overview', () => {
    it('returns 401 without a token', async () => {
      const res = await request(app).get('/api/admin/dashboard/overview');
      expect(res.status).toBe(401);
    });

    it('returns a real-data overview with safe empty collections', async () => {
      const token = await getAdminToken();

      await prisma.gameweek.create({
        data: {
          number: 2,
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          isCurrent: true,
          status: 'UPCOMING',
        },
      });

      const res = await request(app)
        .get('/api/admin/dashboard/overview')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.currentGameweek.number).toBe(2);
      expect(res.body.kpis.totalUsers.value).toBe(1);
      expect(res.body.kpis.revenue).toMatchObject({ valueMinor: 0, currency: 'ETB' });
      expect(res.body.featuredFixture).toBeNull();
      expect(res.body.topPlayers).toEqual([]);
      expect(res.body.recentTransfers).toEqual([]);
      expect(res.body.trend).toHaveLength(30);
      expect(res.body.system).toMatchObject({ dbOk: true, redisOk: true });
    });
  });

  describe('ingestion endpoints', () => {
    it('returns 401 for ingestion status without a token', async () => {
      const res = await request(app).get('/api/admin/ingestion/status');
      expect(res.status).toBe(401);
    });

    it('returns ingestion status with admin token', async () => {
      const token = await getAdminToken();
      await recordIngestionSync(true);

      const res = await request(app)
        .get('/api/admin/ingestion/status')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.lastSyncAt).toBeTruthy();
      expect(res.body.success).toBe(true);
      expect(res.body.error).toBeNull();
    });

    it('returns 403 for manual sync with non-admin token', async () => {
      const token = await getUserToken();

      const res = await request(app)
        .post('/api/admin/ingestion/sync')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('triggers manual sync with admin token', async () => {
      const token = await getAdminToken();
      const syncSpy = jest.spyOn(ingestionService, 'syncAll').mockResolvedValue({
        created: 1,
        updated: 2,
        skipped: 3,
      });

      const res = await request(app)
        .post('/api/admin/ingestion/sync')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.result).toEqual({ created: 1, updated: 2, skipped: 3 });
      expect(syncSpy).toHaveBeenCalledTimes(1);

      syncSpy.mockRestore();
    });

    it('returns 401 for sync history without a token', async () => {
      const res = await request(app).get('/api/admin/ingestion/history');
      expect(res.status).toBe(401);
    });

    it('returns 403 for sync history with non-admin token', async () => {
      const token = await getUserToken();

      const res = await request(app)
        .get('/api/admin/ingestion/history')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('returns sync history newest first with admin token', async () => {
      const token = await getAdminToken();
      const older = new Date('2026-01-01T10:00:00.000Z');
      const newer = new Date('2026-01-02T10:00:00.000Z');

      await prisma.syncLog.createMany({
        data: [
          {
            syncType: 'TEAMS',
            startedAt: older,
            finishedAt: older,
            success: true,
            rowsChanged: 5,
          },
          {
            syncType: 'PLAYERS',
            startedAt: newer,
            finishedAt: newer,
            success: false,
            rowsChanged: 0,
            errorMessage: 'Test failure',
          },
        ],
      });

      const res = await request(app)
        .get('/api/admin/ingestion/history')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].syncType).toBe('PLAYERS');
      expect(res.body.data[1].syncType).toBe('TEAMS');
      expect(res.body.meta.total).toBe(2);
    });

    it('filters sync history by syncType and success', async () => {
      const token = await getAdminToken();

      await prisma.syncLog.createMany({
        data: [
          {
            syncType: 'TEAMS',
            startedAt: new Date(),
            finishedAt: new Date(),
            success: true,
            rowsChanged: 1,
          },
          {
            syncType: 'TEAMS',
            startedAt: new Date(),
            finishedAt: new Date(),
            success: false,
            rowsChanged: 0,
            errorMessage: 'fail',
          },
          {
            syncType: 'PLAYERS',
            startedAt: new Date(),
            finishedAt: new Date(),
            success: true,
            rowsChanged: 10,
          },
        ],
      });

      const res = await request(app)
        .get('/api/admin/ingestion/history?syncType=TEAMS&success=false')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].syncType).toBe('TEAMS');
      expect(res.body.data[0].success).toBe(false);
      expect(res.body.data[0].errorMessage).toBe('fail');
    });

    it('returns 403 for individual sync with non-admin token', async () => {
      const token = await getUserToken();

      const res = await request(app)
        .post('/api/admin/ingestion/sync/teams')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('triggers individual teams sync with admin token', async () => {
      const token = await getAdminToken();
      const syncSpy = jest.spyOn(ingestionService, 'syncRealTeams').mockResolvedValue({
        created: 2,
        updated: 0,
        skipped: 0,
      });

      const res = await request(app)
        .post('/api/admin/ingestion/sync/teams')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.result).toEqual({ created: 2, updated: 0, skipped: 0 });
      expect(syncSpy).toHaveBeenCalledTimes(1);

      syncSpy.mockRestore();
    });

    it('returns 400 for invalid sync type param', async () => {
      const token = await getAdminToken();

      const res = await request(app)
        .post('/api/admin/ingestion/sync/invalid')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
    });

    it('returns 409 when sync already in progress', async () => {
      const token = await getAdminToken();
      __setSyncInProgressForTests(true);

      const res = await request(app)
        .post('/api/admin/ingestion/sync/teams')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Sync already in progress');
    });
  });

  describe('content player override', () => {
    async function createTestPlayer(overrides?: {
      price?: number;
      isAvailable?: boolean;
      isManualOverride?: boolean;
      fplId?: number;
    }) {
      const team = await prisma.realTeam.create({
        data: {
          fplId: 1,
          name: 'Arsenal',
          nameLower: 'arsenal',
          shortName: 'ARS',
          shortNameLower: 'ars',
        },
      });

      return prisma.player.create({
        data: {
          fplId: overrides?.fplId ?? 100,
          name: 'Test Player',
          nameLower: 'test player',
          position: 'MID',
          price: overrides?.price ?? 80,
          realTeamId: team.id,
          isAvailable: overrides?.isAvailable ?? true,
          isManualOverride: overrides?.isManualOverride ?? false,
        },
      });
    }

    it('returns 401 without a token', async () => {
      const res = await request(app).patch('/api/admin/content/players/some-id').send({ price: 90 });
      expect(res.status).toBe(401);
    });

    it('returns 403 with non-admin token', async () => {
      const token = await getUserToken();

      const res = await request(app)
        .patch('/api/admin/content/players/some-id')
        .set('Authorization', `Bearer ${token}`)
        .send({ price: 90 });

      expect(res.status).toBe(403);
    });

    it('updates player override fields with admin token', async () => {
      const token = await getAdminToken();
      const player = await createTestPlayer();

      const admin = await prisma.user.findFirst({ where: { email: testUser.email } });

      const res = await request(app)
        .patch(`/api/admin/content/players/${player.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ price: 120, isAvailable: false, injuryNote: 'Knee injury' });

      expect(res.status).toBe(200);
      expect(res.body.price).toBe(120);
      expect(res.body.isAvailable).toBe(false);
      expect(res.body.injuryNote).toBe('Knee injury');
      expect(res.body.isManualOverride).toBe(true);

      const audit = await prisma.auditLog.findFirst({
        where: { action: 'PLAYER_UPDATE', targetId: player.id, adminId: admin!.id },
      });
      expect(audit).not.toBeNull();
      expect(audit?.beforeJson).toMatchObject({ price: 80 });
      expect(audit?.afterJson).toMatchObject({ price: 120, isAvailable: false });
    });

    it('preserves overridden fields after players sync', async () => {
      const token = await getAdminToken();
      const player = await createTestPlayer({ price: 120, isManualOverride: true, fplId: 42 });

      jest.spyOn(fplClient, 'fetchBootstrapStatic').mockResolvedValue({
        teams: [{ id: 1, name: 'Arsenal', short_name: 'ARS' }],
        elements: [
          {
            id: 42,
            web_name: 'Test Player',
            first_name: 'Test',
            second_name: 'Player',
            element_type: 3,
            team: 1,
            now_cost: 55,
            status: 'a',
            total_points: 0,
            event_points: 0,
            selected_by_percent: '0.0',
            minutes: 0,
            goals_scored: 0,
            assists: 0,
            clean_sheets: 0,
            goals_conceded: 0,
            own_goals: 0,
            penalties_saved: 0,
          },
        ],
        events: [],
      });

      const syncRes = await request(app)
        .post('/api/admin/ingestion/sync/players')
        .set('Authorization', `Bearer ${token}`);

      expect(syncRes.status).toBe(200);

      const updated = await prisma.player.findUnique({ where: { id: player.id } });
      expect(updated?.price).toBe(120);
      expect(updated?.isManualOverride).toBe(true);

      jest.restoreAllMocks();
    });
  });
});

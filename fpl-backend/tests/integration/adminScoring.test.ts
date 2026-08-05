import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/config/db';
import { redis } from '../../src/config/redis';
import { scoreGameweek } from '../../src/modules/scoring/scoring.job';
import {
  buildValidSquadPlayerIds,
  clearPhase3Data,
  seedGameweekWithStats,
  seedPhase3Data,
} from '../helpers/seedTestData';
import { createTestSession } from '../helpers/auth';

const adminUser = {
  email: 'admin-scoring@example.com',
  password: 'password123',
  name: 'Admin Scoring',
};

const regularUser = {
  email: 'scoring-user@example.com',
  password: 'password123',
  name: 'Scoring User',
};

async function clearRedisKeys(): Promise<void> {
  const keys = await redis.keys('refresh:*');
  if (keys.length > 0) {
    await redis.del(...keys);
  }
  const previewKeys = await redis.keys('scoring:preview:*');
  if (previewKeys.length > 0) {
    await redis.del(...previewKeys);
  }
}

async function getAdminAuth(): Promise<{ token: string; adminId: string }> {
  const session = await createTestSession({
    email: adminUser.email,
    name: adminUser.name,
    role: 'ADMIN',
    aal: 'aal2',
  });

  return {
    token: session.token,
    adminId: session.user.id,
  };
}

async function createScoredTeam(gw2Id: string) {
  const session = await createTestSession({
    email: regularUser.email,
    name: regularUser.name,
  });
  const token = session.token;

  const allPlayers = await prisma.player.findMany();
  const validPlayerIds = buildValidSquadPlayerIds(allPlayers);

  const createRes = await request(app)
    .post('/api/teams')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Scoring FC',
      season: '2025/26',
      playerIds: validPlayerIds,
    });

  const teamId = createRes.body.id as string;
  const captain = createRes.body.squad.find(
    (s: { isCaptain: boolean }) => s.isCaptain,
  );

  await seedGameweekWithStats(
    prisma,
    gw2Id,
    createRes.body.squad.map(
      (s: { playerId: string; isStarter: boolean }) => ({
        playerId: s.playerId,
        minutes: s.isStarter ? 90 : 0,
        points: s.isStarter ? 2 : 0,
      }),
    ),
  );

  await prisma.playerGameweekStats.update({
    where: {
      playerId_gameweekId: {
        playerId: captain.playerId,
        gameweekId: gw2Id,
      },
    },
    data: { points: 10, minutes: 90, goals: 0 },
  });

  await scoreGameweek(2);

  const teamScore = await prisma.teamGameweekScore.findUnique({
    where: {
      teamId_gameweekId: { teamId, gameweekId: gw2Id },
    },
  });

  return {
    teamId,
    captainPlayerId: captain.playerId as string,
    token,
    initialTotalPoints: teamScore?.totalPoints ?? 0,
  };
}

describe('admin scoring routes', () => {
  let adminToken: string;
  let gw2Id: string;

  beforeEach(async () => {
    await clearPhase3Data(prisma);
    await prisma.user.deleteMany();
    await clearRedisKeys();

    const seed = await seedPhase3Data(prisma);
    gw2Id = seed.gw2.id;

    const auth = await getAdminAuth();
    adminToken = auth.token;
  });

  afterAll(async () => {
    await clearPhase3Data(prisma);
    await prisma.user.deleteMany();
    await prisma.$disconnect();
    await redis.quit();
  });

  describe('access control', () => {
    it('returns 401 without admin token', async () => {
      const res = await request(app).get(`/api/admin/scoring/recalculate/${gw2Id}/preview`);
      expect(res.status).toBe(401);
    });
  });

  describe('recalculate preview/commit', () => {
    it('preview returns diffs without persisting changes', async () => {
      const { teamId, initialTotalPoints } = await createScoredTeam(gw2Id);

      await prisma.playerGameweekStats.updateMany({
        where: { gameweekId: gw2Id },
        data: { points: 5 },
      });

      const previewRes = await request(app)
        .get(`/api/admin/scoring/recalculate/${gw2Id}/preview`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(previewRes.status).toBe(200);
      expect(previewRes.body.previewToken).toBeDefined();
      expect(previewRes.body.diffs.length).toBeGreaterThan(0);

      const afterPreview = await prisma.teamGameweekScore.findUnique({
        where: { teamId_gameweekId: { teamId, gameweekId: gw2Id } },
      });
      expect(afterPreview?.totalPoints).toBe(initialTotalPoints);

      const logCount = await prisma.recalculationLog.count();
      expect(logCount).toBe(0);
    });

    it('rejects commit without preview token', async () => {
      await createScoredTeam(gw2Id);

      const res = await request(app)
        .post(`/api/admin/scoring/recalculate/${gw2Id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ previewToken: '00000000-0000-4000-8000-000000000000', reason: 'Test' });

      expect(res.status).toBe(409);
    });

    it('commit persists scores and creates audit + recalculation log', async () => {
      const { teamId } = await createScoredTeam(gw2Id);

      await prisma.playerGameweekStats.updateMany({
        where: { gameweekId: gw2Id },
        data: { points: 1, minutes: 90 },
      });

      const previewRes = await request(app)
        .get(`/api/admin/scoring/recalculate/${gw2Id}/preview`)
        .set('Authorization', `Bearer ${adminToken}`);

      const commitRes = await request(app)
        .post(`/api/admin/scoring/recalculate/${gw2Id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          previewToken: previewRes.body.previewToken,
          reason: 'Official bonus adjustment',
        });

      expect(commitRes.status).toBe(200);

      const teamScore = await prisma.teamGameweekScore.findUnique({
        where: { teamId_gameweekId: { teamId, gameweekId: gw2Id } },
      });
      expect(teamScore?.totalPoints).toBe(previewRes.body.diffs[0].newPoints);

      const recalcLog = await prisma.recalculationLog.findFirst({
        where: { gameweekId: gw2Id, type: 'FULL_RECALC' },
      });
      expect(recalcLog).not.toBeNull();
      expect(recalcLog?.reason).toBe('Official bonus adjustment');

      const audit = await prisma.auditLog.findFirst({
        where: { targetType: 'Scoring', action: 'RECALCULATE_COMMIT' },
      });
      expect(audit).not.toBeNull();
      expect(audit?.afterJson).toMatchObject({
        reason: 'Official bonus adjustment',
      });
    });

    it('rejects second commit with consumed preview token', async () => {
      await createScoredTeam(gw2Id);

      const previewRes = await request(app)
        .get(`/api/admin/scoring/recalculate/${gw2Id}/preview`)
        .set('Authorization', `Bearer ${adminToken}`);

      const body = {
        previewToken: previewRes.body.previewToken,
        reason: 'First commit',
      };

      const first = await request(app)
        .post(`/api/admin/scoring/recalculate/${gw2Id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(body);
      expect(first.status).toBe(200);

      const second = await request(app)
        .post(`/api/admin/scoring/recalculate/${gw2Id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(body);
      expect(second.status).toBe(409);
    });
  });

  describe('correction preview/commit', () => {
    it('preview shows cascade to teams with the player', async () => {
      const { captainPlayerId, teamId } = await createScoredTeam(gw2Id);

      const previewRes = await request(app)
        .post('/api/admin/scoring/correct/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          playerId: captainPlayerId,
          gameweekId: gw2Id,
          statType: 'goals',
          newValue: 2,
        });

      expect(previewRes.status).toBe(200);
      expect(previewRes.body.previewToken).toBeDefined();
      expect(previewRes.body.correction.newPlayerPoints).toBeGreaterThan(
        previewRes.body.correction.oldPlayerPoints,
      );

      const teamDiff = previewRes.body.diffs.find(
        (d: { teamId: string }) => d.teamId === teamId,
      );
      expect(teamDiff).toBeDefined();
      expect(teamDiff.delta).not.toBe(0);

      const playerStats = await prisma.playerGameweekStats.findUnique({
        where: {
          playerId_gameweekId: { playerId: captainPlayerId, gameweekId: gw2Id },
        },
      });
      expect(playerStats?.goals).toBe(0);
    });

    it('commit cascades correction to all affected teams', async () => {
      const { captainPlayerId, teamId } = await createScoredTeam(gw2Id);

      const previewRes = await request(app)
        .post('/api/admin/scoring/correct/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          playerId: captainPlayerId,
          gameweekId: gw2Id,
          statType: 'goals',
          newValue: 1,
        });

      const commitRes = await request(app)
        .post('/api/admin/scoring/correct')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          previewToken: previewRes.body.previewToken,
          reason: 'VAR awarded goal',
        });

      expect(commitRes.status).toBe(200);

      const playerStats = await prisma.playerGameweekStats.findUnique({
        where: {
          playerId_gameweekId: { playerId: captainPlayerId, gameweekId: gw2Id },
        },
      });
      expect(playerStats?.goals).toBe(1);

      const teamScore = await prisma.teamGameweekScore.findUnique({
        where: { teamId_gameweekId: { teamId, gameweekId: gw2Id } },
      });
      expect(teamScore?.totalPoints).toBe(previewRes.body.diffs[0].newPoints);

      const recalcLog = await prisma.recalculationLog.findFirst({
        where: { type: 'CORRECTION' },
      });
      expect(recalcLog?.reason).toBe('VAR awarded goal');

      const audit = await prisma.auditLog.findFirst({
        where: { action: 'CORRECTION_COMMIT', targetType: 'Scoring' },
      });
      expect(audit?.afterJson).toMatchObject({ reason: 'VAR awarded goal' });
    });
  });

  describe('recalculation history', () => {
    it('lists past recalculation events', async () => {
      await createScoredTeam(gw2Id);

      const previewRes = await request(app)
        .get(`/api/admin/scoring/recalculate/${gw2Id}/preview`)
        .set('Authorization', `Bearer ${adminToken}`);

      await request(app)
        .post(`/api/admin/scoring/recalculate/${gw2Id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          previewToken: previewRes.body.previewToken,
          reason: 'History test',
        });

      const historyRes = await request(app)
        .get('/api/admin/scoring/recalculation-history')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(historyRes.status).toBe(200);
      expect(historyRes.body.data.length).toBe(1);
      expect(historyRes.body.data[0].reason).toBe('History test');

      const detailRes = await request(app)
        .get(`/api/admin/scoring/recalculation-history/${historyRes.body.data[0].id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(detailRes.status).toBe(200);
      expect(detailRes.body.diffs.length).toBeGreaterThan(0);
    });
  });
});

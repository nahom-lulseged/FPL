import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/config/db';
import { redis } from '../../src/config/redis';
import { CACHE_PREFIX } from '../../src/lib/cache';
import * as scoringJob from '../../src/modules/scoring/scoring.job';
import { createTestSession } from '../helpers/auth';

const adminUser = {
  email: 'admin-content@example.com',
  password: 'password123',
  name: 'Admin Content',
};

async function clearRedisKeys(): Promise<void> {
  const keys = await redis.keys('refresh:*');
  if (keys.length > 0) {
    await redis.del(...keys);
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

async function seedContentData() {
  const homeTeam = await prisma.realTeam.create({
    data: {
      fplId: 1,
      name: 'Arsenal',
      nameLower: 'arsenal',
      shortName: 'ARS',
      shortNameLower: 'ars',
    },
  });
  const awayTeam = await prisma.realTeam.create({
    data: {
      fplId: 2,
      name: 'Chelsea',
      nameLower: 'chelsea',
      shortName: 'CHE',
      shortNameLower: 'che',
    },
  });
  const gameweek = await prisma.gameweek.create({
    data: {
      number: 1,
      deadline: new Date('2026-08-15T11:00:00.000Z'),
      status: 'UPCOMING',
      isCurrent: true,
    },
  });
  const player = await prisma.player.create({
    data: {
      fplId: 100,
      name: 'Test Player',
      nameLower: 'test player',
      position: 'MID',
      price: 80,
      realTeamId: homeTeam.id,
      isAvailable: true,
    },
  });
  const fixture = await prisma.fixture.create({
    data: {
      fplId: 200,
      gameweekId: gameweek.id,
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      kickoffTime: new Date('2026-08-16T14:00:00.000Z'),
      finished: false,
      isPostponed: false,
    },
  });

  return { homeTeam, awayTeam, gameweek, player, fixture };
}

describe('admin content routes', () => {
  beforeEach(async () => {
    await prisma.auditLog.deleteMany();
    await prisma.player.deleteMany();
    await prisma.fixture.deleteMany();
    await prisma.gameweek.deleteMany();
    await prisma.realTeam.deleteMany();
    await prisma.user.deleteMany();
    await clearRedisKeys();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await redis.quit();
  });

  describe('access control', () => {
    it('returns 401 for PATCH without token', async () => {
      const res = await request(app)
        .patch('/api/admin/content/players/some-id')
        .send({ price: 90 });
      expect(res.status).toBe(401);
    });

    it('returns 403 for PATCH with non-admin token', async () => {
      const session = await createTestSession({
        email: 'user@example.com',
        name: 'User',
      });

      const res = await request(app)
        .patch('/api/admin/content/players/some-id')
        .set(session.authHeader)
        .send({ price: 90 });

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /players/:id', () => {
    it('updates player and writes audit log with before/after diff', async () => {
      const { token, adminId } = await getAdminAuth();
      const { player } = await seedContentData();

      const res = await request(app)
        .patch(`/api/admin/content/players/${player.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Player', price: 120, isAvailable: false, injuryNote: 'Knee' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Player');
      expect(res.body.price).toBe(120);
      expect(res.body.isManualOverride).toBe(true);

      const audit = await prisma.auditLog.findFirst({
        where: { action: 'PLAYER_UPDATE', targetId: player.id, adminId },
      });
      expect(audit).not.toBeNull();
      expect(audit?.targetType).toBe('Player');
      expect(audit?.beforeJson).toMatchObject({ name: 'Test Player', price: 80 });
      expect(audit?.afterJson).toMatchObject({
        name: 'Updated Player',
        price: 120,
        isAvailable: false,
      });
    });

    it('clears players:list:* Redis cache after update', async () => {
      const { token } = await getAdminAuth();
      const { player } = await seedContentData();
      const cacheKey = `${CACHE_PREFIX.players}:admintest`;

      await redis.set(cacheKey, JSON.stringify({ cached: true }));

      const res = await request(app)
        .patch(`/api/admin/content/players/${player.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ price: 90 });

      expect(res.status).toBe(200);
      expect(await redis.get(cacheKey)).toBeNull();
    });
  });

  describe('PATCH /real-teams/:id', () => {
    it('updates real team and writes audit log', async () => {
      const { token, adminId } = await getAdminAuth();
      const { homeTeam } = await seedContentData();

      const res = await request(app)
        .patch(`/api/admin/content/real-teams/${homeTeam.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          shortName: 'GUN',
          crestUrl: 'https://example.com/crest.png',
        });

      expect(res.status).toBe(200);
      expect(res.body.shortName).toBe('GUN');
      expect(res.body.crestUrl).toBe('https://example.com/crest.png');
      expect(res.body.isManualOverride).toBe(true);

      const audit = await prisma.auditLog.findFirst({
        where: { action: 'REAL_TEAM_UPDATE', targetId: homeTeam.id, adminId },
      });
      expect(audit).not.toBeNull();
      expect(audit?.beforeJson).toMatchObject({ shortName: 'ARS' });
      expect(audit?.afterJson).toMatchObject({
        shortName: 'GUN',
        crestUrl: 'https://example.com/crest.png',
      });
    });
  });

  describe('PATCH /fixtures/:id', () => {
    it('updates fixture and writes audit log', async () => {
      const { token, adminId } = await getAdminAuth();
      const { fixture } = await seedContentData();
      const newKickoff = '2026-08-20T15:30:00.000Z';

      const res = await request(app)
        .patch(`/api/admin/content/fixtures/${fixture.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ kickoffTime: newKickoff, isPostponed: true });

      expect(res.status).toBe(200);
      expect(res.body.isPostponed).toBe(true);
      expect(new Date(res.body.kickoffTime).toISOString()).toBe(newKickoff);
      expect(res.body.isManualOverride).toBe(true);

      const audit = await prisma.auditLog.findFirst({
        where: { action: 'FIXTURE_UPDATE', targetId: fixture.id, adminId },
      });
      expect(audit).not.toBeNull();
      expect(audit?.targetType).toBe('Fixture');
      expect(audit?.beforeJson).toMatchObject({ isPostponed: false });
      expect(audit?.afterJson).toMatchObject({
        isPostponed: true,
        kickoffTime: newKickoff,
      });
    });

    it('clears fixtures:list:* Redis cache after update', async () => {
      const { token } = await getAdminAuth();
      const { fixture } = await seedContentData();
      const cacheKey = `${CACHE_PREFIX.fixtures}:admintest`;

      await redis.set(cacheKey, JSON.stringify({ cached: true }));

      const res = await request(app)
        .patch(`/api/admin/content/fixtures/${fixture.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ isPostponed: true });

      expect(res.status).toBe(200);
      expect(await redis.get(cacheKey)).toBeNull();
    });
  });

  describe('PATCH /gameweeks/:id', () => {
    it('updates gameweek and writes GAMEWEEK_UPDATE audit log', async () => {
      const { token, adminId } = await getAdminAuth();
      const { gameweek } = await seedContentData();
      const newDeadline = '2026-08-14T10:00:00.000Z';

      const res = await request(app)
        .patch(`/api/admin/content/gameweeks/${gameweek.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ deadline: newDeadline, status: 'LIVE' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('LIVE');
      expect(new Date(res.body.deadline).toISOString()).toBe(newDeadline);
      expect(res.body.isManualOverride).toBe(true);

      const audit = await prisma.auditLog.findFirst({
        where: { action: 'GAMEWEEK_UPDATE', targetId: gameweek.id, adminId },
      });
      expect(audit).not.toBeNull();
      expect(audit?.beforeJson).toMatchObject({ status: 'UPCOMING' });
      expect(audit?.afterJson).toMatchObject({ status: 'LIVE' });
    });

    it('finalizes gameweek, writes GAMEWEEK_FINALIZE audit, and calls scoreGameweek', async () => {
      const { token, adminId } = await getAdminAuth();
      const { gameweek } = await seedContentData();
      const scoreSpy = jest
        .spyOn(scoringJob, 'scoreGameweek')
        .mockResolvedValue({ gameweekNumber: 1, teamsScored: 0, skipped: 0 });

      const res = await request(app)
        .patch(`/api/admin/content/gameweeks/${gameweek.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'FINISHED' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('FINISHED');
      expect(scoreSpy).toHaveBeenCalledWith(1);

      const audit = await prisma.auditLog.findFirst({
        where: { action: 'GAMEWEEK_FINALIZE', targetId: gameweek.id, adminId },
      });
      expect(audit).not.toBeNull();
      expect(audit?.afterJson).toMatchObject({ status: 'FINISHED' });

      scoreSpy.mockRestore();
    });
  });
});

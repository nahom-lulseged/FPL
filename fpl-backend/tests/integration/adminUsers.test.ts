import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/config/db';
import { redis } from '../../src/config/redis';
import {
  buildValidSquadPlayerIds,
  clearLeagueData,
  clearPhase3Data,
  seedPhase3Data,
} from '../helpers/seedTestData';
import { createTestSession } from '../helpers/auth';

const adminUser = {
  email: 'admin-users@example.com',
  password: 'password123',
  name: 'Admin User',
};

const targetUser = {
  email: 'foo.target@example.com',
  password: 'password123',
  name: 'Foo Target',
};

const otherUser = {
  email: 'bar.other@example.com',
  password: 'password123',
  name: 'Bar Other',
};

async function clearRedisKeys(): Promise<void> {
  const keys = await redis.keys('refresh:*');
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

async function getAdminToken(): Promise<{ token: string; userId: string }> {
  const session = await createTestSession({
    email: adminUser.email,
    name: adminUser.name,
    role: 'ADMIN',
    aal: 'aal2',
  });

  return {
    token: session.token,
    userId: session.user.id,
  };
}

async function registerUser(user: typeof targetUser) {
  const session = await createTestSession({ email: user.email, name: user.name });
  return session.user as { id: string; email: string | null };
}

describe('admin users routes', () => {
  let seedPlayers: Awaited<ReturnType<typeof seedPhase3Data>>['players'];
  let gw2Id: string;

  async function createUserWithTeamData(email: string, displayName: string) {
  const user = await prisma.user.create({
    data: {
      supabaseAuthId: `test-auth-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      email,
      displayName,
      displayNameLower: displayName.toLowerCase(),
    },
  });

  const playerIds = buildValidSquadPlayerIds(seedPlayers);
  const players = await prisma.player.findMany({ where: { id: { in: playerIds } } });
  const playerIn = players[0]!;
  const playerOut = players[1]!;

  const team = await prisma.team.create({
    data: {
      userId: user.id,
      name: `${displayName} FC`,
      season: '2025/26',
      squad: {
        create: playerIds.slice(0, 15).map((playerId, index) => ({
          playerId,
          position: players.find((p) => p.id === playerId)!.position,
          isStarter: index < 11,
          benchOrder: index >= 11 ? index - 10 : null,
          isCaptain: index === 0,
          isViceCaptain: index === 1,
        })),
      },
    },
  });

  await prisma.transfer.create({
    data: {
      teamId: team.id,
      playerInId: playerIn.id,
      playerOutId: playerOut.id,
      gameweekId: gw2Id,
      pricePaid: 4,
    },
  });

  const league = await prisma.league.create({
    data: {
      name: `${displayName} League`,
      nameLower: `${displayName} League`.toLowerCase(),
      type: 'CLASSIC',
      inviteCode: `CODE-${user.id.slice(0, 8)}`.toUpperCase(),
      adminUserId: user.id,
      season: '2025/26',
      memberships: {
        create: {
          userId: user.id,
          teamId: team.id,
        },
      },
    },
  });

  return { user, team, league };
  }

  beforeEach(async () => {
    await prisma.auditLog.deleteMany();
    await clearLeagueData(prisma);
    await clearPhase3Data(prisma);
    await prisma.user.deleteMany();
    await clearRedisKeys();

    const seed = await seedPhase3Data(prisma);
    seedPlayers = seed.players;
    gw2Id = seed.gw2.id;
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany();
    await clearPhase3Data(prisma);
    await prisma.user.deleteMany();
    await prisma.$disconnect();
    await redis.quit();
  });

  describe('access control', () => {
    it('returns 401 for GET /api/admin/users without a token', async () => {
      const res = await request(app).get('/api/admin/users');
      expect(res.status).toBe(401);
    });

    it('returns 403 for GET /api/admin/users with non-admin token', async () => {
      const session = await createTestSession({
        email: targetUser.email,
        name: targetUser.name,
      });

      const res = await request(app)
        .get('/api/admin/users')
        .set(session.authHeader);

      expect(res.status).toBe(403);
    });

    it('returns 200 for GET /api/admin/users with admin token', async () => {
      const { token } = await getAdminToken();
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.meta).toMatchObject({
        page: 1,
        limit: 20,
        total: expect.any(Number),
        totalPages: expect.any(Number),
      });
    });
  });

  describe('list, search, filter, sort', () => {
    it('searches users by email and display name', async () => {
      const { token } = await getAdminToken();
      await createUserWithTeamData(targetUser.email, 'Foo Target');
      await registerUser(otherUser);

      const emailRes = await request(app)
        .get('/api/admin/users?search=foo.target')
        .set('Authorization', `Bearer ${token}`);

      expect(emailRes.status).toBe(200);
      expect(emailRes.body.data).toHaveLength(1);
      expect(emailRes.body.data[0].email).toBe(targetUser.email);

      const nameRes = await request(app)
        .get('/api/admin/users?search=Bar')
        .set('Authorization', `Bearer ${token}`);

      expect(nameRes.status).toBe(200);
      expect(nameRes.body.data).toHaveLength(1);
      expect(nameRes.body.data[0].displayName).toBe('Bar Other');
    });

    it('filters by isAdmin and hasTeam', async () => {
      const { token } = await getAdminToken();
      await createUserWithTeamData(targetUser.email, 'Foo Target');
      await registerUser(otherUser);

      const adminRes = await request(app)
        .get('/api/admin/users?isAdmin=true')
        .set('Authorization', `Bearer ${token}`);

      expect(adminRes.status).toBe(200);
      expect(adminRes.body.data.every((row: { isAdmin: boolean }) => row.isAdmin)).toBe(true);

      const hasTeamRes = await request(app)
        .get('/api/admin/users?hasTeam=true')
        .set('Authorization', `Bearer ${token}`);

      expect(hasTeamRes.status).toBe(200);
      expect(hasTeamRes.body.data).toHaveLength(1);
      expect(hasTeamRes.body.data[0].teamCount).toBe(1);
    });

    it('sorts by team count descending', async () => {
      const { token } = await getAdminToken();
      await createUserWithTeamData(targetUser.email, 'Foo Target');
      await registerUser(otherUser);

      const res = await request(app)
        .get('/api/admin/users?sortBy=teamCount&sortDir=desc')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data[0].teamCount).toBeGreaterThanOrEqual(res.body.data[1].teamCount);
    });
  });

  describe('user detail', () => {
    it('returns full user detail with teams, squad, memberships, and transfer count', async () => {
      const { token } = await getAdminToken();
      const { user, team } = await createUserWithTeamData(targetUser.email, 'Foo Target');

      const res = await request(app)
        .get(`/api/admin/users/${user.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe(targetUser.email);
      expect(res.body.teams).toHaveLength(1);
      expect(res.body.teams[0].id).toBe(team.id);
      expect(res.body.teams[0].squad.length).toBeGreaterThan(0);
      expect(res.body.leagueMemberships).toHaveLength(1);
      expect(res.body.transferCount).toBe(1);
    });
  });

  describe('suspend', () => {
    it('blocks existing sessions for suspended users', async () => {
      const { token, userId: adminId } = await getAdminToken();
      const { user } = await createUserWithTeamData(targetUser.email, 'Foo Target');
      const userToken = `test-auth:${user.supabaseAuthId}:aal1`;

      const beforeRes = await request(app)
        .get('/api/me')
        .set('Authorization', `Bearer ${userToken}`);
      expect(beforeRes.status).toBe(200);

      const suspendRes = await request(app)
        .patch(`/api/admin/users/${user.id}/suspend`)
        .set('Authorization', `Bearer ${token}`)
        .send({ suspended: true, reason: 'Abuse' });

      expect(suspendRes.status).toBe(200);
      expect(suspendRes.body.isSuspended).toBe(true);

      const afterRes = await request(app)
        .get('/api/me')
        .set('Authorization', `Bearer ${userToken}`);

      expect(afterRes.status).toBe(401);
      expect(afterRes.body.error).toBe('Unauthorized');

      const audit = await prisma.auditLog.findFirst({
        where: { action: 'USER_SUSPEND', targetId: user.id, adminId },
      });
      expect(audit).not.toBeNull();
    });

    it('keeps suspended users blocked after suspension without requiring consumer password routes', async () => {
      const { token } = await getAdminToken();
      const { user } = await createUserWithTeamData(targetUser.email, 'Foo Target');
      const userToken = `test-auth:${user.supabaseAuthId}:aal1`;

      const suspendRes = await request(app)
        .patch(`/api/admin/users/${user.id}/suspend`)
        .set('Authorization', `Bearer ${token}`)
        .send({ suspended: true });

      expect(suspendRes.status).toBe(200);

      const meRes = await request(app)
        .get('/api/me')
        .set('Authorization', `Bearer ${userToken}`);

      expect(meRes.status).toBe(401);
      expect(meRes.body.error).toBe('Unauthorized');
    });
  });

  describe('promote', () => {
    it('requires confirm=true to promote a user', async () => {
      const { token } = await getAdminToken();
      const registered = await registerUser(targetUser);

      const withoutConfirm = await request(app)
        .patch(`/api/admin/users/${registered.id}/promote`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(withoutConfirm.status).toBe(400);

      const withConfirm = await request(app)
        .patch(`/api/admin/users/${registered.id}/promote`)
        .set('Authorization', `Bearer ${token}`)
        .send({ confirm: true });

      expect(withConfirm.status).toBe(200);
      expect(withConfirm.body.isAdmin).toBe(true);

      const audit = await prisma.auditLog.findFirst({
        where: { action: 'USER_PROMOTE', targetId: registered.id },
      });
      expect(audit).not.toBeNull();
    });
  });

  describe('delete', () => {
    it('requires confirm=true to delete a user', async () => {
      const { token } = await getAdminToken();
      const { user } = await createUserWithTeamData(targetUser.email, 'Foo Target');

      const withoutConfirm = await request(app)
        .delete(`/api/admin/users/${user.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(withoutConfirm.status).toBe(400);
    });

    it('hard deletes user and cascades related rows', async () => {
      const { token } = await getAdminToken();
      const { user, team, league } = await createUserWithTeamData(
        targetUser.email,
        'Foo Target',
      );

      const deleteRes = await request(app)
        .delete(`/api/admin/users/${user.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ confirm: true });

      expect(deleteRes.status).toBe(200);

      expect(await prisma.user.findUnique({ where: { id: user.id } })).toBeNull();
      expect(await prisma.team.findUnique({ where: { id: team.id } })).toBeNull();
      expect(await prisma.squad.count({ where: { teamId: team.id } })).toBe(0);
      expect(await prisma.transfer.count({ where: { teamId: team.id } })).toBe(0);
      expect(await prisma.league.findUnique({ where: { id: league.id } })).toBeNull();
      expect(
        await prisma.leagueMembership.count({ where: { userId: user.id } }),
      ).toBe(0);

      const audit = await prisma.auditLog.findFirst({
        where: { action: 'USER_DELETE', targetId: user.id },
      });
      expect(audit).not.toBeNull();
    });
  });
});

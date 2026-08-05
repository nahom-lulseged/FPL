import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/config/db';
import { redis } from '../../src/config/redis';
import {
  buildValidSquadPlayerIds,
  clearLeagueData,
  clearPhase3Data,
  seedLeagueWithMembers,
  seedPhase3Data,
} from '../helpers/seedTestData';
import { createTestSession } from '../helpers/auth';

const adminUser = {
  email: 'admin-leagues@example.com',
  password: 'password123',
  name: 'Admin Leagues',
};

const leagueOwner = {
  email: 'league-owner-admin@example.com',
  password: 'password123',
  name: 'League Owner',
};

const leagueMember = {
  email: 'league-member-admin@example.com',
  password: 'password123',
  name: 'League Member',
};

const leagueMemberTwo = {
  email: 'league-member-two@example.com',
  password: 'password123',
  name: 'League Member Two',
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

async function registerUser(user: typeof leagueOwner) {
  const session = await createTestSession({ email: user.email, name: user.name });
  return session.user;
}

async function createTeamForUser(
  user: typeof leagueOwner,
  teamName: string,
  playerIds: string[],
) {
  const row = await prisma.user.findFirst({ where: { email: user.email } });
  const token = `test-auth:${row!.supabaseAuthId}:aal1`;
  const teamRes = await request(app)
    .post('/api/teams')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: teamName, season: '2025/26', playerIds });
  return { token, teamId: teamRes.body.id as string, userId: row!.id };
}

let validPlayerIds: string[];
let gw2Id: string;

describe('admin leagues integration', () => {
  let adminToken: string;
  let adminId: string;
  let ownerUserId: string;
  let memberUserId: string;
  let memberTwoUserId: string;
  let ownerTeamId: string;
  let memberTeamId: string;
  let memberTwoTeamId: string;
  let leagueId: string;

  beforeAll(async () => {
    await clearPhase3Data(prisma);
    const seed = await seedPhase3Data(prisma);
    gw2Id = seed.gw2.id;
    validPlayerIds = buildValidSquadPlayerIds(seed.players);

    const auth = await getAdminAuth();
    adminToken = auth.token;
    adminId = auth.adminId;

    await registerUser(leagueOwner);
    await registerUser(leagueMember);
    await registerUser(leagueMemberTwo);

    const owner = await createTeamForUser(leagueOwner, 'Owner FC', validPlayerIds);
    ownerUserId = owner.userId;
    ownerTeamId = owner.teamId;

    const member = await createTeamForUser(leagueMember, 'Member FC', validPlayerIds);
    memberUserId = member.userId;
    memberTeamId = member.teamId;

    const memberTwo = await createTeamForUser(leagueMemberTwo, 'Member Two FC', validPlayerIds);
    memberTwoUserId = memberTwo.userId;
    memberTwoTeamId = memberTwo.teamId;
  });

  beforeEach(async () => {
    await clearLeagueData(prisma);
    await clearRedisKeys();

    const league = await seedLeagueWithMembers(prisma, {
      name: 'Moderation Test League',
      season: '2025/26',
      adminUserId: ownerUserId,
      inviteCode: 'MODTEST1',
      members: [
        { userId: ownerUserId, teamId: ownerTeamId },
        { userId: memberUserId, teamId: memberTeamId },
        { userId: memberTwoUserId, teamId: memberTwoTeamId },
      ],
    });
    leagueId = league.id;

    await prisma.team.update({ where: { id: ownerTeamId }, data: { totalPoints: 150 } });
    await prisma.team.update({ where: { id: memberTeamId }, data: { totalPoints: 120 } });
    await prisma.team.update({ where: { id: memberTwoTeamId }, data: { totalPoints: 90 } });
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app).get('/api/admin/leagues');
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin user', async () => {
    const session = await createTestSession({
      email: leagueOwner.email,
      name: leagueOwner.name,
    });

    const res = await request(app)
      .get('/api/admin/leagues')
      .set(session.authHeader);

    expect(res.status).toBe(403);
  });

  it('lists leagues with pagination and search by name', async () => {
    const listRes = await request(app)
      .get('/api/admin/leagues')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ page: 1, limit: 10, search: 'Moderation' });

    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);
    expect(listRes.body.data[0].name).toBe('Moderation Test League');
    expect(listRes.body.data[0].memberCount).toBe(3);
    expect(listRes.body.meta.total).toBe(1);
  });

  it('searches leagues by creator email', async () => {
    const res = await request(app)
      .get('/api/admin/leagues')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ search: leagueOwner.email });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].creator.email).toBe(leagueOwner.email);
  });

  it('filters leagues by type CLASSIC', async () => {
    const res = await request(app)
      .get('/api/admin/leagues')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ type: 'CLASSIC' });

    expect(res.status).toBe(200);
    expect(res.body.data.every((row: { type: string }) => row.type === 'CLASSIC')).toBe(true);
  });

  it('sorts leagues by member count descending', async () => {
    await seedLeagueWithMembers(prisma, {
      name: 'Small League',
      season: '2025/26',
      adminUserId: ownerUserId,
      inviteCode: 'SMALL001',
      members: [{ userId: ownerUserId, teamId: ownerTeamId }],
    });

    const res = await request(app)
      .get('/api/admin/leagues')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ sortBy: 'memberCount', sortDir: 'desc' });

    expect(res.status).toBe(200);
    expect(res.body.data[0].memberCount).toBeGreaterThanOrEqual(res.body.data[1].memberCount);
    expect(res.body.data[0].name).toBe('Moderation Test League');
  });

  it('returns league detail with standings, members, and creator', async () => {
    const res = await request(app)
      .get(`/api/admin/leagues/${leagueId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(leagueId);
    expect(res.body.creator.email).toBe(leagueOwner.email);
    expect(res.body.members).toHaveLength(3);
    expect(res.body.members[0]).toHaveProperty('joinedAt');
    expect(res.body.standings).toHaveLength(3);
    expect(res.body.standings[0].teamId).toBe(ownerTeamId);
    expect(res.body.standings[0].totalPoints).toBe(150);
    expect(res.body.standings[0].rank).toBe(1);
    expect(res.body.standings[2].teamId).toBe(memberTwoTeamId);
  });

  it('removes a member and updates standings', async () => {
    const removeRes = await request(app)
      .delete(`/api/admin/leagues/${leagueId}/members/${memberUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ confirm: true });

    expect(removeRes.status).toBe(200);
    expect(removeRes.body.removed).toBe(true);
    expect(removeRes.body.standings).toHaveLength(2);
    expect(
      removeRes.body.standings.some((row: { userId: string }) => row.userId === memberUserId),
    ).toBe(false);

    const membership = await prisma.leagueMembership.findUnique({
      where: { leagueId_userId: { leagueId, userId: memberUserId } },
    });
    expect(membership).toBeNull();

    const detailRes = await request(app)
      .get(`/api/admin/leagues/${leagueId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(detailRes.body.memberCount).toBe(2);
    expect(detailRes.body.standings).toHaveLength(2);

    const audit = await prisma.auditLog.findFirst({
      where: {
        action: 'LEAGUE_MEMBER_REMOVE',
        targetType: 'League',
        targetId: leagueId,
        adminId,
      },
    });
    expect(audit).not.toBeNull();
  });

  it('rejects remove member without confirm=true', async () => {
    const res = await request(app)
      .delete(`/api/admin/leagues/${leagueId}/members/${memberUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('returns 404 when removing non-member', async () => {
    const outsider = await registerUser({
      email: 'outsider-admin-league@example.com',
      password: 'password123',
      name: 'Outsider',
    });

    const res = await request(app)
      .delete(`/api/admin/leagues/${leagueId}/members/${outsider.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ confirm: true });

    expect(res.status).toBe(404);
  });

  it('dissolves league and cascades memberships with no orphans', async () => {
    const res = await request(app)
      .delete(`/api/admin/leagues/${leagueId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ confirm: true });

    expect(res.status).toBe(200);
    expect(res.body.dissolved).toBe(true);
    expect(res.body.leagueId).toBe(leagueId);

    const league = await prisma.league.findUnique({ where: { id: leagueId } });
    expect(league).toBeNull();

    const orphanCount = await prisma.leagueMembership.count({ where: { leagueId } });
    expect(orphanCount).toBe(0);

    const audit = await prisma.auditLog.findFirst({
      where: {
        action: 'LEAGUE_DISSOLVE',
        targetType: 'League',
        targetId: leagueId,
        adminId,
      },
    });
    expect(audit).not.toBeNull();
  });

  it('rejects dissolve without confirm=true', async () => {
    const res = await request(app)
      .delete(`/api/admin/leagues/${leagueId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('returns 404 when dissolving unknown league', async () => {
    const res = await request(app)
      .delete('/api/admin/leagues/nonexistent-league-id')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ confirm: true });

    expect(res.status).toBe(404);
  });

  it('allows admin to moderate league they do not own', async () => {
    expect(ownerUserId).not.toBe(adminId);

    const removeRes = await request(app)
      .delete(`/api/admin/leagues/${leagueId}/members/${memberTwoUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ confirm: true });

    expect(removeRes.status).toBe(200);

    const dissolveRes = await request(app)
      .delete(`/api/admin/leagues/${leagueId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ confirm: true });

    expect(dissolveRes.status).toBe(200);

    const orphanCount = await prisma.leagueMembership.count({ where: { leagueId } });
    expect(orphanCount).toBe(0);
  });
});

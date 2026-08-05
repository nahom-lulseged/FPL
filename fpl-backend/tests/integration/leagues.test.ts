import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/config/db';
import {
  buildValidSquadPlayerIds,
  clearLeagueData,
  clearPhase3Data,
  seedPhase3Data,
} from '../helpers/seedTestData';
import { createTestSession } from '../helpers/auth';

const userOne = {
  email: 'league-owner@example.com',
  password: 'password123',
  name: 'League Owner',
};

const userTwo = {
  email: 'league-member@example.com',
  password: 'password123',
  name: 'League Member',
};

const userThree = {
  email: 'league-outsider@example.com',
  password: 'password123',
  name: 'League Outsider',
};

async function registerAndLogin(user: typeof userOne) {
  const session = await createTestSession({ email: user.email, name: user.name });
  return {
    token: session.token,
    userId: session.user.id,
  };
}

async function createTeam(token: string, name: string, season = '2025/26') {
  return request(app)
    .post('/api/teams')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name,
      season,
      playerIds: validPlayerIds,
    });
}

let validPlayerIds: string[];
let gw2Id: string;

describe('leagues integration', () => {
  let ownerToken: string;
  let memberToken: string;
  let outsiderToken: string;
  let ownerTeamId: string;
  let memberTeamId: string;
  let inviteCode: string;
  let leagueId: string;

  beforeAll(async () => {
    await clearPhase3Data(prisma);
    const seed = await seedPhase3Data(prisma);
    gw2Id = seed.gw2.id;
    validPlayerIds = buildValidSquadPlayerIds(seed.players);

    const owner = await registerAndLogin(userOne);
    ownerToken = owner.token;

    const member = await registerAndLogin(userTwo);
    memberToken = member.token;

    const outsider = await registerAndLogin(userThree);
    outsiderToken = outsider.token;

    const ownerTeamRes = await createTeam(ownerToken, 'Owner Team');
    ownerTeamId = ownerTeamRes.body.id;

    const memberTeamRes = await createTeam(memberToken, 'Member Team');
    memberTeamId = memberTeamRes.body.id;
  });

  beforeEach(async () => {
    await clearLeagueData(prisma);
    inviteCode = '';
    leagueId = '';
  });

  it('creates a classic league and auto-joins the creator', async () => {
    const res = await request(app)
      .post('/api/leagues')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Office League',
        type: 'CLASSIC',
        season: '2025/26',
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Office League');
    expect(res.body.type).toBe('CLASSIC');
    expect(res.body.memberCount).toBe(1);
    expect(res.body.inviteCode).toHaveLength(8);
    expect(res.body.isAdmin).toBe(true);

    inviteCode = res.body.inviteCode;
    leagueId = res.body.id;

    const membership = await prisma.leagueMembership.findUnique({
      where: {
        leagueId_userId: {
          leagueId,
          userId: (await prisma.user.findFirst({ where: { email: userOne.email } }))!.id,
        },
      },
    });
    expect(membership).not.toBeNull();
  });

  it('rejects head-to-head league creation', async () => {
    const res = await request(app)
      .post('/api/leagues')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'H2H League',
        type: 'HEAD_TO_HEAD',
        season: '2025/26',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Head-to-head');
  });

  it('allows a second user to join via invite code', async () => {
    const createRes = await request(app)
      .post('/api/leagues')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Join League',
        type: 'CLASSIC',
        season: '2025/26',
      });

    const joinRes = await request(app)
      .post('/api/leagues/join')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ inviteCode: createRes.body.inviteCode });

    expect(joinRes.status).toBe(201);
    expect(joinRes.body.memberCount).toBe(2);
    expect(joinRes.body.joinedAt).toBeDefined();
  });

  it('returns 404 when joining without a team for the league season', async () => {
    const createRes = await request(app)
      .post('/api/leagues')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Season League',
        type: 'CLASSIC',
        season: '2025/26',
      });

    const joinRes = await request(app)
      .post('/api/leagues/join')
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({ inviteCode: createRes.body.inviteCode });

    expect(joinRes.status).toBe(404);
    expect(joinRes.body.error).toContain('team');
  });

  it('returns 409 when joining the same league twice', async () => {
    const createRes = await request(app)
      .post('/api/leagues')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Duplicate League',
        type: 'CLASSIC',
        season: '2025/26',
      });

    const firstJoin = await request(app)
      .post('/api/leagues/join')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ inviteCode: createRes.body.inviteCode });
    expect(firstJoin.status).toBe(201);

    const secondJoin = await request(app)
      .post('/api/leagues/join')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ inviteCode: createRes.body.inviteCode });

    expect(secondJoin.status).toBe(409);
    expect(secondJoin.body.error).toContain('already a member');
  });

  it('joins via invite code case-insensitively', async () => {
    const createRes = await request(app)
      .post('/api/leagues')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Case League',
        type: 'CLASSIC',
        season: '2025/26',
      });

    const joinRes = await request(app)
      .post('/api/leagues/join')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ inviteCode: String(createRes.body.inviteCode).toLowerCase() });

    expect(joinRes.status).toBe(201);
    expect(joinRes.body.memberCount).toBe(2);
  });

  it('returns standings in correct rank order', async () => {
    const createRes = await request(app)
      .post('/api/leagues')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Standings League',
        type: 'CLASSIC',
        season: '2025/26',
      });

    await request(app)
      .post('/api/leagues/join')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ inviteCode: createRes.body.inviteCode });

    await prisma.team.update({
      where: { id: ownerTeamId },
      data: { totalPoints: 120 },
    });
    await prisma.team.update({
      where: { id: memberTeamId },
      data: { totalPoints: 95 },
    });

    await prisma.teamGameweekScore.create({
      data: {
        teamId: ownerTeamId,
        gameweekId: gw2Id,
        startersPoints: 50,
        captainBonus: 10,
        benchPoints: 0,
        transferHit: 0,
        totalPoints: 60,
      },
    });
    await prisma.teamGameweekScore.create({
      data: {
        teamId: memberTeamId,
        gameweekId: gw2Id,
        startersPoints: 40,
        captainBonus: 5,
        benchPoints: 0,
        transferHit: 0,
        totalPoints: 45,
      },
    });

    const standingsRes = await request(app)
      .get(`/api/leagues/${createRes.body.id}/standings`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(standingsRes.status).toBe(200);
    expect(standingsRes.body.type).toBe('CLASSIC');
    expect(standingsRes.body.currentGameweek).toBe(2);
    expect(standingsRes.body.data).toHaveLength(2);
    expect(standingsRes.body.data[0].teamId).toBe(ownerTeamId);
    expect(standingsRes.body.data[0].totalPoints).toBe(120);
    expect(standingsRes.body.data[0].gameweekPoints).toBe(60);
    expect(standingsRes.body.data[1].teamId).toBe(memberTeamId);
    expect(standingsRes.body.data[1].rank).toBe(2);
    expect(standingsRes.body.meta.total).toBe(2);
  });

  it('includes chipsUsed in standings when a chip was played', async () => {
    const createRes = await request(app)
      .post('/api/leagues')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Chip League',
        type: 'CLASSIC',
        season: '2025/26',
      });

    await prisma.chipUsage.create({
      data: {
        teamId: ownerTeamId,
        chipType: 'BENCH_BOOST',
        gameweekNumber: 2,
        season: '2025/26',
      },
    });

    const standingsRes = await request(app)
      .get(`/api/leagues/${createRes.body.id}/standings`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(standingsRes.status).toBe(200);
    expect(standingsRes.body.data[0].chipsUsed).toEqual([
      { chipType: 'BENCH_BOOST', gameweekNumber: 2 },
    ]);
  });

  it('returns 403 for standings when user is not a member', async () => {
    const createRes = await request(app)
      .post('/api/leagues')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Private League',
        type: 'CLASSIC',
        season: '2025/26',
      });

    const outsiderTeamRes = await createTeam(outsiderToken, 'Outsider Team');
    expect(outsiderTeamRes.status).toBe(201);

    const standingsRes = await request(app)
      .get(`/api/leagues/${createRes.body.id}/standings`)
      .set('Authorization', `Bearer ${outsiderToken}`);

    expect(standingsRes.status).toBe(403);
  });

  it('lists only leagues the user belongs to', async () => {
    const leagueOne = await request(app)
      .post('/api/leagues')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Owner League',
        type: 'CLASSIC',
        season: '2025/26',
      });

    const leagueTwo = await request(app)
      .post('/api/leagues')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        name: 'Member League',
        type: 'CLASSIC',
        season: '2025/26',
      });

    const ownerList = await request(app)
      .get('/api/leagues')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(ownerList.status).toBe(200);
    expect(ownerList.body.data).toHaveLength(1);
    expect(ownerList.body.data[0].id).toBe(leagueOne.body.id);
    expect(ownerList.body.meta.total).toBe(1);

    const memberList = await request(app)
      .get('/api/leagues')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(memberList.status).toBe(200);
    expect(memberList.body.data).toHaveLength(1);
    expect(memberList.body.data[0].id).toBe(leagueTwo.body.id);
  });
});

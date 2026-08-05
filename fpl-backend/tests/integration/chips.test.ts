import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/config/db';
import { redis } from '../../src/config/redis';
import { processChipRolloverForNewGameweek } from '../../src/modules/chips/chips.rollover';
import { scoreGameweek } from '../../src/modules/scoring/scoring.job';
import { syncSquadSnapshotFromTeam } from '../../src/modules/scoring/scoring.service';
import {
  buildValidSquadPlayerIds,
  clearChipData,
  clearPhase3Data,
  clearPhase4Data,
  clearPhase5Data,
  seedGameweekWithStats,
  seedPhase3Data,
} from '../helpers/seedTestData';
import { createTestSession } from '../helpers/auth';

const userOne = {
  email: 'chip-owner@example.com',
  password: 'password123',
  name: 'Chip Owner',
};

const userTwo = {
  email: 'chip-other@example.com',
  password: 'password123',
  name: 'Chip Other',
};

async function registerAndLogin(user: typeof userOne) {
  const session = await createTestSession({ email: user.email, name: user.name });
  return session.token;
}

async function createTeam(token: string, playerIds: string[]) {
  return request(app)
    .post('/api/teams')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Chip Team',
      season: '2025/26',
      playerIds,
    });
}

describe('chips integration', () => {
  let ownerToken: string;
  let otherToken: string;
  let teamId: string;
  let validPlayerIds: string[];
  let sonId: string;
  let deBruyneId: string;
  let sakaId: string;
  let gw2Id: string;

  function findTransferPair(
    squad: Array<{
      playerId: string;
      position: string;
      isCaptain: boolean;
      isViceCaptain: boolean;
      player: { name: string; realTeam: { id: string } };
    }>,
    playerInId: string,
    allPlayers: Array<{ id: string; position: string; realTeamId: string }>,
  ) {
    const playerIn = allPlayers.find((p) => p.id === playerInId)!;
    const clubCounts = new Map<string, number>();
    for (const entry of squad) {
      const clubId = entry.player.realTeam.id;
      clubCounts.set(clubId, (clubCounts.get(clubId) ?? 0) + 1);
    }

    const candidate = squad.find((s) => {
      if (s.isCaptain || s.isViceCaptain || s.position !== playerIn.position) {
        return false;
      }
      const outClubId = s.player.realTeam.id;
      const inClubId = playerIn.realTeamId;
      if (outClubId === inClubId) {
        return true;
      }
      const outClubCount = clubCounts.get(outClubId) ?? 0;
      const inClubCount = clubCounts.get(inClubId) ?? 0;
      return inClubCount < 3;
    });

    if (!candidate) {
      throw new Error('No valid transfer pair found');
    }
    return candidate.playerId;
  }

  beforeAll(async () => {
    await clearPhase3Data(prisma);
    const seed = await seedPhase3Data(prisma);
    gw2Id = seed.gw2.id;

    validPlayerIds = buildValidSquadPlayerIds(seed.players);
    sonId = seed.players.find((p) => p.name === 'Son')!.id;
    deBruyneId = seed.players.find((p) => p.name === 'De Bruyne')!.id;
    sakaId = seed.players.find((p) => p.name === 'Saka')!.id;

    ownerToken = await registerAndLogin(userOne);
    otherToken = await registerAndLogin(userTwo);

    const teamRes = await createTeam(ownerToken, validPlayerIds);
    teamId = teamRes.body.id;
  });

  beforeEach(async () => {
    await clearChipData(prisma);
    await clearPhase5Data(prisma);
    await clearPhase4Data(prisma);
    await redis.del('chips:rollover:gw');
    await redis.del('transfers:rollover:gw');
    await prisma.gameweek.updateMany({ data: { isCurrent: false } });
    await prisma.gameweek.update({
      where: { number: 2 },
      data: {
        isCurrent: true,
        deadline: new Date('2099-08-22T17:30:00Z'),
        status: 'LIVE',
      },
    });
    await prisma.team.update({
      where: { id: teamId },
      data: { freeTransfers: 1 },
    });
    await syncSquadSnapshotFromTeam(teamId);
  });

  it('plays wildcard and allows unlimited transfers without hit', async () => {
    const chipRes = await request(app)
      .post(`/api/teams/${teamId}/chips/wildcard`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ wildcardNumber: 1 });

    expect(chipRes.status).toBe(201);
    expect(chipRes.body.activeChip).toBe('WILDCARD');
    expect(chipRes.body.chipPlayed.chipType).toBe('WILDCARD');

    await prisma.team.update({
      where: { id: teamId },
      data: { freeTransfers: 0 },
    });

    const team = await request(app)
      .get(`/api/teams/${teamId}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    const allPlayers = await prisma.player.findMany();
    const playerOut1 = findTransferPair(team.body.squad, sonId, allPlayers);
    const playerOut2 = findTransferPair(team.body.squad, sakaId, allPlayers);

    const transferRes = await request(app)
      .post(`/api/teams/${teamId}/transfers`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        transfers: [
          { playerInId: sonId, playerOutId: playerOut1 },
          { playerInId: sakaId, playerOutId: playerOut2 },
        ],
      });

    expect(transferRes.status).toBe(201);
    expect(transferRes.body.transferSummary.pointsHit).toBe(0);
    expect(transferRes.body.freeTransfers).toBe(0);
  });

  it('rejects wildcard 1 from gameweek 20 onward', async () => {
    await prisma.gameweek.updateMany({ data: { isCurrent: false } });
    await prisma.gameweek.upsert({
      where: { number: 20 },
      create: {
        number: 20,
        deadline: new Date('2099-12-31T17:30:00Z'),
        status: 'UPCOMING',
        isCurrent: true,
      },
      update: {
        isCurrent: true,
        deadline: new Date('2099-12-31T17:30:00Z'),
      },
    });

    const res = await request(app)
      .post(`/api/teams/${teamId}/chips/wildcard`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ wildcardNumber: 1 });

    expect(res.status).toBe(400);
  });

  it('rejects second chip in same gameweek', async () => {
    await request(app)
      .post(`/api/teams/${teamId}/chips/bench-boost`)
      .set('Authorization', `Bearer ${ownerToken}`);

    const res = await request(app)
      .post(`/api/teams/${teamId}/chips/triple-captain`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(400);
  });

  it('rejects replaying a used chip', async () => {
    await request(app)
      .post(`/api/teams/${teamId}/chips/bench-boost`)
      .set('Authorization', `Bearer ${ownerToken}`);

    await prisma.gameweek.update({
      where: { number: 2 },
      data: { isCurrent: false },
    });
    await prisma.gameweek.create({
      data: {
        number: 3,
        deadline: new Date('2099-09-05T17:30:00Z'),
        status: 'UPCOMING',
        isCurrent: true,
      },
    });

    const res = await request(app)
      .post(`/api/teams/${teamId}/chips/bench-boost`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(400);
  });

  it('returns chip status via GET /chips', async () => {
    await request(app)
      .post(`/api/teams/${teamId}/chips/triple-captain`)
      .set('Authorization', `Bearer ${ownerToken}`);

    const res = await request(app)
      .get(`/api/teams/${teamId}/chips`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.activeThisGameweek).toBe('TRIPLE_CAPTAIN');
    expect(res.body.availability.TRIPLE_CAPTAIN).toBe(false);
    expect(res.body.history).toHaveLength(1);
  });

  it('rejects non-owner', async () => {
    const res = await request(app)
      .post(`/api/teams/${teamId}/chips/bench-boost`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
  });

  it('rejects chip play after deadline', async () => {
    await prisma.gameweek.update({
      where: { number: 2 },
      data: { deadline: new Date('2000-01-01T00:00:00Z') },
    });

    const res = await request(app)
      .post(`/api/teams/${teamId}/chips/bench-boost`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(403);
  });

  it('restores free hit squad on rollover', async () => {
    const beforeTeam = await request(app)
      .get(`/api/teams/${teamId}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    const originalSquadIds = beforeTeam.body.squad.map(
      (s: { playerId: string }) => s.playerId,
    );

    await request(app)
      .post(`/api/teams/${teamId}/chips/free-hit`)
      .set('Authorization', `Bearer ${ownerToken}`);

    await request(app)
      .post(`/api/teams/${teamId}/transfers`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        transfers: [{ playerInId: sonId, playerOutId: findTransferPair(
          beforeTeam.body.squad,
          sonId,
          await prisma.player.findMany(),
        ) }],
      });

    await processChipRolloverForNewGameweek(2, 3);

    const afterTeam = await request(app)
      .get(`/api/teams/${teamId}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    const restoredIds = afterTeam.body.squad.map(
      (s: { playerId: string }) => s.playerId,
    );

    expect(restoredIds.sort()).toEqual(originalSquadIds.sort());
    expect(await prisma.transfer.count({ where: { teamId } })).toBe(0);
  });

  it('includes bench boost points in gameweek breakdown', async () => {
    await request(app)
      .post(`/api/teams/${teamId}/chips/bench-boost`)
      .set('Authorization', `Bearer ${ownerToken}`);

    const team = await request(app)
      .get(`/api/teams/${teamId}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    const squad = team.body.squad;
    const playerIds = squad.map((s: { playerId: string }) => s.playerId);
    const players = await prisma.player.findMany({
      where: { id: { in: playerIds } },
    });

    await seedGameweekWithStats(
      prisma,
      gw2Id,
      players.map((p, index) => ({
        playerId: p.id,
        points: index < 11 ? 2 : 5,
      })),
    );

    await syncSquadSnapshotFromTeam(teamId);
    await scoreGameweek(2);

    const scored = await request(app)
      .get(`/api/teams/${teamId}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(scored.body.gameweekBreakdown).not.toBeNull();
    expect(scored.body.gameweekBreakdown.benchPoints).toBeGreaterThan(0);
  });

  it('sets free transfers to 1 after wildcard rollover', async () => {
    await prisma.team.update({
      where: { id: teamId },
      data: { freeTransfers: 2 },
    });

    await request(app)
      .post(`/api/teams/${teamId}/chips/wildcard`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ wildcardNumber: 1 });

    await processChipRolloverForNewGameweek(2, 3);

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    expect(team?.freeTransfers).toBe(1);
  });
});

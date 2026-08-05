import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/config/db';
import { redis } from '../../src/config/redis';
import {
  buildValidSquadPlayerIds,
  clearPhase3Data,
  seedGameweekWithStats,
  seedPhase3Data,
} from '../helpers/seedTestData';
import { createTestSession } from '../helpers/auth';

const userOne = {
  email: 'owner@example.com',
  password: 'password123',
  name: 'Owner User',
};

const userTwo = {
  email: 'other@example.com',
  password: 'password123',
  name: 'Other User',
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
      name: 'Transfer Team',
      season: '2025/26',
      playerIds,
    });
}

describe('transfers integration', () => {
  let ownerToken: string;
  let otherToken: string;
  let validPlayerIds: string[];
  let jotaId: string;
  let salahId: string;
  let sakaId: string;
  let haalandId: string;
  let grealishId: string;
  let martinelliId: string;
  let sonId: string;
  let deBruyneId: string;

  function findSquadPlayer(
    squad: Array<{ playerId: string; player: { name: string } }>,
    name: string,
  ) {
    return squad.find((s) => s.player.name === name)!.playerId;
  }

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

  beforeEach(async () => {
    await clearPhase3Data(prisma);
    await prisma.user.deleteMany();
    const keys = await redis.keys('refresh:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    await redis.del('transfers:rollover:gw');

    await seedPhase3Data(prisma);
    // Transfers target the next UPCOMING deadline, even when another gameweek
    // is used as the scoring/current fixture in this shared test seed.
    await prisma.gameweek.update({
      where: { number: 2 },
      data: { status: 'UPCOMING' },
    });
    const allPlayers = await prisma.player.findMany();
    validPlayerIds = buildValidSquadPlayerIds(allPlayers);
    jotaId = allPlayers.find((player) => player.name === 'Jota')!.id;
    salahId = allPlayers.find((player) => player.name === 'Salah')!.id;
    sakaId = allPlayers.find((player) => player.name === 'Saka')!.id;
    haalandId = allPlayers.find((player) => player.name === 'Haaland')!.id;
    martinelliId = allPlayers.find((player) => player.name === 'Martinelli')!.id;
    sonId = allPlayers.find((player) => player.name === 'Son')!.id;
    deBruyneId = allPlayers.find((player) => player.name === 'De Bruyne')!.id;

    ownerToken = await registerAndLogin(userOne);
    otherToken = await registerAndLogin(userTwo);
  });

  afterAll(async () => {
    await clearPhase3Data(prisma);
    await prisma.user.deleteMany();
    await prisma.$disconnect();
    await redis.quit();
  });

  it('processes a single free transfer with no points hit', async () => {
    const createRes = await createTeam(ownerToken, validPlayerIds);
    const teamId = createRes.body.id;
    const bankBefore = createRes.body.bankBalance;
    const allPlayers = await prisma.player.findMany();
    const playerOutId = findTransferPair(createRes.body.squad, sonId, allPlayers);

    const res = await request(app)
      .post(`/api/teams/${teamId}/transfers`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        transfers: [{ playerInId: sonId, playerOutId }],
      });

    expect(res.status).toBe(201);
    expect(res.body.transferSummary).toEqual({
      transfersMade: 1,
      pointsHit: 0,
      freeTransfersRemaining: 0,
    });
    expect(res.body.freeTransfers).toBe(0);

    const son = res.body.squad.find((s: { playerId: string }) => s.playerId === sonId);
    expect(son).toBeTruthy();
    expect(
      res.body.squad.find((s: { playerId: string }) => s.playerId === playerOutId),
    ).toBeUndefined();

    const playerOut = await prisma.player.findUnique({ where: { id: playerOutId } });
    const sonPlayer = await prisma.player.findUnique({ where: { id: sonId } });
    expect(res.body.bankBalance).toBe(bankBefore - (sonPlayer!.price - playerOut!.price));
  });

  it('applies -4 hit for transfer beyond free allowance', async () => {
    const createRes = await createTeam(ownerToken, validPlayerIds);
    const teamId = createRes.body.id;
    const allPlayers = await prisma.player.findMany();
    const playerOutId = findTransferPair(createRes.body.squad, sonId, allPlayers);

    await prisma.team.update({
      where: { id: teamId },
      data: { freeTransfers: 0 },
    });

    const res = await request(app)
      .post(`/api/teams/${teamId}/transfers`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        transfers: [{ playerInId: sonId, playerOutId }],
      });

    expect(res.status).toBe(201);
    expect(res.body.transferSummary.pointsHit).toBe(4);
    expect(res.body.transferSummary.freeTransfersRemaining).toBe(0);
    const targetGameweek = await prisma.gameweek.findUnique({ where: { number: 2 } });
    const score = await prisma.teamGameweekScore.findUnique({
      where: { teamId_gameweekId: { teamId, gameweekId: targetGameweek!.id } },
    });
    expect(score?.transferHit).toBe(4);
  });

  it('rejects transfers with mismatched positions', async () => {
    const createRes = await createTeam(ownerToken, validPlayerIds);
    const teamId = createRes.body.id;
    const allPlayers = await prisma.player.findMany();
    const playerOutId = findTransferPair(createRes.body.squad, sonId, allPlayers);

    const res = await request(app)
      .post(`/api/teams/${teamId}/transfers`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        transfers: [{ playerInId: martinelliId, playerOutId }],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('position');
  });

  it('rejects transfers that exceed budget', async () => {
    const createRes = await createTeam(ownerToken, validPlayerIds);
    const teamId = createRes.body.id;
    const allPlayers = await prisma.player.findMany();
    const playerOutId = findTransferPair(createRes.body.squad, sonId, allPlayers);

    await prisma.player.update({
      where: { id: sonId },
      data: { price: 900 },
    });

    const res = await request(app)
      .post(`/api/teams/${teamId}/transfers`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        transfers: [{ playerInId: sonId, playerOutId }],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('budget');
  });

  it('rejects transfers that violate max players per club', async () => {
    const allPlayers = await prisma.player.findMany();
    const createRes = await createTeam(ownerToken, validPlayerIds);
    const teamId = createRes.body.id;

    const jesus = allPlayers.find((player) => player.name === 'Jesus')!;
    const jackson = allPlayers.find((player) => player.name === 'Jackson')!;

    const res = await request(app)
      .post(`/api/teams/${teamId}/transfers`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        transfers: [{ playerInId: jesus.id, playerOutId: jackson.id }],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('club');
  });

  it('rejects transfers after deadline', async () => {
    await prisma.gameweek.updateMany({
      where: { isCurrent: true },
      data: { deadline: new Date('2020-01-01T00:00:00Z') },
    });

    const createRes = await createTeam(ownerToken, validPlayerIds);
    const teamId = createRes.body.id;
    const allPlayers = await prisma.player.findMany();
    const playerOutId = findTransferPair(createRes.body.squad, sonId, allPlayers);

    const res = await request(app)
      .post(`/api/teams/${teamId}/transfers`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        transfers: [{ playerInId: sonId, playerOutId }],
      });

    expect(res.status).toBe(403);
  });

  it('rejects transfers from non-owner', async () => {
    const createRes = await createTeam(ownerToken, validPlayerIds);
    const teamId = createRes.body.id;
    const allPlayers = await prisma.player.findMany();
    const playerOutId = findTransferPair(createRes.body.squad, sonId, allPlayers);

    const res = await request(app)
      .post(`/api/teams/${teamId}/transfers`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({
        transfers: [{ playerInId: sonId, playerOutId }],
      });

    expect(res.status).toBe(403);
  });

  it('rejects transferring out captain or vice-captain', async () => {
    const createRes = await createTeam(ownerToken, validPlayerIds);
    const teamId = createRes.body.id;
    const captain = createRes.body.squad.find(
      (s: { isCaptain: boolean }) => s.isCaptain,
    )!;

    const res = await request(app)
      .post(`/api/teams/${teamId}/transfers`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        transfers: [{ playerInId: salahId, playerOutId: captain.playerId }],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('captain');
  });

  it('returns paginated transfer history', async () => {
    const createRes = await createTeam(ownerToken, validPlayerIds);
    const teamId = createRes.body.id;
    const allPlayers = await prisma.player.findMany();
    const playerOutId = findTransferPair(createRes.body.squad, sonId, allPlayers);
    const playerOut = createRes.body.squad.find(
      (s: { playerId: string }) => s.playerId === playerOutId,
    )!;

    await request(app)
      .post(`/api/teams/${teamId}/transfers`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        transfers: [{ playerInId: sonId, playerOutId }],
      });

    const res = await request(app)
      .get(`/api/teams/${teamId}/transfers`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({
      playerIn: { id: sonId, name: 'Son' },
      playerOut: { id: playerOutId, name: playerOut.player.name },
      gameweek: { number: 2 },
    });
    expect(res.body.meta.total).toBe(1);
  });

  it('includes transfer hit in team gameweek breakdown after scoring', async () => {
    const gw2 = await prisma.gameweek.findFirst({ where: { isCurrent: true } });

    const createRes = await createTeam(ownerToken, validPlayerIds);
    const teamId = createRes.body.id;
    const allPlayers = await prisma.player.findMany();
    const playerOutId = findTransferPair(createRes.body.squad, sonId, allPlayers);

    await prisma.team.update({
      where: { id: teamId },
      data: { freeTransfers: 0 },
    });

    await request(app)
      .post(`/api/teams/${teamId}/transfers`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        transfers: [{ playerInId: sonId, playerOutId }],
      });

    const updatedTeam = await request(app)
      .get(`/api/teams/${teamId}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    const starters = updatedTeam.body.squad.filter(
      (s: { isStarter: boolean }) => s.isStarter,
    );
    await seedGameweekWithStats(
      prisma,
      gw2!.id,
      starters.map((s: { playerId: string }) => ({
        playerId: s.playerId,
        points: 5,
      })),
    );
    await prisma.gameweek.update({
      where: { id: gw2!.id },
      data: { status: 'LIVE' },
    });

    const res = await request(app)
      .get(`/api/teams/${teamId}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.gameweekBreakdown?.transferHit).toBe(4);
  });
});

import http from 'http';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/config/db';
import { redis } from '../../src/config/redis';
import { CACHE_PREFIX, invalidateByPrefix } from '../../src/lib/cache';
import { SOCKET_EVENTS } from '../../src/sockets/liveScores.gateway';
import { initSocketServer, shutdownSocketServer } from '../../src/sockets/socketServer';
import {
  buildValidSquadPlayerIds,
  clearLeagueData,
  clearPhase3Data,
  seedPhase3Data,
} from '../helpers/seedTestData';
import { createTestSession } from '../helpers/auth';

const ownerUser = {
  email: 'cache-owner@example.com',
  password: 'password123',
  name: 'Cache Owner',
};

const memberUser = {
  email: 'cache-member@example.com',
  password: 'password123',
  name: 'Cache Member',
};

async function registerAndLogin(user: typeof ownerUser) {
  const session = await createTestSession({ email: user.email, name: user.name });
  return {
    token: session.token,
    userId: session.user.id,
  };
}

function connectTestSocket(token: string, port: number): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const socket = ioClient(`http://127.0.0.1:${port}`, {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', (err) => reject(err));
  });
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

describe('cache sync integration', () => {
  let server: http.Server;
  let port: number;
  let ownerAuth: { token: string; userId: string };
  let memberAuth: { token: string; userId: string };
  let validPlayerIds: string[];
  let ownerTeamId: string;
  let sonId: string;

  beforeAll(async () => {
    server = http.createServer(app);
    initSocketServer(server);
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const address = server.address();
        port = typeof address === 'object' && address ? address.port : 0;
        resolve();
      });
    });
  });

  beforeEach(async () => {
    await clearPhase3Data(prisma);
    await clearLeagueData(prisma);
    await prisma.user.deleteMany();
    await invalidateByPrefix(CACHE_PREFIX.standings);

    const keys = await redis.keys('refresh:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }

    await seedPhase3Data(prisma);
    const allPlayers = await prisma.player.findMany();
    validPlayerIds = buildValidSquadPlayerIds(allPlayers);
    sonId = allPlayers.find((player) => player.name === 'Son')!.id;

    ownerAuth = await registerAndLogin(ownerUser);
    memberAuth = await registerAndLogin(memberUser);

    const ownerTeamRes = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${ownerAuth.token}`)
      .send({
        name: 'Cache FC',
        season: '2025/26',
        playerIds: validPlayerIds,
      });
    ownerTeamId = ownerTeamRes.body.id as string;

    await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${memberAuth.token}`)
      .send({
        name: 'Member FC',
        season: '2025/26',
        playerIds: validPlayerIds,
      });
  });

  afterAll(async () => {
    await shutdownSocketServer();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.$disconnect();
    await redis.quit();
  });

  async function setupSharedLeague() {
    const createRes = await request(app)
      .post('/api/leagues')
      .set('Authorization', `Bearer ${ownerAuth.token}`)
      .send({
        name: 'Cache Sync League',
        type: 'CLASSIC',
        season: '2025/26',
      });

    const leagueId = createRes.body.id as string;
    const inviteCode = createRes.body.inviteCode as string;

    await request(app)
      .post('/api/leagues/join')
      .set('Authorization', `Bearer ${memberAuth.token}`)
      .send({ inviteCode });

    return leagueId;
  }

  it('deletes Redis standings keys after a transfer mutation', async () => {
    const leagueId = await setupSharedLeague();

    const standingsRes = await request(app)
      .get(`/api/leagues/${leagueId}/standings`)
      .set('Authorization', `Bearer ${ownerAuth.token}`);

    expect(standingsRes.status).toBe(200);

    const cacheKeys = await redis.keys(`${CACHE_PREFIX.standings}:${leagueId}:*`);
    expect(cacheKeys.length).toBeGreaterThan(0);

    const teamRes = await request(app)
      .get(`/api/teams/${ownerTeamId}`)
      .set('Authorization', `Bearer ${ownerAuth.token}`);

    const allPlayers = await prisma.player.findMany();
    const playerOutId = findTransferPair(teamRes.body.squad, sonId, allPlayers);

    const transferRes = await request(app)
      .post(`/api/teams/${ownerTeamId}/transfers`)
      .set('Authorization', `Bearer ${ownerAuth.token}`)
      .send({
        transfers: [{ playerInId: sonId, playerOutId }],
      });

    expect(transferRes.status).toBe(201);

    for (const key of cacheKeys) {
      expect(await redis.get(key)).toBeNull();
    }
  });

  it('emits standings:updated to league room members after a transfer', async () => {
    const leagueId = await setupSharedLeague();

    const memberSocket = await connectTestSocket(memberAuth.token, port);

    await new Promise<void>((resolve) => {
      memberSocket.emit('join:league', leagueId);
      setTimeout(resolve, 100);
    });

    const eventPromise = new Promise<{ leagueId: string }>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('standings:updated not received')), 3000);

      memberSocket.on(SOCKET_EVENTS.STANDINGS_UPDATED, (payload: { leagueId: string }) => {
        clearTimeout(timeout);
        resolve(payload);
      });
    });

    const teamRes = await request(app)
      .get(`/api/teams/${ownerTeamId}`)
      .set('Authorization', `Bearer ${ownerAuth.token}`);

    const allPlayers = await prisma.player.findMany();
    const playerOutId = findTransferPair(teamRes.body.squad, sonId, allPlayers);

    const transferRes = await request(app)
      .post(`/api/teams/${ownerTeamId}/transfers`)
      .set('Authorization', `Bearer ${ownerAuth.token}`)
      .send({
        transfers: [{ playerInId: sonId, playerOutId }],
      });

    expect(transferRes.status).toBe(201);

    const payload = await eventPromise;
    expect(payload.leagueId).toBe(leagueId);

    memberSocket.disconnect();
  });

  it('does not let a non-member join a league room', async () => {
    const leagueId = await setupSharedLeague();

    const outsider = await registerAndLogin({
      email: 'cache-outsider@example.com',
      password: 'password123',
      name: 'Cache Outsider',
    });

    await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${outsider.token}`)
      .send({
        name: 'Outsider FC',
        season: '2025/26',
        playerIds: validPlayerIds,
      });

    const outsiderSocket = await connectTestSocket(outsider.token, port);
    let received = false;

    outsiderSocket.on(SOCKET_EVENTS.STANDINGS_UPDATED, () => {
      received = true;
    });

    outsiderSocket.emit('join:league', leagueId);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const { getLiveScoresGateway } = await import('../../src/sockets/liveScores.gateway');
    getLiveScoresGateway()?.emitStandingsUpdated({ leagueId });

    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(received).toBe(false);

    outsiderSocket.disconnect();
  });
});

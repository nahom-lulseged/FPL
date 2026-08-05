import http from 'http';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/config/db';
import { redis } from '../../src/config/redis';
import { initSocketServer, shutdownSocketServer } from '../../src/sockets/socketServer';
import { recordPriceChangesFromSnapshots } from '../../src/jobs/priceChange.job';
import { seedPhase3Data, clearPhase3Data, buildValidSquadPlayerIds } from '../helpers/seedTestData';
import { createTestSession } from '../helpers/auth';

const userOne = {
  email: 'socket-owner@example.com',
  password: 'password123',
  name: 'Socket Owner',
};

const userTwo = {
  email: 'socket-other@example.com',
  password: 'password123',
  name: 'Socket Other',
};

async function registerUser(user: typeof userOne) {
  const session = await createTestSession({ email: user.email, name: user.name });
  return {
    accessToken: session.token,
    user: { id: session.user.id },
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

describe('socket integration', () => {
  let server: http.Server;
  let port: number;
  let ownerAuth: { accessToken: string; user: { id: string } };
  let otherAuth: { accessToken: string; user: { id: string } };
  let ownerTeamId: string;

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
    await prisma.user.deleteMany();
    const keys = await redis.keys('refresh:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }

    await seedPhase3Data(prisma);
    ownerAuth = await registerUser(userOne);
    otherAuth = await registerUser(userTwo);

    const teamRes = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${ownerAuth.accessToken}`)
      .send({
        name: 'Socket FC',
        season: '2025/26',
        playerIds: buildValidSquadPlayerIds(await prisma.player.findMany()),
      });

    ownerTeamId = teamRes.body.id as string;
  });

  afterAll(async () => {
    await shutdownSocketServer();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.$disconnect();
    await redis.quit();
  });

  it('rejects socket connections without a valid token', async () => {
    await expect(connectTestSocket('invalid-token', port)).rejects.toThrow();
  });

  it('allows owner to join team room and receive score updates', async () => {
    const socket = await connectTestSocket(ownerAuth.accessToken, port);

    await new Promise<void>((resolve, reject) => {
      socket.emit('join:team', ownerTeamId);
      setTimeout(resolve, 100);
      socket.on('connect_error', reject);
    });

    socket.on('team:score:updated', (payload) => {
      expect(payload.teamId).toBe(ownerTeamId);
      socket.disconnect();
    });

    const { getLiveScoresGateway } = await import('../../src/sockets/liveScores.gateway');
    getLiveScoresGateway()?.emitTeamScoreUpdated({
      teamId: ownerTeamId,
      gameweekNumber: 1,
      totalPoints: 42,
      pointsStatus: 'provisional',
    });

    await new Promise((resolve) => setTimeout(resolve, 200));
    socket.disconnect();
  });

  it('does not let another user join a team room they do not own', async () => {
    const socket = await connectTestSocket(otherAuth.accessToken, port);
    let received = false;

    socket.on('team:score:updated', () => {
      received = true;
    });

    socket.emit('join:team', ownerTeamId);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const { getLiveScoresGateway } = await import('../../src/sockets/liveScores.gateway');
    getLiveScoresGateway()?.emitTeamScoreUpdated({
      teamId: ownerTeamId,
      gameweekNumber: 1,
      totalPoints: 42,
      pointsStatus: 'provisional',
    });

    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(received).toBe(false);
    socket.disconnect();
  });
});

describe('price change job integration', () => {
  beforeEach(async () => {
    await clearPhase3Data(prisma);
    await prisma.playerPriceHistory.deleteMany();
    await seedPhase3Data(prisma);
  });

  it('records price history when player price changes', async () => {
    const player = await prisma.player.findFirst();
    expect(player).toBeTruthy();

    const beforePrices = new Map([[player!.id, player!.price]]);

    await prisma.player.update({
      where: { id: player!.id },
      data: { price: player!.price + 1 },
    });

    const changeCount = await recordPriceChangesFromSnapshots(beforePrices);
    expect(changeCount).toBe(1);

    const history = await prisma.playerPriceHistory.findMany({
      where: { playerId: player!.id },
    });

    expect(history).toHaveLength(1);
    expect(history[0]?.price).toBe(player!.price + 1);
  });
});

import request from 'supertest';
import { ChipType } from '@prisma/client';
import app from '../../src/app';
import { prisma } from '../../src/config/db';
import { redis } from '../../src/config/redis';
import { escapeCsvField } from '../../src/modules/admin/analytics/analytics.export';
import {
  buildValidSquadPlayerIds,
  clearChipData,
  clearLeagueData,
  clearPhase3Data,
  seedPhase3Data,
} from '../helpers/seedTestData';
import { createTestSession } from '../helpers/auth';

const adminUser = {
  email: 'admin-analytics@example.com',
  password: 'password123',
  name: 'Admin Analytics',
};

async function clearRedisKeys(): Promise<void> {
  const keys = await redis.keys('*');
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

async function getAdminToken(): Promise<string> {
  const session = await createTestSession({
    email: adminUser.email,
    name: adminUser.name,
    role: 'ADMIN',
    aal: 'aal2',
  });
  return session.token;
}

async function getUserToken(): Promise<string> {
  const session = await createTestSession({
    email: 'regular-analytics@example.com',
    name: 'Regular Analytics',
  });
  return session.token;
}

async function createUserWithTeam(
  email: string,
  displayName: string,
  playerIds: string[],
  players: Awaited<ReturnType<typeof seedPhase3Data>>['players'],
) {
  const user = await prisma.user.create({
    data: {
      email,
      displayName,
      displayNameLower: displayName.toLowerCase(),
    },
  });

  const team = await prisma.team.create({
    data: {
      userId: user.id,
      name: `${displayName} FC`,
      season: '2025/26',
      squad: {
        create: playerIds.slice(0, 15).map((playerId, index) => ({
          playerId,
          position: players.find((player) => player.id === playerId)!.position,
          isStarter: index < 11,
          benchOrder: index >= 11 ? index - 10 : null,
          isCaptain: index === 0,
          isViceCaptain: index === 1,
        })),
      },
    },
  });

  return { user, team };
}

describe('admin analytics routes', () => {
  let adminToken: string;
  let seed: Awaited<ReturnType<typeof seedPhase3Data>>;
  let playerInA: { id: string; name: string };
  let playerInB: { id: string; name: string };
  let playerOutC: { id: string; name: string };
  let playerOutD: { id: string; name: string };

  beforeEach(async () => {
    await clearPhase3Data(prisma);
    await clearLeagueData(prisma);
    await clearChipData(prisma);
    await prisma.user.deleteMany();
    await clearRedisKeys();

    seed = await seedPhase3Data(prisma);
    adminToken = await getAdminToken();

    playerInA = seed.players.find((player) => player.name === 'Salah')!;
    playerInB = seed.players.find((player) => player.name === 'Haaland')!;
    playerOutC = seed.players.find((player) => player.name === 'Jota')!;
    playerOutD = seed.players.find((player) => player.name === 'Grealish')!;

    const squadIds = buildValidSquadPlayerIds(seed.players);

    const teamConfigs = [
      { email: 't1@example.com', name: 'Team One' },
      { email: 't2@example.com', name: 'Team Two' },
      { email: 't3@example.com', name: 'Team Three' },
    ];

    const teams = [];
    for (const config of teamConfigs) {
      const { team } = await createUserWithTeam(
        config.email,
        config.name,
        squadIds,
        seed.players,
      );
      teams.push(team);
    }

    await prisma.transfer.createMany({
      data: [
        {
          teamId: teams[0]!.id,
          playerInId: playerInA.id,
          playerOutId: playerOutD.id,
          gameweekId: seed.gw2.id,
          pricePaid: 4,
        },
        {
          teamId: teams[1]!.id,
          playerInId: playerInA.id,
          playerOutId: playerOutD.id,
          gameweekId: seed.gw2.id,
          pricePaid: 4,
        },
        {
          teamId: teams[2]!.id,
          playerInId: playerInA.id,
          playerOutId: playerOutC.id,
          gameweekId: seed.gw2.id,
          pricePaid: 4,
        },
        {
          teamId: teams[0]!.id,
          playerInId: playerInB.id,
          playerOutId: playerOutC.id,
          gameweekId: seed.gw2.id,
          pricePaid: 4,
        },
        {
          teamId: teams[1]!.id,
          playerInId: playerInB.id,
          playerOutId: playerOutC.id,
          gameweekId: seed.gw2.id,
          pricePaid: 4,
        },
      ],
    });

    await prisma.chipUsage.createMany({
      data: [
        {
          teamId: teams[0]!.id,
          chipType: ChipType.WILDCARD,
          gameweekNumber: 1,
          season: '2025/26',
          wildcardNumber: 1,
        },
        {
          teamId: teams[1]!.id,
          chipType: ChipType.WILDCARD,
          gameweekNumber: 1,
          season: '2025/26',
          wildcardNumber: 1,
        },
        {
          teamId: teams[2]!.id,
          chipType: ChipType.WILDCARD,
          gameweekNumber: 2,
          season: '2025/26',
          wildcardNumber: 1,
        },
        {
          teamId: teams[0]!.id,
          chipType: ChipType.TRIPLE_CAPTAIN,
          gameweekNumber: 3,
          season: '2025/26',
        },
      ],
    });
  });

  afterAll(async () => {
    await clearPhase3Data(prisma);
    await clearLeagueData(prisma);
    await clearChipData(prisma);
    await prisma.user.deleteMany();
    await prisma.$disconnect();
    await redis.quit();
  });

  describe('access control', () => {
    it('returns 401 for analytics endpoints without a token', async () => {
      const res = await request(app).get('/api/admin/analytics/transfers');
      expect(res.status).toBe(401);
    });

    it('returns 403 for analytics endpoints with non-admin token', async () => {
      const userToken = await getUserToken();
      const res = await request(app)
        .get('/api/admin/analytics/chips')
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/admin/analytics/transfers', () => {
    it('returns exact transfer in/out counts for a gameweek', async () => {
      const res = await request(app)
        .get('/api/admin/analytics/transfers')
        .query({ gameweek: 2 })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.gameweek).toEqual({ id: seed.gw2.id, number: 2 });

      expect(res.body.transferredIn).toEqual([
        { playerId: playerInA.id, playerName: 'Salah', count: 3 },
        { playerId: playerInB.id, playerName: 'Haaland', count: 2 },
      ]);

      expect(res.body.transferredOut).toEqual([
        { playerId: playerOutC.id, playerName: 'Jota', count: 3 },
        { playerId: playerOutD.id, playerName: 'Grealish', count: 2 },
      ]);
    });

    it('defaults to current gameweek when gameweek param is omitted', async () => {
      const res = await request(app)
        .get('/api/admin/analytics/transfers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.gameweek.number).toBe(2);
    });

    it('returns 404 for unknown gameweek number', async () => {
      const res = await request(app)
        .get('/api/admin/analytics/transfers')
        .query({ gameweek: 99 })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/admin/analytics/chips', () => {
    it('returns chip usage distribution and per-gameweek breakdown', async () => {
      const res = await request(app)
        .get('/api/admin/analytics/chips')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.byType).toEqual({
        WILDCARD: 3,
        FREE_HIT: 0,
        BENCH_BOOST: 0,
        TRIPLE_CAPTAIN: 1,
      });

      expect(res.body.byGameweek).toEqual(
        expect.arrayContaining([
          { chipType: 'WILDCARD', gameweekNumber: 1, count: 2 },
          { chipType: 'WILDCARD', gameweekNumber: 2, count: 1 },
          { chipType: 'TRIPLE_CAPTAIN', gameweekNumber: 3, count: 1 },
        ]),
      );
      expect(res.body.byGameweek).toHaveLength(3);
    });
  });

  describe('GET /api/admin/analytics/growth', () => {
    it('returns zero-filled daily registration and team buckets', async () => {
      const day1 = new Date('2025-06-01T12:00:00.000Z');
      const day2 = new Date('2025-06-02T12:00:00.000Z');

      const growthUsers = await Promise.all([
        prisma.user.create({
          data: {
            email: 'growth1@example.com',
            displayName: 'Growth One',
            displayNameLower: 'growth one',
            createdAt: day1,
          },
        }),
        prisma.user.create({
          data: {
            email: 'growth2@example.com',
            displayName: 'Growth Two',
            displayNameLower: 'growth two',
            createdAt: day1,
          },
        }),
        prisma.user.create({
          data: {
            email: 'growth3@example.com',
            displayName: 'Growth Three',
            displayNameLower: 'growth three',
            createdAt: day2,
          },
        }),
      ]);

      await prisma.team.createMany({
        data: [
          {
            userId: growthUsers[0]!.id,
            name: 'Growth FC 1',
            season: '2025/26',
            createdAt: day1,
          },
          {
            userId: growthUsers[1]!.id,
            name: 'Growth FC 2',
            season: '2025/26',
            createdAt: day1,
          },
          {
            userId: growthUsers[2]!.id,
            name: 'Growth FC 3',
            season: '2025/26',
            createdAt: day2,
          },
        ],
      });

      const res = await request(app)
        .get('/api/admin/analytics/growth')
        .query({
          from: '2025-06-01',
          to: '2025-06-03',
          granularity: 'day',
        })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.granularity).toBe('day');
      expect(res.body.buckets).toHaveLength(3);

      const day1Bucket = res.body.buckets.find(
        (bucket: { period: string }) => bucket.period.startsWith('2025-06-01'),
      );
      const day2Bucket = res.body.buckets.find(
        (bucket: { period: string }) => bucket.period.startsWith('2025-06-02'),
      );
      const day3Bucket = res.body.buckets.find(
        (bucket: { period: string }) => bucket.period.startsWith('2025-06-03'),
      );

      expect(day1Bucket.registrations).toBe(2);
      expect(day1Bucket.teamsCreated).toBe(2);
      expect(day2Bucket.registrations).toBe(1);
      expect(day2Bucket.teamsCreated).toBe(1);
      expect(day3Bucket.registrations).toBe(0);
      expect(day3Bucket.teamsCreated).toBe(0);
    });

    it('returns consistent cached responses on repeat requests', async () => {
      const query = {
        from: '2025-06-01',
        to: '2025-06-03',
        granularity: 'day',
      };

      const first = await request(app)
        .get('/api/admin/analytics/growth')
        .query(query)
        .set('Authorization', `Bearer ${adminToken}`);

      const second = await request(app)
        .get('/api/admin/analytics/growth')
        .query(query)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(second.body).toEqual(first.body);
    });
  });

  describe('GET /api/admin/analytics/export/:entity', () => {
    it('streams a valid users CSV with escaped fields', async () => {
      await prisma.user.create({
        data: {
          email: 'csv,test@example.com',
          displayName: 'Quote "User"',
          displayNameLower: 'quote "user"',
        },
      });

      const res = await request(app)
        .get('/api/admin/analytics/export/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');

      const lines = res.text.trim().split('\n');
      expect(lines[0]).toBe(
        'id,email,displayName,role,isSuspended,createdAt,teamCount',
      );
      expect(lines.length).toBeGreaterThan(1);

      const escapedEmail = escapeCsvField('csv,test@example.com');
      const escapedName = escapeCsvField('Quote "User"');
      const dataLine = lines.find((line) => line.includes(escapedEmail));
      expect(dataLine).toBeDefined();
      expect(dataLine).toContain(escapedName);
    });

    it('returns 400 for unsupported export entity', async () => {
      const res = await request(app)
        .get('/api/admin/analytics/export/teams')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
    });
  });

  describe('escapeCsvField', () => {
    it('escapes commas and quotes', () => {
      expect(escapeCsvField('csv,test@example.com')).toBe('"csv,test@example.com"');
      expect(escapeCsvField('Quote "User"')).toBe('"Quote ""User"""');
    });
  });
});

import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/config/db';
import {
  clearPhase2Data,
  seedPhase2Data,
} from '../helpers/seedTestData';

describe('players integration', () => {
  let liverpoolId: string;

  beforeAll(async () => {
    await clearPhase2Data(prisma);
    const seeded = await seedPhase2Data(prisma);
    liverpoolId = seeded.liverpool.id;
  }, 180_000);

  afterAll(async () => {
    await clearPhase2Data(prisma);
    await prisma.$disconnect();
  }, 180_000);

  it('returns paginated player list', async () => {
    const res = await request(app).get('/api/players');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(5);
    expect(res.body.meta).toMatchObject({
      page: 1,
      limit: 50,
      total: 5,
      totalPages: 1,
    });
    expect(res.body.data[0]).toHaveProperty('realTeam');
    expect(res.body.data[0]).toHaveProperty('totalPoints');
    expect(res.body.meta).toHaveProperty('priceBounds');
  });

  it('filters by position', async () => {
    const res = await request(app).get('/api/players?position=GK');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].position).toBe('GK');
  });

  it('filters by search term', async () => {
    const res = await request(app).get('/api/players?search=Salah');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Salah');
  });

  it('filters by team and price range', async () => {
    const res = await request(app).get(
      `/api/players?teamId=${liverpoolId}&minPrice=80&maxPrice=150`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Salah');
  });

  it('supports pagination', async () => {
    const res = await request(app).get('/api/players?page=1&limit=2');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta.totalPages).toBe(3);
  });

  it('filters by comma-separated ids', async () => {
    const players = await prisma.player.findMany({
      where: { name: { in: ['Salah', 'Haaland'] } },
      select: { id: true, name: true },
    });
    expect(players).toHaveLength(2);
    const ids = players.map((p) => p.id).join(',');

    const res = await request(app).get(`/api/players?ids=${encodeURIComponent(ids)}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta.total).toBe(2);
    const names = res.body.data.map((p: { name: string }) => p.name).sort();
    expect(names).toEqual(['Haaland', 'Salah']);
  });

  it('rejects invalid position', async () => {
    const res = await request(app).get('/api/players?position=INVALID');

    expect(res.status).toBe(400);
  });

  it('sorts by totalPoints descending by default', async () => {
    const res = await request(app).get('/api/players');

    expect(res.status).toBe(200);
    expect(res.body.data[0].name).toBe('Haaland');
    expect(res.body.data[0].totalPoints).toBe(200);
  });

  it('sorts by price ascending', async () => {
    const res = await request(app).get('/api/players?sortBy=price&sortDir=asc');

    expect(res.status).toBe(200);
    expect(res.body.data[0].price).toBe(45);
    expect(res.body.data[0].name).toBe('Raya');
  });

  it('sorts by selectedByPercent descending', async () => {
    const res = await request(app).get('/api/players?sortBy=selectedByPercent&sortDir=desc');

    expect(res.status).toBe(200);
    expect(res.body.data[0].name).toBe('Haaland');
  });

  it('returns priceBounds in meta for filtered pool', async () => {
    const res = await request(app).get('/api/players?position=MID');

    expect(res.status).toBe(200);
    expect(res.body.meta.priceBounds).toMatchObject({
      min: expect.any(Number),
      max: expect.any(Number),
      q1: expect.any(Number),
      q2: expect.any(Number),
      q3: expect.any(Number),
    });
    expect(res.body.meta.priceBounds.min).toBe(70);
    expect(res.body.meta.priceBounds.max).toBe(85);
  });

  it('rejects invalid sortBy', async () => {
    const res = await request(app).get('/api/players?sortBy=invalidField');

    expect(res.status).toBe(400);
  });

  it('returns player detail with history and historyPast', async () => {
    const salah = await prisma.player.findFirst({ where: { name: 'Salah' } });
    expect(salah).toBeTruthy();

    const gw1 = await prisma.gameweek.findUnique({ where: { number: 1 } });
    expect(gw1).toBeTruthy();

    await prisma.playerGameweekStats.create({
      data: {
        playerId: salah!.id,
        gameweekId: gw1!.id,
        minutes: 90,
        goals: 1,
        assists: 0,
        cleanSheet: false,
        points: 8,
        bonus: 2,
        bps: 30,
        wasHome: true,
        opponentTeamFplId: 1,
        fixtureFplId: 1,
        value: 85,
      },
    });

    await prisma.playerSeasonHistory.create({
      data: {
        playerId: salah!.id,
        seasonName: '2024/25',
        startCost: 125,
        endCost: 145,
        totalPoints: 300,
        minutes: 3000,
        goalsScored: 25,
        assists: 15,
        cleanSheets: 10,
      },
    });

    await prisma.player.update({
      where: { id: salah!.id },
      data: { elementSummarySyncedAt: new Date() },
    });

    const res = await request(app).get(`/api/players/${salah!.id}`);

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Salah');
    expect(res.body.fplId).toBe(102);
    expect(res.body.history).toHaveLength(1);
    expect(res.body.history[0]).toMatchObject({
      gameweek: 1,
      points: 8,
      minutes: 90,
      goals: 1,
      wasHome: true,
      value: 85,
      opponent: { shortName: 'ARS' },
    });
    expect(res.body.historyPast).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          seasonName: '2024/25',
          totalPoints: 300,
          goalsScored: 25,
        }),
      ]),
    );
    expect(res.body).toHaveProperty('upcomingFixtures');
  });
});

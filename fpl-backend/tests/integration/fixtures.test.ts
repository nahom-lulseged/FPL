import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/config/db';
import {
  clearPhase2Data,
  seedPhase2Data,
} from '../helpers/seedTestData';

describe('fixtures integration', () => {
  let arsenalId: string;

  beforeEach(async () => {
    await clearPhase2Data(prisma);
    const seeded = await seedPhase2Data(prisma);
    arsenalId = seeded.arsenal.id;
  });

  afterAll(async () => {
    await clearPhase2Data(prisma);
    await prisma.$disconnect();
  });

  it('returns paginated fixture list', async () => {
    const res = await request(app).get('/api/fixtures');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0]).toMatchObject({
      homeDifficulty: expect.any(Number),
      awayDifficulty: expect.any(Number),
      started: expect.any(Boolean),
      finished: expect.any(Boolean),
      gameweek: expect.objectContaining({ number: expect.any(Number) }),
      homeTeam: expect.objectContaining({ shortName: expect.any(String) }),
      awayTeam: expect.objectContaining({ shortName: expect.any(String) }),
    });
    expect(res.body.data[0]).toHaveProperty('minutes');
  });

  it('filters by gameweek', async () => {
    const res = await request(app).get('/api/fixtures?gameweek=1');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].gameweek.number).toBe(1);
    expect(res.body.data[0].homeDifficulty).toBe(4);
    expect(res.body.data[0].awayDifficulty).toBe(3);
  });

  it('filters by team and includes fdrForTeam', async () => {
    const res = await request(app).get(
      `/api/fixtures?teamId=${arsenalId}&gameweek=1`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].fdrForTeam).toBe(4);
    expect(res.body.data[0].homeTeam.id).toBe(arsenalId);
  });

  it('rejects invalid gameweek', async () => {
    const res = await request(app).get('/api/fixtures?gameweek=0');

    expect(res.status).toBe(400);
  });
});

describe('gameweeks integration', () => {
  beforeEach(async () => {
    await clearPhase2Data(prisma);
    await seedPhase2Data(prisma);
  });

  afterAll(async () => {
    await clearPhase2Data(prisma);
    await prisma.$disconnect();
  });

  it('lists all gameweeks', async () => {
    const res = await request(app).get('/api/gameweeks');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].number).toBe(1);
    expect(res.body.data[1].isCurrent).toBe(true);
  });

  it('returns current gameweek', async () => {
    const res = await request(app).get('/api/gameweeks/current');

    expect(res.status).toBe(200);
    expect(res.body.number).toBe(2);
    expect(res.body.isCurrent).toBe(true);
  });

  it('falls back to the next upcoming gameweek when no current flag exists', async () => {
    await prisma.gameweek.updateMany({
      data: { isCurrent: false },
    });
    await prisma.gameweek.create({
      data: {
        number: 3,
        deadline: new Date('2099-08-29T17:30:00Z'),
        status: 'UPCOMING',
        isCurrent: false,
      },
    });

    const res = await request(app).get('/api/gameweeks/current');

    expect(res.status).toBe(200);
    expect(res.body.number).toBe(3);
    expect(res.body.status).toBe('UPCOMING');
    expect(res.body.isCurrent).toBe(false);
  });

  it('falls forward from an expired current gameweek to the next upcoming gameweek', async () => {
    await prisma.gameweek.update({
      where: { number: 2 },
      data: {
        deadline: new Date('2025-08-22T17:30:00Z'),
        status: 'FINISHED',
        isCurrent: true,
      },
    });
    await prisma.gameweek.create({
      data: {
        number: 3,
        deadline: new Date('2099-08-29T17:30:00Z'),
        status: 'UPCOMING',
        isCurrent: false,
      },
    });

    const res = await request(app).get('/api/gameweeks/current');

    expect(res.status).toBe(200);
    expect(res.body.number).toBe(3);
    expect(res.body.status).toBe('UPCOMING');
  });

  it('returns 404 when no current or upcoming future gameweek exists', async () => {
    await prisma.gameweek.updateMany({
      data: {
        deadline: new Date('2025-08-22T17:30:00Z'),
        status: 'FINISHED',
        isCurrent: false,
      },
    });

    const res = await request(app).get('/api/gameweeks/current');

    expect(res.status).toBe(404);
  });
});

import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/config/db';
import { redis } from '../../src/config/redis';
import { scoreGameweek } from '../../src/modules/scoring/scoring.job';
import {
  buildValidSquadPlayerIds,
  clearPhase3Data,
  seedGameweekWithStats,
  seedPhase3Data,
} from '../helpers/seedTestData';
import { createTestSession } from '../helpers/auth';

const user = {
  email: 'scoring@example.com',
  password: 'password123',
  name: 'Scoring User',
};

async function registerAndLogin() {
  const session = await createTestSession({ email: user.email, name: user.name });
  return session.token;
}

describe('teams scoring integration', () => {
  let token: string;
  let validPlayerIds: string[];
  let gw2Id: string;

  beforeEach(async () => {
    await clearPhase3Data(prisma);
    await prisma.user.deleteMany();
    const keys = await redis.keys('refresh:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }

    const seed = await seedPhase3Data(prisma);
    gw2Id = seed.gw2.id;
    const allPlayers = await prisma.player.findMany();
    validPlayerIds = buildValidSquadPlayerIds(allPlayers);
    token = await registerAndLogin();
  });

  afterAll(async () => {
    await clearPhase3Data(prisma);
    await prisma.user.deleteMany();
    await prisma.$disconnect();
    await redis.quit();
  });

  it('scores gameweek and returns breakdown via GET /teams/:id/gameweeks/:gw', async () => {
    const createRes = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Scoring FC',
        season: '2025/26',
        playerIds: validPlayerIds,
      });

    expect(createRes.status).toBe(201);
    const teamId = createRes.body.id as string;
    const captain = createRes.body.squad.find(
      (s: { isCaptain: boolean }) => s.isCaptain,
    );
    const starters = createRes.body.squad.filter(
      (s: { isStarter: boolean }) => s.isStarter,
    );

    await seedGameweekWithStats(
      prisma,
      gw2Id,
      createRes.body.squad.map(
        (s: { playerId: string; isStarter: boolean }) => ({
          playerId: s.playerId,
          minutes: s.isStarter ? 90 : 0,
          points: s.isStarter ? 2 : 0,
        }),
      ),
    );

    await prisma.playerGameweekStats.update({
      where: {
        playerId_gameweekId: {
          playerId: captain.playerId,
          gameweekId: gw2Id,
        },
      },
      data: { points: 10, minutes: 90 },
    });

    await scoreGameweek(2);

    const breakdownRes = await request(app)
      .get(`/api/teams/${teamId}/gameweeks/2`)
      .set('Authorization', `Bearer ${token}`);

    expect(breakdownRes.status).toBe(200);
    expect(breakdownRes.body.gameweek.number).toBe(2);
    expect(breakdownRes.body.totalPoints).toBeGreaterThan(0);

    const captainRow = breakdownRes.body.players.find(
      (p: { playerId: string }) => p.playerId === captain.playerId,
    );
    expect(captainRow.captainMultiplier).toBe(2);
    expect(captainRow.effectivePoints).toBe(20);
    expect(captainRow.eventStats).toMatchObject({
      minutes: 90,
      points: 10,
    });

    const starterWithStats = breakdownRes.body.players.find(
      (p: { isStarter: boolean; eventStats: unknown }) => p.isStarter && p.eventStats,
    );
    expect(starterWithStats?.eventStats).toMatchObject({
      minutes: 90,
      points: 2,
    });

    const expectedStartersPoints =
      starters.length * 2 - 2 + 10;
    expect(breakdownRes.body.startersPoints).toBe(expectedStartersPoints);
    expect(breakdownRes.body.captainBonus).toBe(10);
    expect(breakdownRes.body.totalPoints).toBe(
      expectedStartersPoints + 10,
    );

    const teamRes = await request(app)
      .get(`/api/teams/${teamId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(teamRes.body.gameweekTotal).toBe(breakdownRes.body.totalPoints);
    expect(teamRes.body.totalPoints).toBe(breakdownRes.body.totalPoints);
  });

  it('returns null points for upcoming gameweek', async () => {
    await prisma.gameweek.updateMany({ data: { isCurrent: false } });
    const upcoming = await prisma.gameweek.create({
      data: {
        number: 99,
        deadline: new Date('2099-12-01T17:30:00Z'),
        status: 'UPCOMING',
        isCurrent: true,
      },
    });

    const createRes = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Future FC',
        season: '2025/26',
        playerIds: validPlayerIds,
      });

    const res = await request(app)
      .get(`/api/teams/${createRes.body.id}/gameweeks/99`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.totalPoints).toBeNull();
    expect(res.body.gameweek.status).toBe('UPCOMING');

    void upcoming;
  });
});

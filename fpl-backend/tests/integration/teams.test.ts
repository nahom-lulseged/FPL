import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/config/db';
import { redis } from '../../src/config/redis';
import {
  buildValidSquadPlayerIds,
  clearPhase3Data,
  clearUserStateData,
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
  const session = await createTestSession({
    email: user.email,
    name: user.name,
  });
  return session.token;
}

type SquadPlayerRow = {
  playerId: string;
  position: string;
  isStarter: boolean;
  benchOrder: number | null;
  isCaptain: boolean;
  isViceCaptain: boolean;
  player: { price: number };
};

/** Build a valid lineup that benches `benchTargetId` and assigns new C/VC from starters. */
function buildLineupBenchingPlayer(squad: SquadPlayerRow[], benchTargetId: string) {
  const target = squad.find((s) => s.playerId === benchTargetId);
  if (!target?.isStarter || target.position === 'GK') {
    throw new Error('bench target must be an outfield starter');
  }

  const samePosBench = squad.find(
    (s) => !s.isStarter && s.position === target.position,
  );
  if (!samePosBench) {
    throw new Error(`no bench player at position ${target.position}`);
  }

  const starterIds = new Set(
    squad.filter((s) => s.isStarter).map((s) => s.playerId),
  );
  starterIds.delete(target.playerId);
  starterIds.add(samePosBench.playerId);

  const benchPlayers = squad.filter((s) => !starterIds.has(s.playerId));
  const benchGk = benchPlayers.find((s) => s.position === 'GK')!;
  const benchOutfield = benchPlayers.filter((s) => s.position !== 'GK');
  const benchOrderMap = new Map<string, number>([
    [benchGk.playerId, 1],
    [benchOutfield[0]!.playerId, 2],
    [benchOutfield[1]!.playerId, 3],
    [benchOutfield[2]!.playerId, 4],
  ]);

  const outfieldStarters = squad.filter(
    (s) => starterIds.has(s.playerId) && s.position !== 'GK',
  );
  const sortedOutfield = [...outfieldStarters].sort(
    (a, b) => b.player.price - a.player.price,
  );
  const captainId = sortedOutfield[0]!.playerId;
  const viceCaptainId = sortedOutfield[1]!.playerId;

  return squad.map((s) => ({
    playerId: s.playerId,
    isStarter: starterIds.has(s.playerId),
    benchOrder: starterIds.has(s.playerId) ? null : (benchOrderMap.get(s.playerId) ?? null),
    isCaptain: s.playerId === captainId,
    isViceCaptain: s.playerId === viceCaptainId,
  }));
}

describe('teams integration', () => {
  let ownerToken: string;
  let otherToken: string;
  let validPlayerIds: string[];
  let jotaId: string;

  beforeAll(async () => {
    await clearPhase3Data(prisma);
    await seedPhase3Data(prisma);
  }, 180_000);

  beforeEach(async () => {
    await clearUserStateData(prisma);
    const keys = await redis.keys('refresh:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }

    const allPlayers = await prisma.player.findMany();
    validPlayerIds = buildValidSquadPlayerIds(allPlayers);
    jotaId = allPlayers.find((player) => player.name === 'Jota')!.id;

    ownerToken = await registerAndLogin(userOne);
    otherToken = await registerAndLogin(userTwo);
  });

  afterAll(async () => {
    await clearPhase3Data(prisma);
    await clearUserStateData(prisma);
    await prisma.$disconnect();
    await redis.quit();
  });

  it('creates a team with default 4-4-2 lineup', async () => {
    const res = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'My FPL Team',
        season: '2025/26',
        playerIds: validPlayerIds,
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('My FPL Team');
    expect(res.body.squad).toHaveLength(15);
    expect(res.body.bankBalance + res.body.squadValue).toBe(1000);

    const starters = res.body.squad.filter((s: { isStarter: boolean }) => s.isStarter);
    expect(starters).toHaveLength(11);

    const captains = res.body.squad.filter((s: { isCaptain: boolean }) => s.isCaptain);
    const vices = res.body.squad.filter((s: { isViceCaptain: boolean }) => s.isViceCaptain);
    expect(captains).toHaveLength(1);
    expect(vices).toHaveLength(1);
  });

  it('creates a team with a custom lineup that would bench the default captain', async () => {
    const defaultRes = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({
        name: 'Default Reference',
        season: '2025/26',
        playerIds: validPlayerIds,
      });
    expect(defaultRes.status).toBe(201);

    const defaultCaptainId = defaultRes.body.squad.find(
      (s: { isCaptain: boolean }) => s.isCaptain,
    ).playerId as string;

    const squad = defaultRes.body.squad as SquadPlayerRow[];
    const customLineup = buildLineupBenchingPlayer(squad, defaultCaptainId);
    expect(customLineup.find((s) => s.playerId === defaultCaptainId)?.isStarter).toBe(false);

    const captainId = customLineup.find((s) => s.isCaptain)!.playerId;
    const viceCaptainId = customLineup.find((s) => s.isViceCaptain)!.playerId;

    const res = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Custom Lineup Team',
        season: '2025/26',
        playerIds: validPlayerIds,
        lineup: customLineup,
      });

    expect(res.status).toBe(201);
    const captain = res.body.squad.find((s: { isCaptain: boolean }) => s.isCaptain);
    const vice = res.body.squad.find((s: { isViceCaptain: boolean }) => s.isViceCaptain);
    expect(captain.playerId).toBe(captainId);
    expect(vice.playerId).toBe(viceCaptainId);
    expect(captain.isStarter).toBe(true);
    expect(vice.isStarter).toBe(true);
    expect(
      res.body.squad.find((s: { playerId: string }) => s.playerId === defaultCaptainId).isStarter,
    ).toBe(false);
  });

  it('updates lineup and captain atomically when new formation benches previous captain', async () => {
    const createRes = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Atomic Lineup Team',
        season: '2025/26',
        playerIds: validPlayerIds,
      });
    expect(createRes.status).toBe(201);

    const teamId = createRes.body.id as string;
    const defaultCaptainId = createRes.body.squad.find(
      (s: { isCaptain: boolean }) => s.isCaptain,
    ).playerId as string;

    const squad = createRes.body.squad as SquadPlayerRow[];
    const customLineup = buildLineupBenchingPlayer(squad, defaultCaptainId);
    expect(customLineup.find((s) => s.playerId === defaultCaptainId)?.isStarter).toBe(false);

    const captainId = customLineup.find((s) => s.isCaptain)!.playerId;
    const viceCaptainId = customLineup.find((s) => s.isViceCaptain)!.playerId;

    const withoutCaptainRes = await request(app)
      .patch(`/api/teams/${teamId}/lineup`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        lineup: customLineup.map(({ playerId, isStarter, benchOrder }) => ({
          playerId,
          isStarter,
          benchOrder,
        })),
      });
    expect(withoutCaptainRes.status).toBe(400);
    expect(withoutCaptainRes.body.error).toContain('Captain and vice-captain');

    const res = await request(app)
      .patch(`/api/teams/${teamId}/lineup`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        lineup: customLineup.map(({ playerId, isStarter, benchOrder }) => ({
          playerId,
          isStarter,
          benchOrder,
        })),
        captainId,
        viceCaptainId,
      });

    expect(res.status).toBe(200);
    const captain = res.body.squad.find((s: { isCaptain: boolean }) => s.isCaptain);
    const vice = res.body.squad.find((s: { isViceCaptain: boolean }) => s.isViceCaptain);
    expect(captain.playerId).toBe(captainId);
    expect(vice.playerId).toBe(viceCaptainId);
    expect(captain.isStarter).toBe(true);
    expect(vice.isStarter).toBe(true);
    expect(
      res.body.squad.find((s: { playerId: string }) => s.playerId === defaultCaptainId).isStarter,
    ).toBe(false);
  });

  it('rejects duplicate team for same season', async () => {
    await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Team One',
        season: '2025/26',
        playerIds: validPlayerIds,
      });

    const res = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Team Two',
        season: '2025/26',
        playerIds: validPlayerIds,
      });

    expect(res.status).toBe(409);
  });

  it('rejects squad over budget', async () => {
    const playerIds = buildValidSquadPlayerIds(await prisma.player.findMany());
    await prisma.player.updateMany({
      where: { id: { in: playerIds } },
      data: { price: 80 },
    });

    const res = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Expensive Team',
        season: '2025/26',
        playerIds,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('budget');
  });

  it('rejects more than 3 players from one club', async () => {
    const allPlayers = await prisma.player.findMany({ include: { realTeam: true } });
    const validIds = buildValidSquadPlayerIds(allPlayers);
    const jesus = allPlayers.find((player) => player.name === 'Jesus')!;
    const replaceable = allPlayers.find(
      (player) =>
        validIds.includes(player.id) &&
        player.realTeam.shortName !== 'ARS' &&
        player.position === 'FWD',
    )!;

    const playerIds = validIds.map((id) => (id === replaceable.id ? jesus.id : id));

    const res = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Invalid Club',
        season: '2025/26',
        playerIds,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('club');
  });

  it('allows any authenticated user to read a team', async () => {
    const createRes = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Public Read Team',
        season: '2025/26',
        playerIds: validPlayerIds,
      });

    const teamId = createRes.body.id;

    const res = await request(app)
      .get(`/api/teams/${teamId}`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(teamId);
  });

  it('rejects captain update from non-owner', async () => {
    const createRes = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Owner Team',
        season: '2025/26',
        playerIds: validPlayerIds,
      });

    const teamId = createRes.body.id;
    const vice = createRes.body.squad.find((s: { isViceCaptain: boolean }) => s.isViceCaptain);

    const res = await request(app)
      .patch(`/api/teams/${teamId}/captain`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({
        captainId: vice.playerId,
        viceCaptainId: jotaId,
      });

    expect(res.status).toBe(403);
  });

  it('updates captain for owner', async () => {
    const createRes = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Captain Team',
        season: '2025/26',
        playerIds: validPlayerIds,
      });

    const teamId = createRes.body.id;
    const starters = createRes.body.squad.filter(
      (s: { isStarter: boolean }) => s.isStarter,
    );
    const newCaptain = starters.find(
      (s: { isCaptain: boolean; isViceCaptain: boolean }) =>
        !s.isCaptain && !s.isViceCaptain,
    )!;
    const currentVice = createRes.body.squad.find(
      (s: { isViceCaptain: boolean }) => s.isViceCaptain,
    )!;

    const res = await request(app)
      .patch(`/api/teams/${teamId}/captain`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        captainId: newCaptain.playerId,
        viceCaptainId: currentVice.playerId,
      });

    expect(res.status).toBe(200);
    const captain = res.body.squad.find((s: { isCaptain: boolean }) => s.isCaptain);
    expect(captain.playerId).toBe(newCaptain.playerId);
  });

  it('rejects invalid lineup formation', async () => {
    const createRes = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Lineup Team',
        season: '2025/26',
        playerIds: validPlayerIds,
      });

    const teamId = createRes.body.id;
    const squad = createRes.body.squad as Array<{
      playerId: string;
      position: string;
      isStarter: boolean;
      benchOrder: number | null;
    }>;

    const gks = squad.filter((s) => s.position === 'GK');
    const starterGk = gks.find((gk) => gk.isStarter)!;
    const benchGk = gks.find((gk) => !gk.isStarter)!;
    const outfieldBench = squad.find((s) => !s.isStarter && s.position !== 'GK')!;

    const invalidLineup = squad.map((s) => {
      if (s.playerId === starterGk.playerId || s.playerId === benchGk.playerId) {
        return { playerId: s.playerId, isStarter: true, benchOrder: null };
      }
      if (s.playerId === outfieldBench.playerId) {
        return {
          playerId: s.playerId,
          isStarter: false,
          benchOrder: outfieldBench.benchOrder,
        };
      }
      return {
        playerId: s.playerId,
        isStarter: s.isStarter,
        benchOrder: s.benchOrder,
      };
    });

    const res = await request(app)
      .patch(`/api/teams/${teamId}/lineup`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ lineup: invalidLineup });

    expect(res.status).toBe(400);
  });

  it('rejects lineup update after deadline', async () => {
    await prisma.gameweek.updateMany({
      where: { isCurrent: true },
      data: { deadline: new Date('2020-01-01T00:00:00Z') },
    });

    const createRes = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Deadline Team',
        season: '2025/26',
        playerIds: validPlayerIds,
      });

    const teamId = createRes.body.id;
    const lineup = createRes.body.squad.map(
      (s: { playerId: string; isStarter: boolean; benchOrder: number | null }) => ({
        playerId: s.playerId,
        isStarter: s.isStarter,
        benchOrder: s.benchOrder,
      }),
    );

    const res = await request(app)
      .patch(`/api/teams/${teamId}/lineup`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ lineup });

    expect(res.status).toBe(403);
  });

  it('returns gameweek points for historical gameweek', async () => {
    const createRes = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Points Team',
        season: '2025/26',
        playerIds: validPlayerIds,
      });

    const teamId = createRes.body.id;

    const res = await request(app)
      .get(`/api/teams/${teamId}?gameweek=1`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.gameweek).toMatchObject({ number: 1, status: 'FINISHED' });

    const jota = res.body.squad.find((s: { playerId: string }) => s.playerId === jotaId);
    expect(jota.gameweekPoints).toBe(11);
    expect(jota.pointsStatus).toBe('confirmed');
  });

  it('returns 404 for GET /api/me/team when user has no team', async () => {
    const res = await request(app)
      .get('/api/me/team')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(404);
  });

  it('returns team ref for GET /api/me/team after create', async () => {
    await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Lookup Team',
        season: '2025/26',
        playerIds: validPlayerIds,
      });

    const res = await request(app)
      .get('/api/me/team?season=2025/26')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      name: 'Lookup Team',
      season: '2025/26',
    });
    expect(res.body.teamId).toBeTruthy();
  });

  it('lists real teams', async () => {
    const res = await request(app).get('/api/real-teams');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0]).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      shortName: expect.any(String),
    });
  });

  it('returns season points history for a team', async () => {
    const createRes = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'History Team',
        season: '2025/26',
        playerIds: validPlayerIds,
      });
    expect(createRes.status).toBe(201);
    const teamId = createRes.body.id as string;

    const gw1 = await prisma.gameweek.findUnique({ where: { number: 1 } });
    expect(gw1).toBeTruthy();

    await prisma.teamGameweekScore.create({
      data: {
        teamId,
        gameweekId: gw1!.id,
        startersPoints: 50,
        captainBonus: 10,
        benchPoints: 2,
        transferHit: 4,
        totalPoints: 58,
      },
    });

    await prisma.chipUsage.create({
      data: {
        teamId,
        chipType: 'TRIPLE_CAPTAIN',
        gameweekNumber: 1,
        season: '2025/26',
      },
    });

    const res = await request(app)
      .get(`/api/teams/${teamId}/history`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.teamId).toBe(teamId);
    expect(res.body.history).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          gameweek: 1,
          points: 58,
          transferHit: 4,
          chip: 'TRIPLE_CAPTAIN',
          totalPointsCumulative: 58,
        }),
      ]),
    );
  });
});

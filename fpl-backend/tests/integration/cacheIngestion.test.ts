import { prisma } from '../../src/config/db';
import { redis } from '../../src/config/redis';
import { CACHE_PREFIX } from '../../src/lib/cache';
import * as fplClient from '../../src/modules/ingestion/fpl.client';
import * as ingestionService from '../../src/modules/ingestion/ingestion.service';

const PLAYERS_CACHE_KEY = `${CACHE_PREFIX.players}:testhash`;
const FIXTURES_CACHE_KEY = `${CACHE_PREFIX.fixtures}:testhash`;

describe('cache invalidation on syncAll', () => {
  beforeEach(async () => {
    await prisma.syncLog.deleteMany();
    await prisma.playerGameweekStats.deleteMany();
    await prisma.fixture.deleteMany();
    await prisma.gameweek.deleteMany();
    await prisma.player.deleteMany();
    await prisma.realTeam.deleteMany();

    await redis.del(PLAYERS_CACHE_KEY, FIXTURES_CACHE_KEY, 'ingestion:lastSync');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await redis.quit();
  });

  it('clears players:list:* and fixtures:list:* keys after syncAll', async () => {
    await redis.set(PLAYERS_CACHE_KEY, JSON.stringify({ cached: true }));
    await redis.set(FIXTURES_CACHE_KEY, JSON.stringify({ cached: true }));

    jest.spyOn(fplClient, 'fetchBootstrapStatic').mockResolvedValue({
      teams: [],
      elements: [],
      events: [],
    });
    jest.spyOn(fplClient, 'fetchFixtures').mockResolvedValue([]);

    await ingestionService.syncAll();

    expect(await redis.get(PLAYERS_CACHE_KEY)).toBeNull();
    expect(await redis.get(FIXTURES_CACHE_KEY)).toBeNull();
  });
});

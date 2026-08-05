import { env } from '../../config/env';
import { buildCacheKey, CACHE_PREFIX, getOrSet } from '../../lib/cache';
import { prisma } from '../../config/db';
import { ensurePlayerElementSummaryFresh } from '../ingestion/ingestion.service';
import * as playersRepository from './players.repository';
import type { ListPlayersQuery } from './players.validation';

const upcomingFixtureSelect = {
  id: true,
  kickoffTime: true,
  homeDifficulty: true,
  awayDifficulty: true,
  finished: true,
  started: true,
  minutes: true,
  gameweek: {
    select: {
      number: true,
    },
  },
  homeTeam: {
    select: {
      id: true,
      name: true,
      shortName: true,
    },
  },
  awayTeam: {
    select: {
      id: true,
      name: true,
      shortName: true,
    },
  },
} as const;

export async function listPlayers(query: ListPlayersQuery) {
  const cacheKey = buildCacheKey(CACHE_PREFIX.players, query);

  return getOrSet(cacheKey, env.CACHE_TTL_PLAYERS_SECONDS, async () => {
    const { data, total, priceBounds } = await playersRepository.findPlayers(query);
    const totalPages = Math.ceil(total / query.limit) || 1;

    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
        priceBounds,
      },
    };
  });
}

export async function getPlayerById(id: string) {
  const player = await playersRepository.findPlayerById(id);
  if (!player) {
    return null;
  }

  await ensurePlayerElementSummaryFresh(id);

  const [upcomingFixtures, historyRows, historyPast] = await Promise.all([
    prisma.fixture.findMany({
      where: {
        finished: false,
        kickoffTime: { gte: new Date() },
        OR: [{ homeTeamId: player.realTeam.id }, { awayTeamId: player.realTeam.id }],
      },
      select: upcomingFixtureSelect,
      orderBy: { kickoffTime: 'asc' },
      take: 5,
    }),
    prisma.playerGameweekStats.findMany({
      where: { playerId: id },
      select: {
        minutes: true,
        goals: true,
        assists: true,
        cleanSheet: true,
        goalsConceded: true,
        saves: true,
        yellowCards: true,
        redCards: true,
        ownGoals: true,
        penaltiesMissed: true,
        penaltiesSaved: true,
        bonus: true,
        bps: true,
        points: true,
        wasHome: true,
        opponentTeamFplId: true,
        fixtureFplId: true,
        value: true,
        gameweek: { select: { number: true, status: true } },
      },
      orderBy: { gameweek: { number: 'asc' } },
    }),
    prisma.playerSeasonHistory.findMany({
      where: { playerId: id },
      select: {
        seasonName: true,
        startCost: true,
        endCost: true,
        totalPoints: true,
        minutes: true,
        goalsScored: true,
        assists: true,
        cleanSheets: true,
        influence: true,
        creativity: true,
        threat: true,
        ictIndex: true,
      },
      orderBy: { seasonName: 'desc' },
    }),
  ]);

  const opponentFplIds = [
    ...new Set(
      historyRows
        .map((row) => row.opponentTeamFplId)
        .filter((fplId): fplId is number => fplId !== null && fplId !== undefined),
    ),
  ];

  const opponents =
    opponentFplIds.length > 0
      ? await prisma.realTeam.findMany({
          where: { fplId: { in: opponentFplIds } },
          select: { id: true, fplId: true, name: true, shortName: true },
        })
      : [];

  const opponentByFplId = new Map(
    opponents
      .filter((team): team is typeof team & { fplId: number } => team.fplId !== null)
      .map((team) => [team.fplId, team]),
  );

  return {
    ...player,
    upcomingFixtures: upcomingFixtures.map((fixture) => {
      const isHome = fixture.homeTeam.id === player.realTeam.id;
      return {
        ...fixture,
        fdr: isHome ? fixture.homeDifficulty : fixture.awayDifficulty,
        isHome,
        opponent: isHome ? fixture.awayTeam : fixture.homeTeam,
      };
    }),
    history: historyRows.map((row) => {
      const opponent =
        row.opponentTeamFplId != null
          ? opponentByFplId.get(row.opponentTeamFplId) ?? null
          : null;
      return {
        gameweek: row.gameweek.number,
        status: row.gameweek.status,
        points: row.points,
        minutes: row.minutes,
        goals: row.goals,
        assists: row.assists,
        cleanSheet: row.cleanSheet,
        goalsConceded: row.goalsConceded,
        saves: row.saves,
        yellowCards: row.yellowCards,
        redCards: row.redCards,
        ownGoals: row.ownGoals,
        penaltiesMissed: row.penaltiesMissed,
        penaltiesSaved: row.penaltiesSaved,
        bonus: row.bonus,
        bps: row.bps,
        wasHome: row.wasHome,
        fixtureFplId: row.fixtureFplId,
        value: row.value,
        opponent: opponent
          ? { id: opponent.id, name: opponent.name, shortName: opponent.shortName }
          : null,
      };
    }),
    historyPast,
  };
}

import { LedgerDirection, LedgerEntryType, Position } from '@prisma/client';
import { prisma } from '../../../config/db';
import { checkDbLatency, checkRedisLatency } from '../../../lib/healthChecks';
import { getLastIngestionSync } from '../../ingestion/ingestion.status';

const DAY = 24 * 60 * 60 * 1000;

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function startOfUtcDay(value: Date): Date {
  const date = new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

export async function getDashboardOverview() {
  const now = new Date();
  const last24h = new Date(now.getTime() - DAY);
  const previous24h = new Date(now.getTime() - DAY * 2);
  const last30d = new Date(now.getTime() - DAY * 30);
  const previous30d = new Date(now.getTime() - DAY * 60);

  const [latestSeason, currentGameweek, nextGameweek] = await Promise.all([
    prisma.team.findFirst({ orderBy: { createdAt: 'desc' }, select: { season: true } }),
    prisma.gameweek.findFirst({
      where: { isCurrent: true },
      select: { id: true, number: true, deadline: true, status: true, isCurrent: true },
    }),
    prisma.gameweek.findFirst({
      where: { status: 'UPCOMING', deadline: { gt: now } },
      orderBy: { deadline: 'asc' },
      select: { id: true, number: true, deadline: true, status: true, isCurrent: true },
    }),
  ]);

  const seasonWhere = latestSeason ? { season: latestSeason.season } : undefined;
  const commissionWhere = {
    entryType: LedgerEntryType.COMMISSION,
    direction: LedgerDirection.CREDIT,
  };

  const [
    totalUsers,
    usersCurrent,
    usersPrevious,
    activeTeams,
    teamsCurrent,
    teamsPrevious,
    transfersCurrent,
    transfersPrevious,
    commissionTotal,
    commissionCurrent,
    commissionPrevious,
    liveFixture,
    topPlayers,
    recentFixtures,
    recentTransfers,
    recentActivity,
    captainGroups,
    formationGroups,
    finishedFixtures,
    trendUsers,
    trendTeams,
    trendTransfers,
    trendRevenue,
    dbHealth,
    redisHealth,
    lastSync,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: last30d } } }),
    prisma.user.count({ where: { createdAt: { gte: previous30d, lt: last30d } } }),
    prisma.team.count({ where: seasonWhere }),
    prisma.team.count({ where: { ...seasonWhere, createdAt: { gte: last30d } } }),
    prisma.team.count({ where: { ...seasonWhere, createdAt: { gte: previous30d, lt: last30d } } }),
    prisma.transfer.count({ where: { createdAt: { gte: last24h } } }),
    prisma.transfer.count({ where: { createdAt: { gte: previous24h, lt: last24h } } }),
    prisma.ledgerEntry.aggregate({ where: commissionWhere, _sum: { amountMinor: true } }),
    prisma.ledgerEntry.aggregate({ where: { ...commissionWhere, createdAt: { gte: last30d } }, _sum: { amountMinor: true } }),
    prisma.ledgerEntry.aggregate({ where: { ...commissionWhere, createdAt: { gte: previous30d, lt: last30d } }, _sum: { amountMinor: true } }),
    prisma.fixture.findFirst({
      where: { started: true, finished: false, isPostponed: false },
      orderBy: { kickoffTime: 'asc' },
      include: { gameweek: true, homeTeam: true, awayTeam: true },
    }),
    prisma.player.findMany({
      orderBy: [{ totalPoints: 'desc' }, { name: 'asc' }],
      take: 8,
      select: {
        id: true, name: true, position: true, price: true, totalPoints: true,
        eventPoints: true, selectedByPercent: true, isAvailable: true,
        realTeam: { select: { name: true, shortName: true, crestUrl: true } },
      },
    }),
    prisma.fixture.findMany({
      orderBy: { kickoffTime: 'desc' },
      take: 6,
      include: { gameweek: true, homeTeam: true, awayTeam: true },
    }),
    prisma.transfer.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: {
        id: true, createdAt: true, pricePaid: true,
        playerIn: { select: { id: true, name: true } },
        playerOut: { select: { id: true, name: true } },
        team: { select: { name: true, user: { select: { displayName: true } } } },
      },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true, action: true, targetType: true, targetId: true, createdAt: true,
        admin: { select: { displayName: true } },
      },
    }),
    prisma.squad.groupBy({
      by: ['playerId'], where: { isCaptain: true }, _count: { _all: true },
      orderBy: { _count: { playerId: 'desc' } }, take: 5,
    }),
    prisma.squad.groupBy({
      by: ['teamId', 'position'], where: { isStarter: true }, _count: { _all: true },
    }),
    prisma.fixture.findMany({
      where: { finished: true }, orderBy: { kickoffTime: 'desc' },
      select: {
        kickoffTime: true, homeScore: true, awayScore: true,
        homeTeam: { select: { id: true, name: true, shortName: true, crestUrl: true } },
        awayTeam: { select: { id: true, name: true, shortName: true, crestUrl: true } },
      },
    }),
    prisma.user.findMany({ where: { createdAt: { gte: last30d } }, select: { createdAt: true } }),
    prisma.team.findMany({ where: { ...seasonWhere, createdAt: { gte: last30d } }, select: { createdAt: true } }),
    prisma.transfer.findMany({ where: { createdAt: { gte: last30d } }, select: { createdAt: true } }),
    prisma.ledgerEntry.findMany({ where: { ...commissionWhere, createdAt: { gte: last30d } }, select: { createdAt: true, amountMinor: true } }),
    checkDbLatency(),
    checkRedisLatency(),
    getLastIngestionSync(),
  ]);

  const fallbackFixture = liveFixture ?? await prisma.fixture.findFirst({
    where: { started: false, finished: false, isPostponed: false, kickoffTime: { gte: now } },
    orderBy: { kickoffTime: 'asc' },
    include: { gameweek: true, homeTeam: true, awayTeam: true },
  });

  const captainIds = captainGroups.map((row) => row.playerId);
  const captainPlayers = captainIds.length
    ? await prisma.player.findMany({
        where: { id: { in: captainIds } },
        select: { id: true, name: true, realTeam: { select: { shortName: true, crestUrl: true } } },
      })
    : [];
  const captainMap = new Map(captainPlayers.map((player) => [player.id, player]));

  const formations = new Map<string, Record<Position, number>>();
  for (const row of formationGroups) {
    const counts = formations.get(row.teamId) ?? { GK: 0, DEF: 0, MID: 0, FWD: 0 };
    counts[row.position] = row._count._all;
    formations.set(row.teamId, counts);
  }
  const formationDistribution = new Map<string, number>();
  for (const counts of formations.values()) {
    const label = `${counts.DEF}-${counts.MID}-${counts.FWD}`;
    formationDistribution.set(label, (formationDistribution.get(label) ?? 0) + 1);
  }

  type ClubRow = {
    id: string; name: string; shortName: string; crestUrl: string | null;
    wins: number; draws: number; losses: number; goalsFor: number; goalsAgainst: number;
    points: number; form: string[];
  };
  const clubs = new Map<string, ClubRow>();
  const getClub = (team: { id: string; name: string; shortName: string; crestUrl: string | null }) => {
    const existing = clubs.get(team.id);
    if (existing) return existing;
    const created: ClubRow = { ...team, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0, form: [] };
    clubs.set(team.id, created);
    return created;
  };
  for (const fixture of finishedFixtures) {
    const home = getClub(fixture.homeTeam);
    const away = getClub(fixture.awayTeam);
    const homeScore = fixture.homeScore ?? 0;
    const awayScore = fixture.awayScore ?? 0;
    home.goalsFor += homeScore; home.goalsAgainst += awayScore;
    away.goalsFor += awayScore; away.goalsAgainst += homeScore;
    if (homeScore === awayScore) {
      home.draws += 1; away.draws += 1; home.points += 1; away.points += 1;
      if (home.form.length < 5) home.form.push('D');
      if (away.form.length < 5) away.form.push('D');
    } else if (homeScore > awayScore) {
      home.wins += 1; away.losses += 1; home.points += 3;
      if (home.form.length < 5) home.form.push('W');
      if (away.form.length < 5) away.form.push('L');
    } else {
      away.wins += 1; home.losses += 1; away.points += 3;
      if (away.form.length < 5) away.form.push('W');
      if (home.form.length < 5) home.form.push('L');
    }
  }

  const trendStart = startOfUtcDay(last30d);
  const trend = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(trendStart.getTime() + index * DAY);
    const next = new Date(date.getTime() + DAY);
    const inDay = (value: Date) => value >= date && value < next;
    return {
      date: date.toISOString(),
      registrations: trendUsers.filter((row) => inDay(row.createdAt)).length,
      teamsCreated: trendTeams.filter((row) => inDay(row.createdAt)).length,
      transfers: trendTransfers.filter((row) => inDay(row.createdAt)).length,
      revenueMinor: trendRevenue.filter((row) => inDay(row.createdAt)).reduce((sum, row) => sum + row.amountMinor, 0),
    };
  });

  const serializeFixture = (fixture: typeof fallbackFixture) => fixture ? ({
    id: fixture.id,
    kickoffTime: fixture.kickoffTime.toISOString(),
    homeScore: fixture.homeScore,
    awayScore: fixture.awayScore,
    started: fixture.started,
    finished: fixture.finished,
    minutes: fixture.minutes,
    isPostponed: fixture.isPostponed,
    gameweek: { id: fixture.gameweek.id, number: fixture.gameweek.number },
    homeTeam: { id: fixture.homeTeam.id, name: fixture.homeTeam.name, shortName: fixture.homeTeam.shortName, crestUrl: fixture.homeTeam.crestUrl },
    awayTeam: { id: fixture.awayTeam.id, name: fixture.awayTeam.name, shortName: fixture.awayTeam.shortName, crestUrl: fixture.awayTeam.crestUrl },
  }) : null;

  const serializeGameweek = (gameweek: typeof currentGameweek) => gameweek ? ({
    ...gameweek, deadline: gameweek.deadline.toISOString(),
  }) : null;

  return {
    generatedAt: now.toISOString(),
    currentGameweek: serializeGameweek(currentGameweek),
    nextGameweek: serializeGameweek(nextGameweek),
    system: { dbOk: dbHealth.ok, redisOk: redisHealth.ok, lastSyncAt: lastSync?.timestamp ?? null, lastSyncSuccess: lastSync?.success ?? null },
    kpis: {
      totalUsers: { value: totalUsers, change: percentChange(usersCurrent, usersPrevious) },
      activeTeams: { value: activeTeams, change: percentChange(teamsCurrent, teamsPrevious), season: latestSeason?.season ?? null },
      transfers24h: { value: transfersCurrent, change: percentChange(transfersCurrent, transfersPrevious) },
      revenue: { valueMinor: commissionTotal._sum.amountMinor ?? 0, currency: 'ETB', change: percentChange(commissionCurrent._sum.amountMinor ?? 0, commissionPrevious._sum.amountMinor ?? 0) },
    },
    featuredFixture: serializeFixture(fallbackFixture),
    topPlayers,
    recentFixtures: recentFixtures.map((fixture) => serializeFixture(fixture)),
    recentTransfers: recentTransfers.map((transfer) => ({ ...transfer, createdAt: transfer.createdAt.toISOString() })),
    recentActivity: recentActivity.map((activity) => ({ ...activity, createdAt: activity.createdAt.toISOString() })),
    trend,
    captainPicks: captainGroups.map((row) => ({
      playerId: row.playerId,
      playerName: captainMap.get(row.playerId)?.name ?? 'Unknown player',
      team: captainMap.get(row.playerId)?.realTeam ?? null,
      count: row._count._all,
    })),
    formationDistribution: [...formationDistribution.entries()]
      .map(([formation, count]) => ({ formation, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
    clubPerformance: [...clubs.values()]
      .sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst))
      .slice(0, 6),
  };
}

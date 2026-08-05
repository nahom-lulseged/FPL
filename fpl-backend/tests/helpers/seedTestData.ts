import { Player, PrismaClient } from '@prisma/client';
import {
  clearReferenceDataForSeed,
  clearReferenceDataOnly,
} from '../../prisma/clearReferenceData';

function teamData(fplId: number, name: string, shortName: string) {
  return {
    fplId,
    name,
    nameLower: name.toLowerCase(),
    shortName,
    shortNameLower: shortName.toLowerCase(),
  };
}

function playerData<T extends { name: string }>(data: T): T & { nameLower: string } {
  return { ...data, nameLower: data.name.toLowerCase() };
}


export async function clearPhase2Data(prisma: PrismaClient) {
  await clearReferenceDataOnly(prisma);
}

export async function clearPhase3Data(prisma: PrismaClient) {
  await clearReferenceDataForSeed(prisma);
  await prisma.auditLog.deleteMany();
}

export async function clearUserStateData(prisma: PrismaClient) {
  await prisma.$transaction([
    prisma.recalculationLog.deleteMany(),
    prisma.transfer.deleteMany(),
    prisma.teamGameweekScore.deleteMany(),
    prisma.squadGameweekSnapshot.deleteMany(),
    prisma.chipUsage.deleteMany(),
    prisma.squad.deleteMany(),
    prisma.leagueMembership.deleteMany(),
    prisma.league.deleteMany(),
    prisma.team.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.ledgerEntry.deleteMany(),
    prisma.deposit.deleteMany(),
    prisma.withdrawal.deleteMany(),
    prisma.authIdentity.deleteMany(),
    prisma.wallet.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

export async function clearPhase4Data(prisma: PrismaClient) {
  await prisma.$transaction([
    prisma.transfer.deleteMany(),
    prisma.teamGameweekScore.deleteMany(),
    prisma.squadGameweekSnapshot.deleteMany(),
  ]);
}

export async function clearPhase5Data(prisma: PrismaClient) {
  await prisma.transfer.deleteMany();
}

export async function clearChipData(prisma: PrismaClient) {
  await prisma.chipUsage.deleteMany();
}

export async function clearLeagueData(prisma: PrismaClient) {
  await prisma.$transaction([
    prisma.leagueMembership.deleteMany(),
    prisma.league.deleteMany(),
  ]);
}

export async function seedPhase2Data(prisma: PrismaClient) {
  const arsenal = await prisma.realTeam.create({
    data: teamData(1, 'Arsenal', 'ARS'),
  });
  const liverpool = await prisma.realTeam.create({
    data: teamData(2, 'Liverpool', 'LIV'),
  });
  const manCity = await prisma.realTeam.create({
    data: teamData(3, 'Man City', 'MCI'),
  });
  const spurs = await prisma.realTeam.create({
    data: teamData(4, 'Spurs', 'TOT'),
  });
  const chelsea = await prisma.realTeam.create({
    data: teamData(5, 'Chelsea', 'CHE'),
  });

  const gw1 = await prisma.gameweek.create({
    data: {
      number: 1,
      deadline: new Date('2025-08-15T17:30:00Z'),
      status: 'FINISHED',
      isCurrent: false,
    },
  });
  const gw2 = await prisma.gameweek.create({
    data: {
      number: 2,
      deadline: new Date('2099-08-22T17:30:00Z'),
      status: 'LIVE',
      isCurrent: true,
    },
  });

  await prisma.player.createMany({
    data: [
      {
        fplId: 101,
        name: 'Saka',
        nameLower: 'saka',
        position: 'MID',
        price: 70,
        realTeamId: arsenal.id,
        totalPoints: 120,
        goalsScored: 8,
        assists: 5,
        selectedByPercent: 15.2,
      },
      {
        fplId: 102,
        name: 'Salah',
        nameLower: 'salah',
        position: 'MID',
        price: 85,
        realTeamId: liverpool.id,
        totalPoints: 180,
        goalsScored: 15,
        assists: 10,
        selectedByPercent: 25.4,
      },
      {
        fplId: 103,
        name: 'Haaland',
        nameLower: 'haaland',
        position: 'FWD',
        price: 85,
        realTeamId: manCity.id,
        totalPoints: 200,
        goalsScored: 20,
        assists: 3,
        selectedByPercent: 30.1,
      },
      {
        fplId: 104,
        name: 'Raya',
        nameLower: 'raya',
        position: 'GK',
        price: 45,
        realTeamId: arsenal.id,
        totalPoints: 90,
        cleanSheets: 10,
        selectedByPercent: 8.5,
      },
      {
        fplId: 105,
        name: 'Saliba',
        nameLower: 'saliba',
        position: 'DEF',
        price: 50,
        realTeamId: arsenal.id,
        totalPoints: 100,
        cleanSheets: 12,
        selectedByPercent: 12.0,
      },
    ],
  });

  await prisma.fixture.create({
    data: {
      fplId: 1,
      gameweekId: gw1.id,
      homeTeamId: arsenal.id,
      awayTeamId: liverpool.id,
      kickoffTime: new Date('2025-08-16T14:00:00Z'),
      homeScore: 2,
      awayScore: 1,
      homeDifficulty: 4,
      awayDifficulty: 3,
      finished: true,
    },
  });
  await prisma.fixture.create({
    data: {
      fplId: 2,
      gameweekId: gw2.id,
      homeTeamId: liverpool.id,
      awayTeamId: manCity.id,
      kickoffTime: new Date('2025-08-23T16:30:00Z'),
      homeDifficulty: 3,
      awayDifficulty: 5,
      finished: false,
    },
  });

  return { arsenal, liverpool, manCity, spurs, chelsea, gw1, gw2 };
}

export interface Phase3SeedResult {
  arsenal: { id: string };
  liverpool: { id: string };
  manCity: { id: string };
  spurs: { id: string };
  chelsea: { id: string };
  gw1: { id: string };
  gw2: { id: string };
  players: Player[];
}

export async function seedPhase3Data(prisma: PrismaClient): Promise<Phase3SeedResult> {
  const base = await seedPhase2Data(prisma);

  const extraPlayers = await Promise.all([
    prisma.player.create({
      data: playerData({ fplId: 106, name: 'Alisson', position: 'GK', price: 45, realTeamId: base.liverpool.id  }),
    }),
    prisma.player.create({
      data: playerData({ fplId: 107, name: 'Virgil', position: 'DEF', price: 55, realTeamId: base.liverpool.id  }),
    }),
    prisma.player.create({
      data: playerData({ fplId: 108, name: 'Nunez', position: 'FWD', price: 60, realTeamId: base.liverpool.id  }),
    }),
    prisma.player.create({
      data: playerData({ fplId: 109, name: 'Ederson', position: 'GK', price: 45, realTeamId: base.manCity.id  }),
    }),
    prisma.player.create({
      data: playerData({ fplId: 110, name: 'Dias', position: 'DEF', price: 50, realTeamId: base.manCity.id  }),
    }),
    prisma.player.create({
      data: playerData({ fplId: 111, name: 'De Bruyne', position: 'MID', price: 75, realTeamId: base.manCity.id  }),
    }),
    prisma.player.create({
      data: playerData({ fplId: 112, name: 'Jesus', position: 'FWD', price: 55, realTeamId: base.arsenal.id  }),
    }),
    prisma.player.create({
      data: playerData({ fplId: 113, name: 'Gabriel', position: 'DEF', price: 50, realTeamId: base.arsenal.id  }),
    }),
    prisma.player.create({
      data: playerData({ fplId: 114, name: 'Odegaard', position: 'MID', price: 65, realTeamId: base.arsenal.id  }),
    }),
    prisma.player.create({
      data: playerData({ fplId: 115, name: 'Foden', position: 'MID', price: 65, realTeamId: base.manCity.id  }),
    }),
    prisma.player.create({
      data: playerData({ fplId: 116, name: 'White', position: 'DEF', price: 45, realTeamId: base.arsenal.id  }),
    }),
    prisma.player.create({
      data: playerData({ fplId: 117, name: 'Robertson', position: 'DEF', price: 45, realTeamId: base.liverpool.id  }),
    }),
    prisma.player.create({
      data: playerData({ fplId: 118, name: 'Grealish', position: 'MID', price: 55, realTeamId: base.manCity.id  }),
    }),
    prisma.player.create({
      data: playerData({ fplId: 119, name: 'Jota', position: 'MID', price: 60, realTeamId: base.liverpool.id  }),
    }),
    prisma.player.create({
      data: playerData({ fplId: 120, name: 'Martinelli', position: 'FWD', price: 55, realTeamId: base.arsenal.id  }),
    }),
    prisma.player.create({
      data: playerData({ fplId: 121, name: 'Vicario', position: 'GK', price: 45, realTeamId: base.spurs.id  }),
    }),
    prisma.player.create({
      data: playerData({ fplId: 122, name: 'Romero', position: 'DEF', price: 45, realTeamId: base.spurs.id  }),
    }),
    prisma.player.create({
      data: playerData({ fplId: 123, name: 'Maddison', position: 'MID', price: 55, realTeamId: base.spurs.id  }),
    }),
    prisma.player.create({
      data: playerData({ fplId: 124, name: 'Son', position: 'MID', price: 60, realTeamId: base.spurs.id  }),
    }),
    prisma.player.create({
      data: playerData({ fplId: 125, name: 'Richarlison', position: 'FWD', price: 50, realTeamId: base.spurs.id  }),
    }),
    prisma.player.create({
      data: playerData({ fplId: 126, name: 'Chilwell', position: 'DEF', price: 45, realTeamId: base.chelsea.id  }),
    }),
    prisma.player.create({
      data: playerData({ fplId: 127, name: 'Gallagher', position: 'MID', price: 55, realTeamId: base.chelsea.id  }),
    }),
    prisma.player.create({
      data: playerData({ fplId: 128, name: 'Jackson', position: 'FWD', price: 50, realTeamId: base.chelsea.id  }),
    }),
  ]);

  const players = await prisma.player.findMany();
  const jota = players.find((player) => player.name === 'Jota')!;

  await prisma.playerGameweekStats.create({
    data: {
      playerId: jota.id,
      gameweekId: base.gw1.id,
      minutes: 90,
      goals: 1,
      assists: 1,
      points: 11,
      bps: 42,
      bonus: 2,
    },
  });

  return {
    ...base,
    players,
  };
}

export function buildValidSquadPlayerIds(players: Player[]): string[] {
  const squadNames = [
    'Raya',
    'Alisson',
    'Saliba',
    'Robertson',
    'Romero',
    'Dias',
    'Chilwell',
    'Odegaard',
    'Jota',
    'Grealish',
    'Maddison',
    'Gallagher',
    'Haaland',
    'Richarlison',
    'Jackson',
  ];

  return squadNames.map((name) => {
    const player = players.find((candidate) => candidate.name === name);
    if (!player) {
      throw new Error(`Missing seeded player: ${name}`);
    }
    return player.id;
  });
}

export interface GameweekStatSeed {
  playerId: string;
  minutes?: number;
  points: number;
}

export async function seedGameweekWithStats(
  prisma: PrismaClient,
  gameweekId: string,
  stats: GameweekStatSeed[],
) {
  for (const stat of stats) {
    await prisma.playerGameweekStats.upsert({
      where: {
        playerId_gameweekId: {
          playerId: stat.playerId,
          gameweekId,
        },
      },
      create: {
        playerId: stat.playerId,
        gameweekId,
        minutes: stat.minutes ?? 90,
        points: stat.points,
      },
      update: {
        minutes: stat.minutes ?? 90,
        points: stat.points,
      },
    });
  }
}

export interface SeedLeagueMember {
  userId: string;
  teamId: string;
}

export async function seedLeagueWithMembers(
  prisma: PrismaClient,
  params: {
    name: string;
    season: string;
    adminUserId: string;
    inviteCode: string;
    members: SeedLeagueMember[];
  },
) {
  const league = await prisma.league.create({
    data: {
      name: params.name,
      nameLower: params.name.toLowerCase(),
      type: 'CLASSIC',
      season: params.season,
      adminUserId: params.adminUserId,
      inviteCode: params.inviteCode.toUpperCase(),
    },
  });

  for (const member of params.members) {
    await prisma.leagueMembership.create({
      data: {
        leagueId: league.id,
        userId: member.userId,
        teamId: member.teamId,
      },
    });
  }

  return league;
}

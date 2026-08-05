// Run `npm run seed` when ENABLE_INGESTION_CRON=false or offline dev.
import { PrismaClient } from '@prisma/client';
import { clearReferenceDataForSeed } from './clearReferenceData';
import { upsertDevAdminUser } from './seedAdmin';

const prisma = new PrismaClient();

async function ensureSparseWalletIndexes() {
  await prisma.$runCommandRaw({
    createIndexes: 'Wallet',
    indexes: [
      {
        key: { userId: 1 },
        name: 'Wallet_userId_sparse_key',
        unique: true,
        sparse: true,
      },
      {
        key: { leagueId: 1 },
        name: 'Wallet_leagueId_sparse_key',
        unique: true,
        sparse: true,
      },
    ],
  }).catch(() => undefined);
}

async function main() {
  await ensureSparseWalletIndexes();
  await clearReferenceDataForSeed(prisma);

  const arsenal = await prisma.realTeam.create({
    data: { fplId: 1, name: 'Arsenal', nameLower: 'arsenal', shortName: 'ARS', shortNameLower: 'ars' },
  });
  const liverpool = await prisma.realTeam.create({
    data: { fplId: 2, name: 'Liverpool', nameLower: 'liverpool', shortName: 'LIV', shortNameLower: 'liv' },
  });
  const manCity = await prisma.realTeam.create({
    data: { fplId: 3, name: 'Man City', nameLower: 'man city', shortName: 'MCI', shortNameLower: 'mci' },
  });
  const chelsea = await prisma.realTeam.create({
    data: { fplId: 4, name: 'Chelsea', nameLower: 'chelsea', shortName: 'CHE', shortNameLower: 'che' },
  });
  const spurs = await prisma.realTeam.create({
    data: { fplId: 5, name: 'Spurs', nameLower: 'spurs', shortName: 'TOT', shortNameLower: 'tot' },
  });
  const newcastle = await prisma.realTeam.create({
    data: { fplId: 6, name: 'Newcastle', nameLower: 'newcastle', shortName: 'NEW', shortNameLower: 'new' },
  });
  const villa = await prisma.realTeam.create({
    data: { fplId: 7, name: 'Aston Villa', nameLower: 'aston villa', shortName: 'AVL', shortNameLower: 'avl' },
  });
  const brighton = await prisma.realTeam.create({
    data: { fplId: 8, name: 'Brighton', nameLower: 'brighton', shortName: 'BHA', shortNameLower: 'bha' },
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
      deadline: new Date('2025-08-22T17:30:00Z'),
      status: 'LIVE',
      isCurrent: true,
    },
  });

  const players = [
    { fplId: 101, name: 'Raya', position: 'GK' as const, price: 55, teamId: arsenal.id },
    { fplId: 102, name: 'Saliba', position: 'DEF' as const, price: 60, teamId: arsenal.id },
    { fplId: 103, name: 'Saka', position: 'MID' as const, price: 100, teamId: arsenal.id },
    { fplId: 104, name: 'Haaland', position: 'FWD' as const, price: 145, teamId: manCity.id },
    { fplId: 105, name: 'Alisson', position: 'GK' as const, price: 55, teamId: liverpool.id },
    { fplId: 106, name: 'Virgil', position: 'DEF' as const, price: 65, teamId: liverpool.id },
    { fplId: 107, name: 'Salah', position: 'MID' as const, price: 145, teamId: liverpool.id },
    { fplId: 108, name: 'Nunez', position: 'FWD' as const, price: 75, teamId: liverpool.id },
    { fplId: 109, name: 'Ederson', position: 'GK' as const, price: 55, teamId: manCity.id },
    { fplId: 110, name: 'Dias', position: 'DEF' as const, price: 60, teamId: manCity.id },
    { fplId: 111, name: 'De Bruyne', position: 'MID' as const, price: 105, teamId: manCity.id },
    { fplId: 112, name: 'Jesus', position: 'FWD' as const, price: 65, teamId: arsenal.id },
    { fplId: 113, name: 'Gabriel', position: 'DEF' as const, price: 60, teamId: arsenal.id },
    { fplId: 114, name: 'Odegaard', position: 'MID' as const, price: 85, teamId: arsenal.id },
    { fplId: 115, name: 'Foden', position: 'MID' as const, price: 80, teamId: manCity.id },
    // Extra cheap players across more clubs so Auto Pick can satisfy 15-man + max-3-per-club rules
    { fplId: 116, name: 'Pickford', position: 'GK' as const, price: 45, teamId: chelsea.id },
    { fplId: 117, name: 'James', position: 'DEF' as const, price: 45, teamId: chelsea.id },
    { fplId: 118, name: 'Palmer', position: 'MID' as const, price: 70, teamId: chelsea.id },
    { fplId: 119, name: 'Jackson', position: 'FWD' as const, price: 55, teamId: chelsea.id },
    { fplId: 120, name: 'Vicario', position: 'GK' as const, price: 45, teamId: spurs.id },
    { fplId: 121, name: 'Romero', position: 'DEF' as const, price: 45, teamId: spurs.id },
    { fplId: 122, name: 'Maddison', position: 'MID' as const, price: 65, teamId: spurs.id },
    { fplId: 123, name: 'Son', position: 'MID' as const, price: 95, teamId: spurs.id },
    { fplId: 124, name: 'Solanke', position: 'FWD' as const, price: 55, teamId: spurs.id },
    { fplId: 125, name: 'Pope', position: 'GK' as const, price: 45, teamId: newcastle.id },
    { fplId: 126, name: 'Burn', position: 'DEF' as const, price: 40, teamId: newcastle.id },
    { fplId: 127, name: 'Trippier', position: 'DEF' as const, price: 45, teamId: newcastle.id },
    { fplId: 128, name: 'Gordon', position: 'MID' as const, price: 55, teamId: newcastle.id },
    { fplId: 129, name: 'Isak', position: 'FWD' as const, price: 85, teamId: newcastle.id },
    { fplId: 130, name: 'Martinez', position: 'GK' as const, price: 40, teamId: villa.id },
    { fplId: 131, name: 'Konsa', position: 'DEF' as const, price: 40, teamId: villa.id },
    { fplId: 132, name: 'McGinn', position: 'MID' as const, price: 50, teamId: villa.id },
    { fplId: 133, name: 'Watkins', position: 'FWD' as const, price: 80, teamId: villa.id },
    { fplId: 134, name: 'Steele', position: 'GK' as const, price: 40, teamId: brighton.id },
    { fplId: 135, name: 'Dunk', position: 'DEF' as const, price: 40, teamId: brighton.id },
    { fplId: 136, name: 'Gross', position: 'MID' as const, price: 45, teamId: brighton.id },
    { fplId: 137, name: 'Welbeck', position: 'FWD' as const, price: 50, teamId: brighton.id },
  ];

  const createdPlayers = await Promise.all(
    players.map((p) =>
      prisma.player.create({
        data: {
          fplId: p.fplId,
          name: p.name,
          nameLower: p.name.toLowerCase(),
          position: p.position,
          price: p.price,
          realTeamId: p.teamId,
          isAvailable: true,
        },
      }),
    ),
  );

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
      gameweekId: gw1.id,
      homeTeamId: manCity.id,
      awayTeamId: arsenal.id,
      kickoffTime: new Date('2025-08-17T15:30:00Z'),
      homeScore: 1,
      awayScore: 1,
      homeDifficulty: 2,
      awayDifficulty: 4,
      finished: true,
    },
  });
  await prisma.fixture.create({
    data: {
      fplId: 3,
      gameweekId: gw2.id,
      homeTeamId: liverpool.id,
      awayTeamId: manCity.id,
      kickoffTime: new Date('2025-08-23T16:30:00Z'),
      homeDifficulty: 3,
      awayDifficulty: 5,
      finished: false,
    },
  });

  const salah = createdPlayers.find((p) => p.name === 'Salah')!;
  await prisma.playerGameweekStats.create({
    data: {
      playerId: salah.id,
      gameweekId: gw1.id,
      minutes: 90,
      goals: 1,
      assists: 1,
      points: 11,
      bps: 42,
      bonus: 2,
    },
  });

  await upsertDevAdminUser(prisma);
  console.log('Seed complete: reference data and dev admin refreshed (teams/leagues reset).');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });

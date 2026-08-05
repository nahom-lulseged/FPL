import { prisma } from '../../config/db';

const gameweekSelect = {
  id: true,
  number: true,
  deadline: true,
  status: true,
  isCurrent: true,
};

export async function listGameweeks() {
  return prisma.gameweek.findMany({
    orderBy: { number: 'asc' },
    select: gameweekSelect,
  });
}

export async function getCurrentGameweek() {
  const now = new Date();
  const current = await prisma.gameweek.findFirst({
    where: {
      isCurrent: true,
      deadline: { gt: now },
    },
    orderBy: { deadline: 'asc' },
    select: gameweekSelect,
  });

  if (current) return current;

  return prisma.gameweek.findFirst({
    where: {
      status: 'UPCOMING',
      deadline: { gt: now },
    },
    orderBy: { deadline: 'asc' },
    select: gameweekSelect,
  });
}

export async function getTransferGameweek() {
  return prisma.gameweek.findFirst({
    where: {
      status: 'UPCOMING',
      deadline: { gt: new Date() },
    },
    orderBy: { deadline: 'asc' },
    select: gameweekSelect,
  });
}

export async function getTransferWindow() {
  const gameweek = await getTransferGameweek();

  return {
    isOpen: Boolean(gameweek),
    gameweek,
  };
}

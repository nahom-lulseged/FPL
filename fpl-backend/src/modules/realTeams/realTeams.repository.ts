import { prisma } from '../../config/db';

export async function findAllRealTeams() {
  return prisma.realTeam.findMany({
    select: {
      id: true,
      name: true,
      shortName: true,
      crestUrl: true,
    },
    orderBy: { name: 'asc' },
  });
}

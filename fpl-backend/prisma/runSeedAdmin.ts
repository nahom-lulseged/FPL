import { PrismaClient } from '@prisma/client';
import { upsertDevAdminUser } from './seedAdmin';

const prisma = new PrismaClient();

upsertDevAdminUser(prisma)
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });

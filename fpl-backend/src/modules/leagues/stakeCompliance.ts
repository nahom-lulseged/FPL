import { prisma } from '../../config/db';
import { AppError } from '../../middleware/errorHandler';

export async function assertStakeCompliance(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { termsAcceptedAt: true, ageVerifiedAt: true },
  });

  if (!user?.termsAcceptedAt) {
    throw new AppError(403, 'Terms of service must be accepted before staking');
  }

  if (!user?.ageVerifiedAt) {
    throw new AppError(403, 'Age verification required before staking');
  }
}

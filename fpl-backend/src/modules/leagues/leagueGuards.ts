import { AppError } from '../../middleware/errorHandler';
import * as leaguesRepository from './leagues.repository';

export async function assertLeagueMember(userId: string, leagueId: string): Promise<void> {
  const membership = await leaguesRepository.findMembership(leagueId, userId);
  if (!membership) {
    throw new AppError(403, 'You are not a member of this league');
  }
}

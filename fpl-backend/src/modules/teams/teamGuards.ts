import { AppError } from '../../middleware/errorHandler';
import * as teamsRepository from './teams.repository';

export function assertValidation(
  result: { ok: true } | { ok: false; code: string; message: string },
): void {
  if (!result.ok) {
    throw new AppError(400, result.message);
  }
}

export async function assertTeamOwner(userId: string, teamId: string): Promise<void> {
  const team = await teamsRepository.findTeamById(teamId);
  if (!team) {
    throw new AppError(404, 'Team not found');
  }
  if (team.userId !== userId) {
    throw new AppError(403, 'You do not own this team');
  }
}

export async function assertBeforeDeadline(
  targetGameweek?: { deadline: Date } | null,
): Promise<void> {
  const gameweek = targetGameweek ?? await teamsRepository.findCurrentGameweek();
  if (!gameweek) {
    return;
  }
  if (Date.now() >= gameweek.deadline.getTime()) {
    throw new AppError(403, 'Gameweek deadline has passed');
  }
}

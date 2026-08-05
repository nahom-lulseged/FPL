import type { Gameweek } from '@/types/gameweek';

export function formatWorkflowDeadline(
  gameweek?: Gameweek | null,
  fallbackNumber?: number | null,
) {
  const number = gameweek?.number ?? fallbackNumber;
  const deadline = gameweek?.deadline
    ? new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(gameweek.deadline))
    : 'Pending';

  return {
    gameweek: number ? `Gameweek ${number}` : null,
    deadline: `Deadline: ${deadline}`,
    deadlineValue: deadline,
  };
}

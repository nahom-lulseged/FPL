export function formatPrice(tenths: number): string {
  return `\u00a3${(tenths / 10).toFixed(1)}m`;
}

export function formatDeadlineCountdown(deadline: string): string {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) {
    return 'Deadline passed';
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function formatGameweekStatus(status: string): string {
  switch (status) {
    case 'UPCOMING':
      return 'Upcoming';
    case 'LIVE':
      return 'Live';
    case 'FINISHED':
      return 'Finished';
    default:
      return status;
  }
}

export function formatKickoff(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

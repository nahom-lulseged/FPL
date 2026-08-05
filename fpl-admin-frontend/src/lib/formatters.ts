import { useEffect, useState } from 'react';

export function formatDate(value: string | Date): string {
  return new Date(value).toLocaleString();
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const absDiff = Math.abs(diffMs);
  const suffix = diffMs >= 0 ? 'ago' : 'from now';

  if (absDiff < MINUTE) {
    return 'just now';
  }
  if (absDiff < HOUR) {
    const minutes = Math.floor(absDiff / MINUTE);
    return `${minutes} minute${minutes === 1 ? '' : 's'} ${suffix}`;
  }
  if (absDiff < DAY) {
    const hours = Math.floor(absDiff / HOUR);
    return `${hours} hour${hours === 1 ? '' : 's'} ${suffix}`;
  }
  const days = Math.floor(absDiff / DAY);
  return `${days} day${days === 1 ? '' : 's'} ${suffix}`;
}

export function formatDeadlineCountdown(deadline: string): string {
  const diffMs = new Date(deadline).getTime() - Date.now();

  if (diffMs <= 0) {
    return 'Deadline passed';
  }

  const days = Math.floor(diffMs / DAY);
  const hours = Math.floor((diffMs % DAY) / HOUR);
  const minutes = Math.floor((diffMs % HOUR) / MINUTE);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  const seconds = Math.floor((diffMs % MINUTE) / SECOND);
  return `${minutes}m ${seconds}s`;
}

export function useDeadlineCountdown(deadline: string | null | undefined): string {
  const [countdown, setCountdown] = useState(() =>
    deadline ? formatDeadlineCountdown(deadline) : '—',
  );

  useEffect(() => {
    if (!deadline) {
      setCountdown('—');
      return;
    }

    const update = () => setCountdown(formatDeadlineCountdown(deadline));
    update();
    const intervalId = window.setInterval(update, 1000);
    return () => window.clearInterval(intervalId);
  }, [deadline]);

  return countdown;
}

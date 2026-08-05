import { useEffect, useState } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useGameweekStore } from '@/store/gameweekStore';

export function NetworkStatusBanner() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [dismissed, setDismissed] = useState(false);
  const { isConnected } = useSocket();
  const currentGameweek = useGameweekStore((s) => s.currentGameweek);
  const isLiveGameweek = currentGameweek?.status === 'LIVE';

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setDismissed(false);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setDismissed(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const showOffline = !isOnline;
  const showReconnecting = isOnline && isLiveGameweek && !isConnected;

  if (dismissed || (!showOffline && !showReconnecting)) {
    return null;
  }

  const message = showOffline
    ? "You're offline. Some features may be unavailable until your connection returns."
    : 'Reconnecting to live updates… Scores will refresh when the connection is restored.';

  return (
    <div
      role="status"
      aria-live="polite"
      className="border-b border-fpl-pink/30 bg-fpl-pink/15 px-4 py-2 text-center text-sm text-white"
    >
      <div className="flex items-center justify-center gap-3">
        <span>{message}</span>
        <button
          type="button"
          className="shrink-0 rounded px-2 py-0.5 text-xs text-white/80 underline hover:text-white"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss network status message"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCurrentGameweek, listGameweeks } from '@/api/gameweeks.api';
import { IconChevronDown } from '@/components/common/FplButtons';
import { formatDeadlineCountdown, formatGameweekStatus } from '@/lib/formatters';
import { useGameweekStore } from '@/store/gameweekStore';

export function GameweekSwitcher() {
  const gameweeks = useGameweekStore((state) => state.gameweeks);
  const currentGameweek = useGameweekStore((state) => state.currentGameweek);
  const selectedGameweekNumber = useGameweekStore((state) => state.selectedGameweekNumber);
  const setGameweeks = useGameweekStore((state) => state.setGameweeks);
  const setCurrentGameweek = useGameweekStore((state) => state.setCurrentGameweek);
  const setSelectedGameweekNumber = useGameweekStore((state) => state.setSelectedGameweekNumber);

  const { data: allGameweeks } = useQuery({
    queryKey: ['gameweeks'],
    queryFn: listGameweeks,
  });

  const { data: current } = useQuery({
    queryKey: ['gameweeks', 'current'],
    queryFn: getCurrentGameweek,
  });

  useEffect(() => {
    if (allGameweeks) {
      setGameweeks(allGameweeks);
    }
  }, [allGameweeks, setGameweeks]);

  useEffect(() => {
    if (current) {
      setCurrentGameweek(current);
    }
  }, [current, setCurrentGameweek]);

  const selected =
    gameweeks.find((gw) => gw.number === selectedGameweekNumber) ?? currentGameweek ?? current;

  if (!gameweeks.length && !current) {
    return <span className="text-sm text-white/60">Loading gameweeks…</span>;
  }

  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
      <label className="sr-only" htmlFor="gameweek-select">
        Select gameweek
      </label>
      <span className="relative inline-block">
        <select
          id="gameweek-select"
          value={selectedGameweekNumber ?? selected?.number ?? ''}
          onChange={(event) => setSelectedGameweekNumber(Number(event.target.value))}
          className="h-9 appearance-none rounded-full border border-white/30 bg-[#2a0033] py-0 pl-3.5 pr-9 text-sm font-medium text-white hover:border-white/50 focus:border-fpl-cyan focus:outline-none focus:ring-1 focus:ring-fpl-cyan"
        >
          {(gameweeks.length ? gameweeks : current ? [current] : []).map((gw) => (
            <option key={gw.id} value={gw.number} className="bg-fpl-purple-700">
              GW {gw.number} — {formatGameweekStatus(gw.status)}
            </option>
          ))}
        </select>
        <IconChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70" />
      </span>
      {selected ? (
        <span className="text-xs text-white/60">
          Deadline {formatDeadlineCountdown(selected.deadline)}
        </span>
      ) : null}
    </div>
  );
}

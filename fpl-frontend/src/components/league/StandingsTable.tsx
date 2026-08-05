import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { TableSkeleton } from '@/components/common/Skeleton';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { formatChipLabel } from '@/lib/chipMeta';
import { useAuthStore } from '@/store/authStore';
import type { ClassicStandingRow } from '@/types/league';

const PAGE_SIZE = 25;

type SortKey = 'rank' | 'gameweekPoints' | 'totalPoints';
type SortDir = 'asc' | 'desc';

interface StandingsTableProps {
  standings: ClassicStandingRow[];
  currentGameweek: number | null;
  isLoading: boolean;
}

function SortHeader({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const isActive = activeKey === sortKey;
  const ariaSort = isActive ? (dir === 'asc' ? 'ascending' : 'descending') : 'none';
  return (
    <th scope="col" className={className} aria-sort={ariaSort}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={clsx(
          'inline-flex items-center gap-1 py-2 text-xs uppercase tracking-wide transition hover:text-white',
          isActive ? 'text-fpl-green' : 'text-white/70',
        )}
      >
        {label}
        {isActive ? <span className="text-[10px]">{dir === 'asc' ? '▲' : '▼'}</span> : null}
      </button>
    </th>
  );
}

export function StandingsTable({ standings, currentGameweek, isLoading }: StandingsTableProps) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'rank' ? 'asc' : 'desc');
    }
    setPage(1);
  }

  const sorted = useMemo(() => {
    const rows = [...standings];
    rows.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'rank') {
        cmp = a.rank - b.rank;
      } else if (sortKey === 'gameweekPoints') {
        const aGw = a.gameweekPoints ?? -1;
        const bGw = b.gameweekPoints ?? -1;
        cmp = aGw - bGw;
      } else {
        cmp = a.totalPoints - b.totalPoints;
      }
      if (cmp === 0) {
        cmp = a.managerName.localeCompare(b.managerName);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [standings, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (isLoading) {
    return <TableSkeleton rows={8} cols={5} />;
  }

  if (!standings.length) {
    return <p className="text-sm text-white/50">No members in this league yet.</p>;
  }

  const gwLabel = currentGameweek ? `GW ${currentGameweek}` : 'GW';

  return (
    <div className="space-y-3">
      <div data-lenis-prevent className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <caption className="sr-only">League standings</caption>
          <thead>
            <tr className="border-b border-white/10">
              <SortHeader
                label="Rank"
                sortKey="rank"
                activeKey={sortKey}
                dir={sortDir}
                onSort={handleSort}
                className="w-16 pr-4"
              />
              <th scope="col" className="py-2 pr-4 text-xs uppercase text-white/70">
                Manager
              </th>
              <SortHeader
                label={gwLabel}
                sortKey="gameweekPoints"
                activeKey={sortKey}
                dir={sortDir}
                onSort={handleSort}
                className="w-20 pr-4 text-right"
              />
              <SortHeader
                label="Total"
                sortKey="totalPoints"
                activeKey={sortKey}
                dir={sortDir}
                onSort={handleSort}
                className="w-20 pr-4 text-right"
              />
              <th scope="col" className="py-2 text-xs uppercase text-white/70">
                Chips
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => {
              const isCurrentUser = row.userId === currentUserId;
              return (
                <tr
                  key={row.teamId}
                  className={clsx(
                    'border-b border-white/5',
                    isCurrentUser && 'border-l-2 border-l-fpl-green bg-fpl-green/10',
                  )}
                >
                  <td className="py-2.5 pr-4 font-semibold text-white">{row.rank}</td>
                  <td className="py-2.5 pr-4">
                    <p className="font-medium text-white">{row.managerName}</p>
                    <p className="text-xs text-white/70">{row.teamName}</p>
                  </td>
                  <td className="py-2.5 pr-4 text-right text-white/80">
                    {row.gameweekPoints ?? '—'}
                  </td>
                  <td className="py-2.5 pr-4 text-right font-semibold text-fpl-green">
                    {row.totalPoints}
                  </td>
                  <td className="py-2.5">
                    {row.chipsUsed.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {row.chipsUsed.map((chip) => (
                          <Badge key={`${chip.chipType}-${chip.gameweekNumber}`} variant="default">
                            {formatChipLabel(chip.chipType)} GW{chip.gameweekNumber}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-white/30">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <Button
            variant="secondary"
            className="px-3 py-1.5 text-xs"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-xs text-white/60">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="secondary"
            className="px-3 py-1.5 text-xs"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}

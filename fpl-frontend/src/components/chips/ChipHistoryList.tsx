import { formatChipLabel } from '@/lib/chipMeta';
import { Skeleton } from '@/components/common/Skeleton';
import type { ChipHistoryItem } from '@/types/chip';

interface ChipHistoryListProps {
  history: ChipHistoryItem[];
  isLoading?: boolean;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function ChipHistoryList({ history, isLoading }: ChipHistoryListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (history.length === 0) {
    return <p className="text-sm text-white/50">No chips played this season.</p>;
  }

  const sorted = [...history].sort((a, b) => b.gameweekNumber - a.gameweekNumber);

  return (
    <div data-lenis-prevent className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 text-xs uppercase text-white/50">
            <th className="px-2 py-2 font-medium">GW</th>
            <th className="px-2 py-2 font-medium">Chip</th>
            <th className="px-2 py-2 font-medium">Played</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((item) => (
            <tr key={`${item.chipType}-${item.gameweekNumber}-${item.usedAt}`} className="border-b border-white/5">
              <td className="px-2 py-2 text-white">{item.gameweekNumber}</td>
              <td className="px-2 py-2 text-white">
                {formatChipLabel(item.chipType, item.wildcardNumber)}
              </td>
              <td className="px-2 py-2 text-white/60">{formatDate(item.usedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

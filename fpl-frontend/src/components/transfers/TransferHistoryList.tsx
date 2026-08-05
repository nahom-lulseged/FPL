import { Button } from '@/components/common/Button';
import { TableSkeleton } from '@/components/common/Skeleton';
import { formatPrice } from '@/lib/formatters';
import type { PaginatedResponse } from '@/types/api';
import type { TransferHistoryItem } from '@/types/transfer';

interface TransferHistoryListProps {
  data?: PaginatedResponse<TransferHistoryItem>;
  isLoading: boolean;
  page: number;
  onPageChange: (page: number) => void;
}

export function TransferHistoryList({
  data,
  isLoading,
  page,
  onPageChange,
}: TransferHistoryListProps) {
  if (isLoading) {
    return <TableSkeleton rows={5} cols={5} />;
  }

  if (!data?.data.length) {
    return <p className="text-sm text-white/50">No transfers made yet.</p>;
  }

  return (
    <div className="space-y-3">
      <div data-lenis-prevent className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase text-white/50">
              <th className="py-2 pr-4">GW</th>
              <th className="py-2 pr-4">Out</th>
              <th className="py-2 pr-4">In</th>
              <th className="py-2 pr-4">Cost</th>
              <th className="py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {data.data.map((item) => (
              <tr key={item.id} className="border-b border-white/5">
                <td className="py-2 pr-4 text-white/80">{item.gameweek.number}</td>
                <td className="py-2 pr-4 text-fpl-pink">{item.playerOut.name}</td>
                <td className="py-2 pr-4 text-fpl-green">{item.playerIn.name}</td>
                <td className="py-2 pr-4 text-white/70">{formatPrice(item.pricePaid)}</td>
                <td className="py-2 text-white/50">
                  {new Date(item.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.meta.totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <Button
            variant="secondary"
            className="px-3 py-1.5 text-xs"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>
          <span className="text-xs text-white/60">
            Page {data.meta.page} of {data.meta.totalPages}
          </span>
          <Button
            variant="secondary"
            className="px-3 py-1.5 text-xs"
            disabled={page >= data.meta.totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}

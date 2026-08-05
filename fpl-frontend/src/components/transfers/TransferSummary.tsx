import { formatPrice } from '@/lib/formatters';
import type { PendingTransfer } from '@/types/transfer';

interface TransferSummaryProps {
  transfers: PendingTransfer[];
  onRemove: (playerOutId: string) => void;
}

export function TransferSummary({ transfers, onRemove }: TransferSummaryProps) {
  if (transfers.length === 0) {
    return (
      <p className="text-sm text-white/50">No pending transfers. Tap a player on the pitch to start.</p>
    );
  }

  return (
    <ul className="space-y-2">
      {transfers.map((transfer) => {
        const priceDelta = transfer.playerIn.price - transfer.playerOut.price;
        return (
          <li
            key={transfer.playerOutId}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
          >
            <div className="min-w-0 text-sm">
              <span className="text-fpl-pink line-through">{transfer.playerOut.name}</span>
              <span className="mx-2 text-white/40">→</span>
              <span className="font-medium text-fpl-green">{transfer.playerIn.name}</span>
              <span className="ml-2 text-white/50">
                ({priceDelta >= 0 ? '+' : ''}
                {formatPrice(Math.abs(priceDelta))})
              </span>
            </div>
            <button
              type="button"
              onClick={() => onRemove(transfer.playerOutId)}
              className="text-xs text-fpl-pink hover:text-fpl-pink/80"
            >
              Remove
            </button>
          </li>
        );
      })}
    </ul>
  );
}

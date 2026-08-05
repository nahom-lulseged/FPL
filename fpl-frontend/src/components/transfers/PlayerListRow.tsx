import clsx from 'clsx';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { formatPrice } from '@/lib/formatters';
import { canAddPlayer } from '@/lib/fplRules';
import type { PlayerListItem, Position } from '@/types/player';

interface PlayerListRowProps {
  player: PlayerListItem;
  selectedPlayers: PlayerListItem[];
  activePosition?: Position | null;
  mode?: 'builder' | 'transfer';
  onAdd?: (player: PlayerListItem) => void;
  onTransferIn?: (player: PlayerListItem) => void;
  canTransferIn?: (player: PlayerListItem) => { ok: boolean; reason?: string };
}

export function PlayerListRow({
  player,
  selectedPlayers,
  activePosition,
  mode = 'builder',
  onAdd,
  onTransferIn,
  canTransferIn,
}: PlayerListRowProps) {
  const isSelected = selectedPlayers.some((p) => p.id === player.id);

  let disabled = false;
  let reason: string | undefined;

  if (mode === 'builder') {
    const canAdd = canAddPlayer(selectedPlayers, player, activePosition);
    disabled = isSelected || !canAdd.ok || !player.isAvailable;
    reason = canAdd.reason;
  } else {
    const transferCheck = canTransferIn?.(player) ?? { ok: false, reason: 'Select a player to transfer out' };
    disabled = isSelected || !transferCheck.ok || !player.isAvailable || !activePosition;
    reason = transferCheck.reason;
  }

  const handleClick = () => {
    if (mode === 'transfer' && onTransferIn) {
      onTransferIn(player);
    } else if (onAdd) {
      onAdd(player);
    }
  };

  return (
    <div
      className={clsx(
        'flex items-center gap-3 rounded-lg border px-3 py-2',
        isSelected ? 'border-fpl-green/40 bg-fpl-green/5' : 'border-white/10 bg-white/5',
        mode === 'transfer' && !disabled && !isSelected && 'border-fpl-green/40 bg-fpl-green/5',
        !player.isAvailable && 'opacity-50',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-white">{player.name}</span>
          <Badge variant="position">{player.position}</Badge>
          {!player.isAvailable ? <Badge variant="danger">Unavailable</Badge> : null}
          {isSelected ? <Badge variant="success">In squad</Badge> : null}
        </div>
        <p className="text-sm text-white/60">
          {player.realTeam.shortName} · {formatPrice(player.price)}
        </p>
        {!disabled && mode === 'transfer' && activePosition ? null : null}
        {reason && !isSelected && player.isAvailable ? (
          <p className="text-xs text-fpl-gray-500">{reason}</p>
        ) : null}
      </div>
      <Button
        variant="secondary"
        className="shrink-0 px-3 py-1.5 text-xs"
        disabled={disabled}
        onClick={handleClick}
      >
        {isSelected ? 'In squad' : mode === 'transfer' ? 'Transfer in' : 'Add'}
      </Button>
    </div>
  );
}

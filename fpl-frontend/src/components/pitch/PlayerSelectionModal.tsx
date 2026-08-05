import { Modal } from '@/components/common/Modal';
import { PlayerSelectionPanel } from '@/components/pitch/PlayerSelectionPanel';
import type { PlayerListItem, Position } from '@/types/player';

interface PlayerSelectionModalProps {
  open: boolean;
  activePosition: Position;
  activeSlotIndex: number;
  selectedPlayers: PlayerListItem[];
  onAdd: (player: PlayerListItem) => void;
  onPlayerInfo?: (playerId: string) => void;
  onClose: () => void;
}

export function PlayerSelectionModal({
  open,
  activePosition,
  activeSlotIndex,
  selectedPlayers,
  onAdd,
  onPlayerInfo,
  onClose,
}: PlayerSelectionModalProps) {
  const handleAdd = (player: PlayerListItem) => {
    onAdd(player);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Player Selection"
      placement="bottom"
      hideTitle
      className="player-selection-dialog !max-w-xl"
    >
      <PlayerSelectionPanel
        key={`${activePosition}-${activeSlotIndex}`}
        activePosition={activePosition}
        activeSlotIndex={activeSlotIndex}
        selectedPlayers={selectedPlayers}
        onAdd={handleAdd}
        onPlayerInfo={onPlayerInfo}
        showHeaderStats={false}
        showTitle
        variant="modal"
        className="border-0 bg-transparent p-0 shadow-none"
      />
    </Modal>
  );
}

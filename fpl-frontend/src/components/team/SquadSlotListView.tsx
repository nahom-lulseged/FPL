import clsx from 'clsx';
import { FplAddRemoveButton, FplInfoButton } from '@/components/common/FplButtons';
import { ShirtVisual } from '@/components/pitch/PlayerCard';
import { formatPrice } from '@/lib/formatters';
import { POSITION_LIMITS } from '@/lib/fplRules';
import type { SquadDisplayMetric } from '@/lib/squadFixtureDisplay';
import type { FixtureListItem } from '@/types/fixture';
import type { PlayerListItem, Position } from '@/types/player';

export type SquadListDisplayMetric = SquadDisplayMetric;

const POSITION_ORDER: Position[] = ['GK', 'DEF', 'MID', 'FWD'];
const POSITION_LABELS: Record<Position, string> = {
  GK: 'Goalkeeper', DEF: 'Defender', MID: 'Midfielder', FWD: 'Forward',
};
const POSITION_PLURAL: Record<Position, string> = {
  GK: 'Goalkeepers', DEF: 'Defenders', MID: 'Midfielders', FWD: 'Forwards',
};
const POSITION_SHORT: Record<Position, string> = {
  GK: 'GKP', DEF: 'DEF', MID: 'MID', FWD: 'FWD',
};

interface SquadSlotListViewProps {
  selectedPlayers: PlayerListItem[];
  onSlotClick: (position: Position, index: number, playerId?: string) => void;
  onPlayerInfo?: (playerId: string) => void;
  displayMetric?: SquadListDisplayMetric;
  fixtureMap?: Map<string, FixtureListItem[]>;
}

function buildSlotsForPosition(players: PlayerListItem[], position: Position) {
  const filled = players.filter((player) => player.position === position);
  return Array.from({ length: POSITION_LIMITS[position] }, (_, index) => filled[index] ?? null);
}

function SquadListColumnHeader() {
  return (
    <div className="squad-reference-list-grid squad-reference-list-header">
      <span>Player</span>
      <span>Form</span>
      <span>Current Price</span>
      <span>Selected</span>
    </div>
  );
}

function SquadFilledRow({
  player,
  position,
  index,
  onSlotClick,
  onPlayerInfo,
}: {
  player: PlayerListItem;
  position: Position;
  index: number;
  onSlotClick: SquadSlotListViewProps['onSlotClick'];
  onPlayerInfo?: SquadSlotListViewProps['onPlayerInfo'];
}) {
  return (
    <div className="squad-reference-list-grid squad-reference-list-row">
      <div className="squad-reference-list-player">
        <FplInfoButton label={`Info about ${player.name}`} onClick={() => onPlayerInfo?.(player.id)} />
        <ShirtVisual shortName={player.realTeam.shortName} position={player.position} clubId={player.realTeam.id} />
        <div className="min-w-0">
          <p>{player.name}</p>
          <small>{player.realTeam.name} {POSITION_SHORT[player.position]}</small>
        </div>
      </div>
      <span>{(player.eventPoints ?? 0).toFixed(1)}</span>
      <span>{formatPrice(player.price)}</span>
      <span>{(player.selectedByPercent ?? 0).toFixed(1)}%</span>
      <FplAddRemoveButton
        mode="remove"
        playerName={player.name}
        onClick={() => onSlotClick(position, index, player.id)}
      />
    </div>
  );
}

function SquadEmptySlot({
  position,
  index,
  onSlotClick,
}: {
  position: Position;
  index: number;
  onSlotClick: SquadSlotListViewProps['onSlotClick'];
}) {
  return (
    <button
      type="button"
      onClick={() => onSlotClick(position, index)}
      className="squad-reference-empty-slot"
    >
      Select {POSITION_LABELS[position]}
    </button>
  );
}

export function SquadSlotListView({
  selectedPlayers,
  onSlotClick,
  onPlayerInfo,
}: SquadSlotListViewProps) {
  return (
    <div data-lenis-prevent className="squad-reference-list">
      <SquadListColumnHeader />
      {POSITION_ORDER.map((position, positionIndex) => (
        <section key={position} className={clsx(positionIndex > 0 && 'squad-reference-list-section')}>
          <h3>{POSITION_PLURAL[position]}</h3>
          {buildSlotsForPosition(selectedPlayers, position).map((player, index) =>
            player ? (
              <SquadFilledRow
                key={`${position}-${player.id}`}
                player={player}
                position={position}
                index={index}
                onSlotClick={onSlotClick}
                onPlayerInfo={onPlayerInfo}
              />
            ) : (
              <SquadEmptySlot
                key={`${position}-${index}-empty`}
                position={position}
                index={index}
                onSlotClick={onSlotClick}
              />
            ),
          )}
        </section>
      ))}
    </div>
  );
}

import clsx from 'clsx';
import { TeamLogo } from '@/components/common/TeamLogo';
import { PlayerCard, type PlayerCardLayout } from '@/components/pitch/PlayerCard';
import { POSITION_LIMITS, SQUAD_SIZE, type Formation, type LineupSlot } from '@/lib/fplRules';
import type { PlayerListItem, Position } from '@/types/player';
import type { PointsStatus, SquadEntry } from '@/types/team';

type PitchMode = 'draft-buckets' | 'formation' | 'saved' | 'transfer';
export type PitchBadgeMode = 'price' | 'status';

interface PitchViewProps {
  mode: PitchMode;
  badgeMode: PitchBadgeMode;
  selectedPlayers?: PlayerListItem[];
  lineup?: LineupSlot[];
  squad?: SquadEntry[];
  formation?: Formation;
  activeSlot?: Position | null;
  activeSlotIndex?: number | null;
  selectedOutId?: string | null;
  /** Highlight for pick-team swap selection */
  selectedPlayerId?: string | null;
  /** IDs that form a valid lineup when switched with selectedPlayerId */
  validSwitchTargetIds?: Set<string>;
  pointsStatus?: PointsStatus;
  editMode?: boolean;
  onSlotClick?: (position: Position, index: number, playerId?: string) => void;
  onStarterClick?: (playerId: string) => void;
  onPlayerClick?: (playerId: string) => void;
  /** Primary tap in edit mode (select/swap) */
  onPlayerActivate?: (playerId: string) => void;
  onMakeCaptain?: (playerId: string) => void;
  onMakeVice?: (playerId: string) => void;
  onBenchReorder?: (playerId: string, direction: 'up' | 'down') => void;
  onTransferOutClick?: (playerId: string) => void;
  className?: string;
  keepBucketLayout?: boolean;
  cardLayout?: PlayerCardLayout;
  builderMode?: boolean;
  playerDisplayValues?: Map<string, string>;
  /** Saved-team cards open one action menu instead of rendering nested controls. */
  usePlayerActionMenu?: boolean;
  /** Transfer overview can show the full 15-player squad grouped by position. */
  transferLayout?: 'formation' | 'squad';
  invalidPlayerIds?: Set<string>;
  pendingIncomingIds?: Set<string>;
}

function getPlayersByPosition(players: PlayerListItem[], position: Position) {
  return players.filter((p) => p.position === position);
}

function buildFormationRows(
  lineup: LineupSlot[],
  playersById: Map<string, PlayerListItem | SquadEntry>,
  isSquadEntry: boolean,
) {
  const starters = lineup.filter((s) => s.isStarter);
  const getPlayer = (playerId: string) => playersById.get(playerId);

  const gk = starters.filter((s) => {
    const p = getPlayer(s.playerId);
    const pos = isSquadEntry
      ? (p as SquadEntry | undefined)?.position
      : (p as PlayerListItem | undefined)?.position;
    return pos === 'GK';
  });
  const def = starters.filter((s) => {
    const p = getPlayer(s.playerId);
    const pos = isSquadEntry
      ? (p as SquadEntry | undefined)?.position
      : (p as PlayerListItem | undefined)?.position;
    return pos === 'DEF';
  });
  const mid = starters.filter((s) => {
    const p = getPlayer(s.playerId);
    const pos = isSquadEntry
      ? (p as SquadEntry | undefined)?.position
      : (p as PlayerListItem | undefined)?.position;
    return pos === 'MID';
  });
  const fwd = starters.filter((s) => {
    const p = getPlayer(s.playerId);
    const pos = isSquadEntry
      ? (p as SquadEntry | undefined)?.position
      : (p as PlayerListItem | undefined)?.position;
    return pos === 'FWD';
  });

  const bench = lineup
    .filter((s) => !s.isStarter)
    .sort((a, b) => (a.benchOrder ?? 0) - (b.benchOrder ?? 0));

  return { gk, def, mid, fwd, bench };
}

function renderFormationSlot(
  slot: LineupSlot,
  player: PlayerListItem | SquadEntry | undefined,
  isSquadEntry: boolean,
  options: {
    onSlotClick?: PitchViewProps['onSlotClick'];
    onStarterClick?: PitchViewProps['onStarterClick'];
    onPlayerClick?: PitchViewProps['onPlayerClick'];
    onPlayerActivate?: PitchViewProps['onPlayerActivate'];
    onMakeCaptain?: PitchViewProps['onMakeCaptain'];
    onMakeVice?: PitchViewProps['onMakeVice'];
    onBenchReorder?: PitchViewProps['onBenchReorder'];
    onTransferOutClick?: PitchViewProps['onTransferOutClick'];
    selectedOutId?: string | null;
    selectedPlayerId?: string | null;
    validSwitchTargetIds?: Set<string>;
    pointsStatus?: PointsStatus;
    isTransferMode?: boolean;
    editMode?: boolean;
    cardLayout?: PlayerCardLayout;
    builderMode?: boolean;
    playerDisplayValues?: Map<string, string>;
    usePlayerActionMenu?: boolean;
    invalidPlayerIds?: Set<string>;
    pendingIncomingIds?: Set<string>;
    badgeMode: PitchBadgeMode;
  },
) {
  if (!player) {
    return null;
  }

  const entry = isSquadEntry ? (player as SquadEntry) : null;
  const listItem = isSquadEntry ? null : (player as PlayerListItem);

  const name = isSquadEntry ? entry!.player.name : listItem!.name;
  const shortName = isSquadEntry ? entry!.player.realTeam.shortName : listItem!.realTeam.shortName;
  const clubId = isSquadEntry ? entry!.player.realTeam.id : listItem!.realTeam.id;
  const price = isSquadEntry ? entry!.player.price : listItem!.price;
  const points = isSquadEntry ? entry!.gameweekPoints : undefined;
  const position = isSquadEntry ? entry!.position : listItem!.position;
  const isSelected = options.selectedPlayerId === slot.playerId;
  const isValidSwitchTarget =
    !options.selectedPlayerId ||
    isSelected ||
    Boolean(options.validSwitchTargetIds?.has(slot.playerId));
  const isActive =
    (options.isTransferMode && options.selectedOutId === slot.playerId) || isSelected;
  const isInvalid = options.invalidPlayerIds?.has(slot.playerId);

  const handleClick = () => {
    if (options.isTransferMode && options.onTransferOutClick) {
      options.onTransferOutClick(slot.playerId);
      return;
    }
    if (options.editMode && options.onPlayerActivate) {
      options.onPlayerActivate(slot.playerId);
      return;
    }
    if (options.onPlayerClick) {
      options.onPlayerClick(slot.playerId);
      return;
    }
    if (options.onStarterClick && slot.isStarter) {
      options.onStarterClick(slot.playerId);
      return;
    }
    if (options.onSlotClick) {
      options.onSlotClick(position, 0, slot.playerId);
    }
  };

  const canReorderBench =
    options.editMode && options.onBenchReorder && !slot.isStarter && position !== 'GK';

  return (
    <PlayerCard
      key={slot.playerId}
      variant={isActive ? 'active' : 'filled'}
      name={name}
      shortName={shortName}
      clubId={clubId}
      price={price}
      badgeMode={options.badgeMode}
      availabilityStatus={isSquadEntry ? entry!.player.availabilityStatus : listItem!.availabilityStatus}
      chanceOfPlayingNextRound={isSquadEntry ? entry!.player.chanceOfPlayingNextRound : listItem!.chanceOfPlayingNextRound}
      position={position}
      points={points}
      layout={options.cardLayout}
      builderMode={options.builderMode}
      displayText={options.playerDisplayValues?.get(slot.playerId)}
      isCaptain={slot.isStarter && slot.isCaptain}
      isViceCaptain={slot.isStarter && slot.isViceCaptain}
      isStarter={slot.isStarter}
      wasSubstitutedIn={entry?.wasSubstitutedIn}
      wasSubstitutedOut={entry?.wasSubstitutedOut}
      pointsStatus={options.pointsStatus ?? entry?.pointsStatus}
      dimmed={entry?.counted === false || !isValidSwitchTarget}
      disabled={Boolean(options.selectedPlayerId && !isValidSwitchTarget)}
      transferOut={Boolean(options.isTransferMode && options.selectedOutId === slot.playerId)}
      pendingTransfer={Boolean(options.pendingIncomingIds?.has(slot.playerId))}
      className={isInvalid ? 'is-transfer-invalid-card' : undefined}
      showCaptainControls={Boolean(options.editMode && slot.isStarter && !options.usePlayerActionMenu)}
      showSwitchControl={Boolean(options.editMode && !options.usePlayerActionMenu)}
      switchModeActive={Boolean(options.selectedPlayerId)}
      isSwitchSelected={isSelected}
      isSwitchTargetValid={isValidSwitchTarget}
      onMakeCaptain={
        options.editMode && options.onMakeCaptain
          ? () => options.onMakeCaptain?.(slot.playerId)
          : undefined
      }
      onMakeVice={
        options.editMode && options.onMakeVice
          ? () => options.onMakeVice?.(slot.playerId)
          : undefined
      }
      onBenchUp={
        canReorderBench && (slot.benchOrder ?? 0) > 2
          ? () => options.onBenchReorder?.(slot.playerId, 'up')
          : undefined
      }
      onBenchDown={
        canReorderBench && (slot.benchOrder ?? 0) < 4
          ? () => options.onBenchReorder?.(slot.playerId, 'down')
          : undefined
      }
      onClick={handleClick}
    />
  );
}

function renderTransferSquadEntry(
  entry: SquadEntry,
  options: {
    selectedOutId?: string | null;
    invalidPlayerIds?: Set<string>;
    pendingIncomingIds?: Set<string>;
    cardLayout?: PlayerCardLayout;
    builderMode?: boolean;
    playerDisplayValues?: Map<string, string>;
    onTransferOutClick?: PitchViewProps['onTransferOutClick'];
    badgeMode: PitchBadgeMode;
  },
) {
  const isSelectedOut = options.selectedOutId === entry.playerId;
  const isInvalid = options.invalidPlayerIds?.has(entry.playerId);
  const isPendingIncoming = options.pendingIncomingIds?.has(entry.playerId);

  return (
    <PlayerCard
      key={entry.playerId}
      variant={isSelectedOut ? 'active' : 'filled'}
      name={entry.player.name}
      shortName={entry.player.realTeam.shortName}
      clubId={entry.player.realTeam.id}
      price={entry.player.price}
      badgeMode={options.badgeMode}
      availabilityStatus={entry.player.availabilityStatus}
      chanceOfPlayingNextRound={entry.player.chanceOfPlayingNextRound}
      position={entry.position}
      points={entry.gameweekPoints}
      layout={options.cardLayout}
      builderMode={options.builderMode}
      displayText={options.playerDisplayValues?.get(entry.playerId)}
      isCaptain={entry.isCaptain}
      isViceCaptain={entry.isViceCaptain}
      isStarter={entry.isStarter}
      wasSubstitutedIn={entry.wasSubstitutedIn}
      wasSubstitutedOut={entry.wasSubstitutedOut}
      pointsStatus={entry.pointsStatus}
      transferOut={isSelectedOut}
      pendingTransfer={isPendingIncoming}
      className={isInvalid ? 'is-transfer-invalid-card' : undefined}
      onClick={() => options.onTransferOutClick?.(entry.playerId)}
    />
  );
}

function TransferSquadRow({
  position,
  squad,
  selectedOutId,
  invalidPlayerIds,
  pendingIncomingIds,
  onTransferOutClick,
  cardLayout,
  builderMode,
  playerDisplayValues,
  badgeMode,
}: {
  position: Position;
  squad: SquadEntry[];
  selectedOutId?: string | null;
  invalidPlayerIds?: Set<string>;
  pendingIncomingIds?: Set<string>;
  onTransferOutClick?: PitchViewProps['onTransferOutClick'];
  cardLayout?: PlayerCardLayout;
  builderMode?: boolean;
  playerDisplayValues?: Map<string, string>;
  badgeMode: PitchBadgeMode;
}) {
  const entries = squad.filter((entry) => entry.position === position);

  return (
    <div
      className={clsx('flex flex-wrap justify-center gap-2 sm:gap-2.5', builderMode && 'pitch-position-row')}
      data-position={position}
    >
      {entries.map((entry) =>
        renderTransferSquadEntry(entry, {
          selectedOutId,
          invalidPlayerIds,
          pendingIncomingIds,
          onTransferOutClick,
          cardLayout,
          builderMode,
          playerDisplayValues,
          badgeMode,
        }),
      )}
    </div>
  );
}

function PositionBucketRow({
  position,
  players,
  activeSlot,
  activeSlotIndex,
  onSlotClick,
  cardLayout,
  builderMode,
  playerDisplayValues,
  badgeMode,
}: {
  position: Position;
  players: PlayerListItem[];
  activeSlot?: Position | null;
  activeSlotIndex?: number | null;
  onSlotClick?: PitchViewProps['onSlotClick'];
  cardLayout?: PlayerCardLayout;
  builderMode?: boolean;
  playerDisplayValues?: Map<string, string>;
  badgeMode: PitchBadgeMode;
}) {
  const limit = POSITION_LIMITS[position];
  const slots = Array.from({ length: limit }, (_, index) => players[index] ?? null);

  return (
    <div
      className={clsx(
        'flex flex-wrap justify-center gap-2 sm:gap-2.5',
        builderMode && 'pitch-position-row',
      )}
      data-position={position}
    >
      {slots.map((player, index) => {
        const isActive = activeSlot === position && activeSlotIndex === index;
        if (player) {
          return (
            <PlayerCard
              key={player.id}
              variant={isActive ? 'active' : 'filled'}
              layout={cardLayout}
              builderMode={builderMode}
              name={player.name}
              shortName={player.realTeam.shortName}
              clubId={player.realTeam.id}
              price={player.price}
              badgeMode={badgeMode}
              availabilityStatus={player.availabilityStatus}
              chanceOfPlayingNextRound={player.chanceOfPlayingNextRound}
              position={position}
              displayText={playerDisplayValues?.get(player.id)}
              onClick={() => onSlotClick?.(position, index, player.id)}
            />
          );
        }
        return (
          <PlayerCard
            key={`${position}-${index}`}
            variant={isActive ? 'active' : 'empty'}
            layout={cardLayout}
            position={position}
            onClick={() => onSlotClick?.(position, index)}
          />
        );
      })}
    </div>
  );
}

export function PitchView({
  mode,
  badgeMode,
  selectedPlayers = [],
  lineup = [],
  squad = [],
  activeSlot,
  activeSlotIndex,
  selectedOutId,
  selectedPlayerId,
  validSwitchTargetIds,
  pointsStatus,
  editMode = false,
  onSlotClick,
  onStarterClick,
  onPlayerClick,
  onPlayerActivate,
  onMakeCaptain,
  onMakeVice,
  onBenchReorder,
  onTransferOutClick,
  className,
  keepBucketLayout = false,
  cardLayout = 'default',
  builderMode = false,
  playerDisplayValues,
  usePlayerActionMenu = false,
  transferLayout = 'formation',
  invalidPlayerIds,
  pendingIncomingIds,
}: PitchViewProps) {
  const isComplete = selectedPlayers.length === SQUAD_SIZE;
  const isSquadMode = mode === 'saved' || mode === 'transfer';
  const showTransferSquad = mode === 'transfer' && transferLayout === 'squad';
  const showFormation =
    !showTransferSquad &&
    !keepBucketLayout &&
    (mode === 'formation' || isSquadMode || (mode === 'draft-buckets' && isComplete));

  const playersById = new Map<string, PlayerListItem | SquadEntry>();
  if (isSquadMode) {
    for (const entry of squad) {
      playersById.set(entry.playerId, entry);
    }
  } else {
    for (const player of selectedPlayers) {
      playersById.set(player.id, player);
    }
  }

  const activeLineup = isSquadMode
    ? squad.map((entry) => ({
        playerId: entry.playerId,
        isStarter: entry.isStarter,
        benchOrder: entry.benchOrder,
        isCaptain: entry.isCaptain,
        isViceCaptain: entry.isViceCaptain,
      }))
    : lineup;

  const { gk, def, mid, fwd, bench } = buildFormationRows(
    activeLineup,
    playersById,
    isSquadMode,
  );

  const slotOptions = {
    onSlotClick,
    onStarterClick: isSquadMode && mode !== 'transfer' && !editMode ? onStarterClick : undefined,
    onPlayerClick: isSquadMode && mode !== 'transfer' && !editMode ? onPlayerClick : undefined,
    onPlayerActivate: editMode ? onPlayerActivate : undefined,
    onMakeCaptain: editMode ? onMakeCaptain : undefined,
    onMakeVice: editMode ? onMakeVice : undefined,
    onBenchReorder: editMode ? onBenchReorder : undefined,
    onTransferOutClick: mode === 'transfer' ? onTransferOutClick : undefined,
    selectedOutId,
    selectedPlayerId: editMode ? selectedPlayerId : null,
    validSwitchTargetIds: editMode ? validSwitchTargetIds : undefined,
    pointsStatus,
    isTransferMode: mode === 'transfer',
    editMode,
    cardLayout,
    builderMode,
    playerDisplayValues,
    usePlayerActionMenu,
    invalidPlayerIds,
    pendingIncomingIds,
    badgeMode,
  };

  return (
    <div
      className={clsx(
        'pitch-overlay-lines relative overflow-hidden rounded-[1.75rem] border border-pitch-green/40 bg-gradient-to-b from-[#24A85A] via-[#1C8B49] to-[#15702F] px-2 pb-4 pt-2 shadow-xl shadow-black/30 sm:px-3 sm:pt-2.5',
        builderMode && 'fpl-builder-pitch',
        className,
      )}
      data-testid={builderMode ? 'squad-builder-pitch' : undefined}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-10 bg-gradient-to-b from-white/10 to-transparent" aria-hidden />

      {builderMode ? (
        <div className="pitch-brand-strip" aria-hidden="true">
          <TeamLogo decorative eager />
          <span />
          <TeamLogo decorative eager />
        </div>
      ) : null}

      {showTransferSquad ? (
        <div className={clsx('space-y-3 sm:space-y-4', builderMode && 'pitch-player-grid')}>
          <TransferSquadRow
            position="GK"
            squad={squad}
            selectedOutId={selectedOutId}
            invalidPlayerIds={invalidPlayerIds}
            pendingIncomingIds={pendingIncomingIds}
            onTransferOutClick={onTransferOutClick}
            cardLayout={cardLayout}
            builderMode={builderMode}
            playerDisplayValues={playerDisplayValues}
            badgeMode={badgeMode}
          />
          <TransferSquadRow
            position="DEF"
            squad={squad}
            selectedOutId={selectedOutId}
            invalidPlayerIds={invalidPlayerIds}
            pendingIncomingIds={pendingIncomingIds}
            onTransferOutClick={onTransferOutClick}
            cardLayout={cardLayout}
            builderMode={builderMode}
            playerDisplayValues={playerDisplayValues}
            badgeMode={badgeMode}
          />
          <TransferSquadRow
            position="MID"
            squad={squad}
            selectedOutId={selectedOutId}
            invalidPlayerIds={invalidPlayerIds}
            pendingIncomingIds={pendingIncomingIds}
            onTransferOutClick={onTransferOutClick}
            cardLayout={cardLayout}
            builderMode={builderMode}
            playerDisplayValues={playerDisplayValues}
            badgeMode={badgeMode}
          />
          <TransferSquadRow
            position="FWD"
            squad={squad}
            selectedOutId={selectedOutId}
            invalidPlayerIds={invalidPlayerIds}
            pendingIncomingIds={pendingIncomingIds}
            onTransferOutClick={onTransferOutClick}
            cardLayout={cardLayout}
            builderMode={builderMode}
            playerDisplayValues={playerDisplayValues}
            badgeMode={badgeMode}
          />
        </div>
      ) : !showFormation ? (
        <div className={clsx('space-y-3 sm:space-y-4', builderMode && 'pitch-player-grid')}>
          <PositionBucketRow
            position="GK"
            players={getPlayersByPosition(selectedPlayers, 'GK')}
            activeSlot={activeSlot}
            activeSlotIndex={activeSlotIndex}
            onSlotClick={onSlotClick}
            cardLayout={cardLayout}
            builderMode={builderMode}
            playerDisplayValues={playerDisplayValues}
            badgeMode={badgeMode}
          />
          <PositionBucketRow
            position="DEF"
            players={getPlayersByPosition(selectedPlayers, 'DEF')}
            activeSlot={activeSlot}
            activeSlotIndex={activeSlotIndex}
            onSlotClick={onSlotClick}
            cardLayout={cardLayout}
            builderMode={builderMode}
            playerDisplayValues={playerDisplayValues}
            badgeMode={badgeMode}
          />
          <PositionBucketRow
            position="MID"
            players={getPlayersByPosition(selectedPlayers, 'MID')}
            activeSlot={activeSlot}
            activeSlotIndex={activeSlotIndex}
            onSlotClick={onSlotClick}
            cardLayout={cardLayout}
            builderMode={builderMode}
            playerDisplayValues={playerDisplayValues}
            badgeMode={badgeMode}
          />
          <PositionBucketRow
            position="FWD"
            players={getPlayersByPosition(selectedPlayers, 'FWD')}
            activeSlot={activeSlot}
            activeSlotIndex={activeSlotIndex}
            onSlotClick={onSlotClick}
            cardLayout={cardLayout}
            builderMode={builderMode}
            playerDisplayValues={playerDisplayValues}
            badgeMode={badgeMode}
          />
        </div>
      ) : (
        <div className="pitch-formation-grid">
          <div className="pitch-formation-row">
            {gk.map((slot) =>
              renderFormationSlot(slot, playersById.get(slot.playerId), isSquadMode, slotOptions),
            )}
          </div>
          <div className="pitch-formation-row">
            {def.map((slot) =>
              renderFormationSlot(slot, playersById.get(slot.playerId), isSquadMode, slotOptions),
            )}
          </div>
          <div className="pitch-formation-row">
            {mid.map((slot) =>
              renderFormationSlot(slot, playersById.get(slot.playerId), isSquadMode, slotOptions),
            )}
          </div>
          <div className="pitch-formation-row">
            {fwd.map((slot) =>
              renderFormationSlot(slot, playersById.get(slot.playerId), isSquadMode, slotOptions),
            )}
          </div>
          <section className="pitch-bench" aria-label="Bench">
            <div className="pitch-bench-grid">
              {bench.map((slot) => {
                const player = playersById.get(slot.playerId);
                const benchPosition = isSquadMode
                  ? (player as SquadEntry | undefined)?.position
                  : (player as PlayerListItem | undefined)?.position;
                return (
                  <div className="pitch-bench-slot" key={slot.playerId}>
                    <strong>{benchPosition ?? 'SUB'}</strong>
                    {renderFormationSlot(slot, player, isSquadMode, slotOptions)}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {mode === 'draft-buckets' && !isComplete && !builderMode ? (
        <p className="mt-4 text-center text-xs text-white/50">
          Tap an empty slot to filter players by position
        </p>
      ) : null}

      {editMode ? (
        <p className="mt-4 text-center text-xs text-white/70">
          {selectedPlayerId
            ? 'Choose a highlighted player to complete the switch, or press Escape to cancel.'
            : 'Select a player to open the team actions menu.'}
        </p>
      ) : null}

      {mode === 'transfer' ? (
        <p className="mt-4 text-center text-xs text-white/50">
          Tap a player to transfer out, then pick a replacement from the list
        </p>
      ) : null}
    </div>
  );
}

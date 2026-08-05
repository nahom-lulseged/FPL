import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CircleArrowUp, CircleHelp, Crown, RefreshCw, ShieldCheck, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { ShirtVisual } from '@/components/pitch/PlayerCard';
import { PitchView } from '@/components/pitch/PitchView';
import { PlayerDetailModal } from '@/components/team/PlayerDetailModal';
import { PlayerPointsModal } from '@/components/team/PlayerPointsModal';
import {
  WorkflowChipCard,
  WorkflowDeadlineLine,
  WorkflowHeader,
  WorkflowSegmentedControl,
  type WorkflowChipState,
} from '@/components/team/TeamWorkflowUi';
import { useChipStatus } from '@/hooks/useChipStatus';
import { useCancelChip } from '@/hooks/useCancelChip';
import { useFixtures } from '@/hooks/useFixtures';
import { usePlayers } from '@/hooks/usePlayers';
import { useSetLineup } from '@/hooks/useTeamMutations';
import {
  DEFAULT_FORMATION,
  VALID_FORMATIONS,
  type Formation,
  type LineupSlot,
} from '@/lib/fplRules';
import { formatPrice } from '@/lib/formatters';
import { buildFixtureMap, getFixtureDisplay } from '@/lib/squadFixtureDisplay';
import {
  detectFormationFromLineup,
  getPickTeamErrors,
  isLineupDirty,
  lineupFromSquadEntries,
  reorderBench,
  setCaptainInPlace,
  setViceCaptainInPlace,
  swapLineupSlots,
} from '@/lib/pickTeamLineup';
import { getErrorMessage } from '@/types/api';
import type { Gameweek } from '@/types/gameweek';
import type { PlayerListItem } from '@/types/player';
import { DEFAULT_PLAYER_STATS } from '@/types/player';
import type { SquadEntry, TeamDetail, TeamGameweekDetail, TeamGameweekPlayer } from '@/types/team';

interface SavedTeamViewProps {
  team: TeamDetail;
  canEdit: boolean;
  onUpdated: () => void;
  gameweekDetail?: TeamGameweekDetail;
  isHistoricalView?: boolean;
  selectedGameweek?: Gameweek | null;
  currentGameweekNumber?: number | null;
  transferWindowError?: unknown;
  onRetryTransferWindow?: () => void;
}

type TeamViewMode = 'pitch' | 'list';
type SavedMetric = 'opponent' | 'points' | 'fdr' | 'status';
type PickTeamChip = 'BENCH_BOOST' | 'TRIPLE_CAPTAIN';
type VisualChip = PickTeamChip | 'WILDCARD' | 'FREE_HIT';

function squadToPlayerList(squad: SquadEntry[]): PlayerListItem[] {
  return squad.map((entry) => ({
    id: entry.playerId,
    name: entry.player.name,
    position: entry.position,
    price: entry.player.price,
    isAvailable: true,
    availabilityStatus: entry.player.availabilityStatus,
    chanceOfPlayingNextRound: entry.player.chanceOfPlayingNextRound,
    realTeam: entry.player.realTeam,
    ...DEFAULT_PLAYER_STATS,
  }));
}

function detectFormation(squad: SquadEntry[]): Formation {
  const starters = squad.filter((s) => s.isStarter);
  const def = starters.filter((s) => s.position === 'DEF').length;
  const mid = starters.filter((s) => s.position === 'MID').length;
  const fwd = starters.filter((s) => s.position === 'FWD').length;
  return VALID_FORMATIONS.find((f) => f.def === def && f.mid === mid && f.fwd === fwd) ?? DEFAULT_FORMATION;
}

function gameweekPlayerToSquadEntry(player: TeamGameweekPlayer, team: TeamDetail): SquadEntry {
  const squadPlayer = team.squad.find((s) => s.playerId === player.playerId);
  const realTeam = squadPlayer?.player.realTeam ?? {
    id: '',
    name: '',
    shortName: player.name.slice(0, 3).toUpperCase(),
  };

  return {
    playerId: player.playerId,
    position: player.position,
    isStarter: player.isStarter,
    benchOrder: player.benchOrder,
    isCaptain: player.isCaptain,
    isViceCaptain: player.isViceCaptain,
    player: {
      name: player.name,
      price: squadPlayer?.player.price ?? 0,
      availabilityStatus: squadPlayer?.player.availabilityStatus,
      chanceOfPlayingNextRound: squadPlayer?.player.chanceOfPlayingNextRound,
      realTeam,
    },
    rawPoints: player.rawPoints,
    gameweekPoints: player.effectivePoints,
    counted: player.counted,
    captainMultiplier: player.captainMultiplier,
    wasSubstitutedIn: player.wasSubstitutedIn,
    wasSubstitutedOut: player.wasSubstitutedOut,
    pointsStatus: squadPlayer?.pointsStatus ?? 'confirmed',
  };
}

const CHIP_DETAILS: Record<PickTeamChip, {
  icon: string;
  title: string;
  cta: string;
  body: string[];
}> = {
  BENCH_BOOST: {
    icon: 'BB',
    title: 'Bench Boost',
    cta: 'Play Bench Boost',
    body: [
      'The points scored by your benched players in a Gameweek will be added to your total.',
      'It can be cancelled at any time before the Gameweek deadline.',
      'You lose the first Bench Boost after the Gameweek 19 deadline, Sat 2 Jan 16:30.',
      'The second Bench Boost will be available after Sat 2 Jan 16:30.',
    ],
  },
  TRIPLE_CAPTAIN: {
    icon: 'TC',
    title: 'Triple Captain',
    cta: 'Play Triple Captain',
    body: [
      'The points scored by your captain will be tripled instead of doubled in a Gameweek.',
      'It can be cancelled at any time before the Gameweek deadline.',
      'You lose the first Triple Captain after the Gameweek 19 deadline, Sat 2 Jan 16:30.',
      'The second Triple Captain will be available after Sat 2 Jan 16:30.',
    ],
  },
};

const VISUAL_CHIPS: Array<{ type: VisualChip; icon: LucideIcon; title: string }> = [
  { type: 'BENCH_BOOST', icon: CircleArrowUp, title: 'Bench Boost' },
  { type: 'TRIPLE_CAPTAIN', icon: Crown, title: 'Triple Captain' },
  { type: 'WILDCARD', icon: RefreshCw, title: 'Wildcard' },
  { type: 'FREE_HIT', icon: ShieldCheck, title: 'Free Hit' },
];

function PickTeamChipDrawer({
  chip,
  selected,
  onClose,
  onConfirm,
}: {
  chip: PickTeamChip | null;
  selected: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!chip) return null;
  const details = CHIP_DETAILS[chip];

  return (
    <div className="pick-chip-drawer-layer" role="presentation">
      <button type="button" className="pick-chip-drawer-backdrop" aria-label="Close chip details" onClick={onClose} />
      <aside className="pick-chip-drawer" role="dialog" aria-modal="true" aria-labelledby="pick-chip-drawer-title">
        <button type="button" className="pick-chip-drawer-close" aria-label="Close chip details" onClick={onClose}>
          x
        </button>
        <div className="pick-chip-drawer-icon" aria-hidden="true">{details.icon}</div>
        <h2 id="pick-chip-drawer-title">{details.title}</h2>
        <div className="pick-chip-drawer-copy">
          {details.body.map((line) => <p key={line}>{line}</p>)}
        </div>
        <button type="button" className="pick-chip-drawer-cta" onClick={onConfirm}>
          {selected ? 'Remove Selection' : details.cta}
        </button>
      </aside>
    </div>
  );
}

function buildDisplayValues(
  squad: SquadEntry[],
  players: PlayerListItem[],
  fixtureMap: ReturnType<typeof buildFixtureMap>,
  metric: SavedMetric,
): Map<string, string> {
  const values = new Map<string, string>();
  for (const entry of squad) {
    const player = players.find((candidate) => candidate.id === entry.playerId);
    const fixture = player ? getFixtureDisplay(player, fixtureMap) : null;
    const value =
      metric === 'points'
          ? entry.gameweekPoints == null
            ? '-'
            : `${entry.gameweekPoints} pts`
          : metric === 'fdr'
            ? fixture?.fdr ?? '-'
          : metric === 'status'
            ? entry.pointsStatus === 'confirmed'
              ? 'Available'
              : entry.pointsStatus
            : fixture?.opponent ?? '-';
    values.set(entry.playerId, value);
  }
  return values;
}

function SavedTeamList({
  squad,
  players,
  editMode,
  selectedPlayerId,
  validSwitchTargetIds,
  onPlayerActivate,
  onPlayerClick,
}: {
  squad: SquadEntry[];
  players: PlayerListItem[];
  editMode: boolean;
  selectedPlayerId?: string | null;
  validSwitchTargetIds?: Set<string>;
  onPlayerActivate?: (playerId: string) => void;
  onPlayerClick?: (playerId: string) => void;
}) {
  const groups = [
    ['Goalkeepers', squad.filter((entry) => entry.position === 'GK')],
    ['Defenders', squad.filter((entry) => entry.position === 'DEF')],
    ['Midfielders', squad.filter((entry) => entry.position === 'MID')],
    ['Forwards', squad.filter((entry) => entry.position === 'FWD')],
  ] as const;

  return (
    <div className="fpl-saved-list">
      <div className="fpl-saved-list-header">
        <span>Player</span>
        <span>Form</span>
        <span>Current Price</span>
        <span>Selected</span>
      </div>
      {groups.map(([label, entries]) => (
        <section key={label}>
          <h3>{label}</h3>
          {entries.map((entry) => {
            const isSelected = selectedPlayerId === entry.playerId;
            const switchActive = Boolean(selectedPlayerId);
            const isValidTarget =
              !switchActive || isSelected || Boolean(validSwitchTargetIds?.has(entry.playerId));
            const player = players.find((candidate) => candidate.id === entry.playerId);

            return (
              <button
                key={entry.playerId}
                type="button"
                className={`fpl-saved-list-row${isSelected ? ' is-switch-selected' : ''}${switchActive && !isValidTarget ? ' is-switch-invalid' : ''}`}
                disabled={editMode && switchActive && !isValidTarget}
                onClick={() =>
                  editMode
                    ? isValidTarget
                      ? onPlayerActivate?.(entry.playerId)
                      : undefined
                    : onPlayerClick?.(entry.playerId)
                }
                aria-pressed={editMode ? isSelected : undefined}
                aria-label={
                  editMode
                    ? isSelected
                      ? `Cancel switch for ${entry.player.name}`
                      : switchActive
                        ? isValidTarget
                          ? `Switch with ${entry.player.name}`
                          : `${entry.player.name} is not a valid switch`
                        : `Switch ${entry.player.name}`
                    : `View ${entry.player.name}`
                }
              >
                <span className="fpl-list-info" aria-hidden="true">i</span>
                <span className="fpl-list-shirt" aria-hidden="true"><ShirtVisual shortName={entry.player.realTeam.shortName} position={entry.position} clubId={entry.player.realTeam.id} /></span>
                <span className="fpl-list-player">
                  <strong>{entry.player.name}</strong>
                  <small>{entry.player.realTeam.name} {entry.position}</small>
                </span>
                <span>{(player?.eventPoints ?? 0).toFixed(1)}</span>
                <span>{formatPrice(entry.player.price)}</span>
                <span>{(player?.selectedByPercent ?? 0).toFixed(1)}%</span>
              </button>
            );
          })}
        </section>
      ))}
    </div>
  );
}

export function SavedTeamView({
  team,
  canEdit,
  onUpdated,
  gameweekDetail,
  isHistoricalView = false,
  selectedGameweek,
  transferWindowError,
  onRetryTransferWindow,
}: SavedTeamViewProps) {
  const baseSquad = useMemo(() => {
    if (isHistoricalView && gameweekDetail) {
      return gameweekDetail.players.map((p) => gameweekPlayerToSquadEntry(p, team));
    }
    return team.squad;
  }, [isHistoricalView, gameweekDetail, team]);

  const fallbackPlayers = useMemo(() => squadToPlayerList(baseSquad), [baseSquad]);
  const playerIds = useMemo(() => baseSquad.map((entry) => entry.playerId).join(','), [baseSquad]);
  const playerStatsQuery = usePlayers({ ids: playerIds, limit: 100 }, { enabled: playerIds.length > 0 });
  const players = useMemo(() => {
    const detailedById = new Map((playerStatsQuery.data?.data ?? []).map((player) => [player.id, player]));
    return fallbackPlayers.map((fallback) => detailedById.get(fallback.id) ?? fallback);
  }, [fallbackPlayers, playerStatsQuery.data?.data]);
  const savedLineup = useMemo(() => lineupFromSquadEntries(baseSquad), [baseSquad]);
  const initialFormation = useMemo(() => detectFormation(baseSquad), [baseSquad]);

  const [formation, setFormation] = useState<Formation>(initialFormation);
  const [draftLineup, setDraftLineup] = useState<LineupSlot[]>(() => savedLineup);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [actionHint, setActionHint] = useState<string | null>(null);
  const [swapSelectedId, setSwapSelectedId] = useState<string | null>(null);
  const [pointsPlayerId, setPointsPlayerId] = useState<string | null>(null);
  const [actionPlayerId, setActionPlayerId] = useState<string | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [viewMode, setViewMode] = useState<TeamViewMode>('pitch');
  const [metric] = useState<SavedMetric>('opponent');
  const [helpOpen, setHelpOpen] = useState(false);
  const [pendingChip, setPendingChip] = useState<PickTeamChip | null>(null);
  const [chipDrawer, setChipDrawer] = useState<PickTeamChip | null>(null);
  const [cancelChipConfirm, setCancelChipConfirm] = useState<PickTeamChip | null>(null);

  const setLineupMutation = useSetLineup(team.id);
  const cancelChipMutation = useCancelChip(team.id);
  const { data: chipStatus } = useChipStatus(team.id);
  const fixturesQuery = useFixtures({ gameweek: selectedGameweek?.number, limit: 50 });
  const editable = canEdit && !isHistoricalView;

  useEffect(() => {
    setDraftLineup(savedLineup);
    setFormation(detectFormation(baseSquad));
    setSwapSelectedId(null);
    setActionPlayerId(null);
    setActionHint(null);
  }, [team.id, team.squad, savedLineup, baseSquad]);

  useEffect(() => {
    setSwapSelectedId(null);
    setActionPlayerId(null);
    setActionHint(null);
  }, [selectedGameweek?.id, selectedGameweek?.number, viewMode]);

  useEffect(() => {
    if (!swapSelectedId) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setSwapSelectedId(null);
      setActionHint('Player switch cancelled');
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [swapSelectedId]);

  useEffect(() => {
    if (!actionHint) return;
    const timer = window.setTimeout(() => setActionHint(null), 2500);
    return () => window.clearTimeout(timer);
  }, [actionHint]);

  const pickErrors = useMemo(() => (editable ? getPickTeamErrors(draftLineup, players) : []), [editable, draftLineup, players]);
  const dirty = useMemo(() => isLineupDirty(draftLineup, savedLineup), [draftLineup, savedLineup]);
  const canConfirm = editable && pickErrors.length === 0 && (dirty || pendingChip !== null);
  const hasPendingEdits = dirty || pendingChip !== null || Boolean(swapSelectedId);

  const performSwitch = (playerId: string) => {
    if (!editable) return;
    setSaveError(null);
    setSaveMessage(null);
    if (swapSelectedId === playerId) {
      setSwapSelectedId(null);
      setActionHint('Player switch cancelled');
      return;
    }
    if (!swapSelectedId) return;
    const result = swapLineupSlots(draftLineup, swapSelectedId, playerId, players, formation);
    setSwapSelectedId(null);
    if (!result.ok) {
      setActionHint(result.reason);
      return;
    }
    setDraftLineup(result.lineup);
    setFormation(detectFormationFromLineup(result.lineup, players));
    const previousCaptain = draftLineup.find((slot) => slot.isCaptain)?.playerId;
    const previousVice = draftLineup.find((slot) => slot.isViceCaptain)?.playerId;
    const captainChanged = previousCaptain !== result.lineup.find((slot) => slot.isCaptain)?.playerId;
    const viceChanged = previousVice !== result.lineup.find((slot) => slot.isViceCaptain)?.playerId;
    setActionHint(
      captainChanged || viceChanged
        ? 'Players switched and captaincy repaired to keep both armbands in the starting XI.'
        : 'Players switched.',
    );
  };

  const handlePlayerActivate = (playerId: string) => {
    if (!editable) return;
    if (swapSelectedId) {
      performSwitch(playerId);
      return;
    }
    setActionPlayerId(playerId);
  };

  const beginSwitch = (playerId: string) => {
    setActionPlayerId(null);
    setSwapSelectedId(playerId);
    setActionHint('Choose a highlighted player to complete the switch, or press Escape to cancel.');
  };

  const handleMakeCaptain = (playerId: string) => {
    const result = setCaptainInPlace(draftLineup, playerId);
    if (!result.ok) {
      setActionHint(result.reason);
      return;
    }
    setDraftLineup(result.lineup);
    setActionPlayerId(null);
    setActionHint('Captain updated');
  };

  const handleMakeVice = (playerId: string) => {
    const result = setViceCaptainInPlace(draftLineup, playerId);
    if (!result.ok) {
      setActionHint(result.reason);
      return;
    }
    setDraftLineup(result.lineup);
    setActionPlayerId(null);
    setActionHint('Vice-captain updated');
  };

  const handleBenchReorder = (playerId: string, direction: 'up' | 'down') => {
    const result = reorderBench(draftLineup, players, playerId, direction);
    if (!result.ok) {
      setActionHint(result.reason);
      return;
    }
    setDraftLineup(result.lineup);
  };

  const handleCancelEdits = () => {
    setDraftLineup(savedLineup);
    setFormation(initialFormation);
    setSwapSelectedId(null);
    setActionPlayerId(null);
    setActionHint('Changes cancelled');
    setSaveMessage(null);
    setSaveError(null);
    setPendingChip(null);
  };

  const handleResetRequest = () => setResetConfirmOpen(true);
  const handleResetConfirm = () => {
    handleCancelEdits();
    setResetConfirmOpen(false);
  };

  const handleConfirm = async () => {
    setSaveMessage(null);
    setSaveError(null);
    const errors = getPickTeamErrors(draftLineup, players);
    if (errors.length > 0) {
      setSaveError(errors[0] ?? 'Lineup is invalid');
      return;
    }
    try {
      const captainId = draftLineup.find((s) => s.isCaptain)?.playerId;
      const viceCaptainId = draftLineup.find((s) => s.isViceCaptain)?.playerId;
      await setLineupMutation.mutateAsync({
        lineup: draftLineup.map((slot) => ({
          playerId: slot.playerId,
          isStarter: slot.isStarter,
          benchOrder: slot.benchOrder,
        })),
        ...(captainId && viceCaptainId ? { captainId, viceCaptainId } : {}),
        ...(pendingChip ? { chipSelection: pendingChip } : {}),
      });
      setSaveMessage('Team saved.');
      setSwapSelectedId(null);
      setActionPlayerId(null);
      setPendingChip(null);
      onUpdated();
    } catch (error) {
      setSaveError(getErrorMessage(error, 'Failed to save team'));
    }
  };

  const displaySquad: SquadEntry[] = baseSquad.map((entry) => {
    const draft = draftLineup.find((s) => s.playerId === entry.playerId);
    if (!draft || !editable) return entry;
    return {
      ...entry,
      isStarter: draft.isStarter,
      benchOrder: draft.benchOrder,
      isCaptain: draft.isCaptain,
      isViceCaptain: draft.isViceCaptain,
    };
  });

  const validSwitchTargetIds = useMemo(() => {
    const validIds = new Set<string>();
    if (!swapSelectedId) return validIds;
    for (const entry of displaySquad) {
      if (entry.playerId === swapSelectedId) continue;
      const preview = swapLineupSlots(
        draftLineup,
        swapSelectedId,
        entry.playerId,
        players,
        formation,
      );
      if (preview.ok) validIds.add(entry.playerId);
    }
    return validIds;
  }, [displaySquad, draftLineup, formation, players, swapSelectedId]);

  const selectedPointsPlayer = useMemo(() => {
    if (!pointsPlayerId) return null;
    return gameweekDetail?.players.find((p) => p.playerId === pointsPlayerId) ??
      displaySquad.find((s) => s.playerId === pointsPlayerId) ??
      null;
  }, [pointsPlayerId, gameweekDetail, displaySquad]);

  const actionPlayer = useMemo(
    () => displaySquad.find((entry) => entry.playerId === actionPlayerId) ?? null,
    [actionPlayerId, displaySquad],
  );
  const activePickChip = chipStatus?.activeThisGameweek === 'BENCH_BOOST' || chipStatus?.activeThisGameweek === 'TRIPLE_CAPTAIN'
    ? chipStatus.activeThisGameweek
    : null;

  const handleCancelChip = async () => {
    if (!cancelChipConfirm) return;
    try {
      await cancelChipMutation.mutateAsync(cancelChipConfirm === 'BENCH_BOOST' ? 'bench-boost' : 'triple-captain');
      setCancelChipConfirm(null);
      setActionHint('Chip cancelled.');
      onUpdated();
    } catch (caught) {
      setCancelChipConfirm(null);
      setSaveError(getErrorMessage(caught, 'Failed to cancel chip'));
    }
  };

  const isSaving = setLineupMutation.isPending;
  const fixtureMap = useMemo(
    () => buildFixtureMap(fixturesQuery.data?.data ?? []),
    [fixturesQuery.data?.data],
  );
  const displayValues = useMemo(
    () => buildDisplayValues(displaySquad, players, fixtureMap, metric),
    [displaySquad, fixtureMap, metric, players],
  );
  return (
    <div className="fpl-pick-shell pick-team-reference">
      <main className="fpl-pick-workspace" aria-labelledby="pick-team-title">
        <WorkflowHeader
          className="fpl-pick-header"
          title="Pick Team"
          titleId="pick-team-title"
          leading={hasPendingEdits ? (
            <button type="button" className="pick-team-edit-cancel" onClick={handleCancelEdits} aria-label="Cancel team changes">× <span>Cancel</span></button>
          ) : (
            <Link to="/home" className="pick-team-header-action" aria-label="Back to Home"><ArrowLeft /></Link>
          )}
          trailing={hasPendingEdits ? (
            <button type="button" className="pick-team-edit-confirm" onClick={() => void handleConfirm()} disabled={!canConfirm || isSaving} aria-label="Confirm team changes">✓ <span>Confirm</span></button>
          ) : (
            <button type="button" className="pick-team-header-action pick-team-help" aria-label="Open Pick Team help" onClick={() => setHelpOpen(true)}><CircleHelp /></button>
          )}
        />

        <WorkflowDeadlineLine gameweek={selectedGameweek} fallbackNumber={team.gameweek?.number} />
        {transferWindowError ? (
          <div className="fpl-inline-error" role="alert">
            <span>Could not confirm the next editable deadline.</span>
            <button type="button" onClick={onRetryTransferWindow}>Retry</button>
          </div>
        ) : null}
        {editable ? (
          <section className="pick-team-chip-row" aria-labelledby="pick-team-chips-title">
            <h2 id="pick-team-chips-title" className="sr-only">Chips</h2>
            {VISUAL_CHIPS.map(({ type: chip, icon: Icon, title }) => {
              const active = activePickChip === chip;
              const selected = pendingChip === chip;
              const available = chip === 'BENCH_BOOST' || chip === 'TRIPLE_CAPTAIN'
                ? (chipStatus?.availability[chip] ?? false)
                : false;
              const interactive = chip === 'BENCH_BOOST' || chip === 'TRIPLE_CAPTAIN';
              const state: WorkflowChipState = active
                ? 'active'
                : selected
                  ? 'selected'
                  : available
                    ? 'available'
                    : 'unavailable';
              return (
                <WorkflowChipCard
                  key={chip}
                  icon={Icon}
                  title={title}
                  state={state}
                  disabledReason={!interactive ? 'Available from Transfers' : Boolean(activePickChip) && !active ? 'Another chip is active' : undefined}
                  onClick={interactive && (active || (available && !activePickChip))
                    ? () => (active ? setCancelChipConfirm(chip) : setChipDrawer(chip))
                    : undefined}
                />
              );
            })}
          </section>
        ) : null}

        <div className="fpl-pick-toolbar">
          <WorkflowSegmentedControl
            value={viewMode}
            label="Team display"
            options={[{ value: 'pitch', label: 'Pitch' }, { value: 'list', label: 'List' }]}
            onChange={setViewMode}
          />
        </div>
        {actionHint ? <p className="pick-team-status" role="status">{actionHint}</p> : null}

        {viewMode === 'pitch' ? (
          <PitchView
            mode="saved"
            badgeMode="status"
            squad={displaySquad}
            pointsStatus={team.squad[0]?.pointsStatus}
            editMode={editable}
            selectedPlayerId={swapSelectedId}
            validSwitchTargetIds={validSwitchTargetIds}
            onPlayerActivate={editable ? handlePlayerActivate : undefined}
            onMakeCaptain={editable ? handleMakeCaptain : undefined}
            onMakeVice={editable ? handleMakeVice : undefined}
            onBenchReorder={editable ? handleBenchReorder : undefined}
            onPlayerClick={!editable ? (playerId) => setPointsPlayerId(playerId) : undefined}
            cardLayout="shirt"
            builderMode
            usePlayerActionMenu
            playerDisplayValues={displayValues}
            className="fpl-pick-pitch"
          />
        ) : (
          <SavedTeamList
            squad={displaySquad}
            players={players}
            editMode={editable}
            selectedPlayerId={swapSelectedId}
            validSwitchTargetIds={validSwitchTargetIds}
            onPlayerActivate={handlePlayerActivate}
            onPlayerClick={(playerId) => setPointsPlayerId(playerId)}
          />
        )}

        {editable ? (
          <div className="fpl-pick-action-bar">
            {pickErrors.length > 0 ? (
              <ul className="w-full list-inside list-disc text-sm text-fpl-pink">
                {pickErrors.map((error) => <li key={error}>{error}</li>)}
              </ul>
            ) : null}
            <Button type="button" variant="secondary" onClick={handleResetRequest} disabled={isSaving}>Reset</Button>
            <Button type="button" onClick={() => void handleConfirm()} isLoading={isSaving} disabled={!canConfirm || isSaving} fullWidth>
              Save My Team
            </Button>
            {!dirty && !pendingChip && pickErrors.length === 0 ? <p className="w-full text-xs text-white/50">No unsaved changes.</p> : null}
          </div>
        ) : (
          <p className="text-sm text-white/50">
            {isHistoricalView ? 'Viewing a historical gameweek - lineup is read-only.' : 'Lineup is locked for this gameweek (deadline passed or gameweek in progress).'}
          </p>
        )}

        {saveMessage ? <p className="text-sm text-fpl-green">{saveMessage}</p> : null}
        {saveError ? <p className="text-sm text-fpl-pink">{saveError}</p> : null}

      </main>

      <PlayerPointsModal open={pointsPlayerId !== null} onClose={() => setPointsPlayerId(null)} player={selectedPointsPlayer} pointsStatus={team.squad[0]?.pointsStatus} />

      <PlayerDetailModal
        playerId={actionPlayer?.playerId ?? null}
        onClose={() => setActionPlayerId(null)}
        teamActions={actionPlayer ? {
          canEdit: editable,
          isStarter: actionPlayer.isStarter,
          isCaptain: actionPlayer.isCaptain,
          isViceCaptain: actionPlayer.isViceCaptain,
          onCaptain: () => handleMakeCaptain(actionPlayer.playerId),
          onViceCaptain: () => handleMakeVice(actionPlayer.playerId),
          onSubstitute: () => beginSwitch(actionPlayer.playerId),
        } : undefined}
      />

      <Modal open={resetConfirmOpen} onClose={() => setResetConfirmOpen(false)} title="Reset lineup?">
        <p className="mb-4 text-sm text-white/70">Discard unsaved changes and restore your last confirmed arrangement?</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setResetConfirmOpen(false)} className="rounded-full border border-white/40 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10">Cancel</button>
          <button type="button" onClick={handleResetConfirm} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-[#37003c] transition hover:bg-fpl-gray-50">Reset</button>
        </div>
      </Modal>

      <Modal open={Boolean(cancelChipConfirm)} onClose={() => setCancelChipConfirm(null)} title="Cancel chip?">
        <p className="mb-4 text-sm text-white/70">This chip will become available again for a future gameweek.</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setCancelChipConfirm(null)} className="rounded-full border border-white/40 px-4 py-2 text-sm font-bold text-white">Keep chip</button>
          <button type="button" disabled={cancelChipMutation.isPending} onClick={() => void handleCancelChip()} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-[#37003c]">Cancel chip</button>
        </div>
      </Modal>

      <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title="Pick Team rules">
        <div className="space-y-3 text-sm text-white/75">
          <p>Select a valid formation, arrange your bench, and choose one captain plus one vice-captain before the deadline.</p>
          <p>Tap a player, then tap another player to swap them. Captain controls appear on selected starters.</p>
          <p>Bench order matters if automatic substitutions are applied after the gameweek.</p>
        </div>
      </Modal>

      <PickTeamChipDrawer
        chip={chipDrawer}
        selected={chipDrawer !== null && pendingChip === chipDrawer}
        onClose={() => setChipDrawer(null)}
        onConfirm={() => {
          if (!chipDrawer) return;
          const wasSelected = pendingChip === chipDrawer;
          setPendingChip(wasSelected ? null : chipDrawer);
          setChipDrawer(null);
          setActionHint(wasSelected ? 'Chip selection removed.' : `${CHIP_DETAILS[chipDrawer].title} selected. Save your team to confirm it.`);
        }}
      />
    </div>
  );
}


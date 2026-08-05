import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw, RotateCcw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { TeamLogo } from '@/components/common/TeamLogo';
import { PitchView } from '@/components/pitch/PitchView';
import { ShirtVisual } from '@/components/pitch/PlayerCard';
import { PlayerDetailModal } from '@/components/team/PlayerDetailModal';
import {
  WorkflowChipCard,
  WorkflowDeadlineLine,
  WorkflowHeader,
  WorkflowSegmentedControl,
  WorkflowStickyActions,
} from '@/components/team/TeamWorkflowUi';
import { formatWorkflowDeadline } from '@/components/team/teamWorkflowFormatting';
import { PlayerListPanel } from '@/components/transfers/PlayerListPanel';
import { PointsHitWarning } from '@/components/transfers/PointsHitWarning';
import { useChipStatus } from '@/hooks/useChipStatus';
import { useFixtures } from '@/hooks/useFixtures';
import { useSubmitTransfers } from '@/hooks/useSubmitTransfers';
import { canTransferOut } from '@/lib/fplRules';
import { formatPrice } from '@/lib/formatters';
import { buildFixtureMap, getFixtureDisplay } from '@/lib/squadFixtureDisplay';
import { validateTransferDraft } from '@/lib/transferDraftValidator';
import { useTransferStore } from '@/store/transferStore';
import { getErrorMessage } from '@/types/api';
import type { ChipStatus } from '@/types/chip';
import type { Gameweek } from '@/types/gameweek';
import type { PlayerListItem, Position } from '@/types/player';
import { DEFAULT_PLAYER_STATS } from '@/types/player';
import type { SquadEntry, TeamDetail } from '@/types/team';
import type { PendingTransfer, TransferChipSelection } from '@/types/transfer';
import { useTelegram, useTelegramMainButton } from '@/lib/telegram';

interface TransfersViewProps {
  team: TeamDetail;
  selectedGameweek?: Gameweek | null;
  onUpdated: () => void;
}

type TransferViewMode = 'pitch' | 'list';
type TransferMetric = 'opponent' | 'price' | 'fdr' | 'status';

const POSITION_GROUPS: Array<{ title: string; position: Position }> = [
  { title: 'Goalkeepers', position: 'GK' },
  { title: 'Defenders', position: 'DEF' },
  { title: 'Midfielders', position: 'MID' },
  { title: 'Forwards', position: 'FWD' },
];

function squadToPlayerList(squad: SquadEntry[]): PlayerListItem[] {
  return squad.map((entry) => ({
    id: entry.playerId,
    name: entry.player.name,
    position: entry.position,
    price: entry.player.price,
    isAvailable: true,
    realTeam: entry.player.realTeam,
    ...DEFAULT_PLAYER_STATS,
  }));
}

function squadEntryToPlayer(entry: SquadEntry): PlayerListItem {
  return squadToPlayerList([entry])[0]!;
}

function applyPendingToSquadDisplay(squad: SquadEntry[], pending: PendingTransfer[]): SquadEntry[] {
  const pendingMap = new Map(pending.map((transfer) => [transfer.playerOutId, transfer.playerIn]));
  return squad.map((entry) => {
    const replacement = pendingMap.get(entry.playerId);
    if (!replacement) return entry;
    return {
      ...entry,
      playerId: replacement.id,
      position: replacement.position,
      player: {
        name: replacement.name,
        price: replacement.price,
        availabilityStatus: replacement.availabilityStatus,
        chanceOfPlayingNextRound: replacement.chanceOfPlayingNextRound,
        realTeam: replacement.realTeam,
      },
    };
  });
}

function TransferWorkflowHeader({
  title,
  selectedGameweek,
  onBack,
  onReset,
}: {
  title: string;
  selectedGameweek?: Gameweek | null;
  onBack: () => void;
  onReset?: () => void;
}) {
  return (
    <>
      <WorkflowHeader
        className="transfer-workflow-header"
        title={title}
        leading={<button type="button" className="pick-team-header-action" aria-label="Back" onClick={onBack}>
          <ArrowLeft aria-hidden="true" />
        </button>}
        trailing={onReset ? (
          <button type="button" className="transfer-reset-button" onClick={onReset}>
            <RotateCcw aria-hidden="true" />
            <span>Reset</span>
          </button>
        ) : (
          <TeamLogo decorative eager />
        )}
      />
      <WorkflowDeadlineLine gameweek={selectedGameweek} />
    </>
  );
}

function TransferListView({
  squad,
  displayValues,
  onPlayerClick,
}: {
  squad: SquadEntry[];
  displayValues: Map<string, string>;
  onPlayerClick: (playerId: string) => void;
}) {
  return (
    <div className="fpl-saved-list transfer-reference-list">
      <div className="fpl-saved-list-header">
        <span>Player</span>
        <span>Form</span>
        <span>Current Price</span>
        <span>Selling Price</span>
      </div>
      {POSITION_GROUPS.map(({ title, position }) => (
        <section key={position}>
          <h3>{title}</h3>
          {squad.filter((entry) => entry.position === position).map((entry) => (
            <button
              key={entry.playerId}
              type="button"
              className="fpl-saved-list-row"
              onClick={() => onPlayerClick(entry.playerId)}
            >
              <span className="fpl-list-info" aria-hidden="true">i</span>
              <span className="fpl-list-shirt" aria-hidden="true"><ShirtVisual shortName={entry.player.realTeam.shortName} position={entry.position} clubId={entry.player.realTeam.id} /></span>
              <span className="fpl-list-player">
                <strong>{entry.player.name}</strong>
                <small>{entry.player.realTeam.name} {entry.position}</small>
              </span>
              <span>{displayValues.get(entry.playerId) ?? '0.0'}</span>
              <span>{formatPrice(entry.player.price)}</span>
              <span>{formatPrice(entry.player.price)}</span>
            </button>
          ))}
        </section>
      ))}
    </div>
  );
}

function TransferReviewScreen({
  team,
  transfers,
  validation,
  selectedGameweek,
  chipStatus,
  selectedChip,
  onChipChange,
  onEdit,
  onConfirm,
  isLoading,
}: {
  team: TeamDetail;
  transfers: PendingTransfer[];
  validation: ReturnType<typeof validateTransferDraft>;
  selectedGameweek?: Gameweek | null;
  chipStatus?: ChipStatus;
  selectedChip: TransferChipSelection | null;
  onChipChange: (chip: TransferChipSelection | null) => void;
  onEdit: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}) {
  const allowTransferChips = Boolean(selectedGameweek && selectedGameweek.number > 1);
  const freeUsed = validation.isUnlimitedTransfers ? 'Unlimited' : validation.freeTransfersUsed;
  const additionalUsed = validation.isUnlimitedTransfers ? 'Unlimited' : validation.additionalTransfersUsed;
  const deadline = formatWorkflowDeadline(selectedGameweek, team.gameweek?.number);

  return (
    <div className="transfer-review-screen">
      <section className="transfer-review-card">
        <div className="transfer-bank-banner">
          You are about to transfer {transfers.length} player{transfers.length === 1 ? '' : 's'}!
        </div>
        <div className="transfer-review-heading">
          <h2>Transfer Out</h2>
          <span aria-hidden="true">⇄</span>
          <h2>Transfer In</h2>
        </div>
        <div className="transfer-review-grid">
          {transfers.map((transfer) => (
            <article key={transfer.playerOutId} className="transfer-review-pair">
              <div>
                <ShirtVisual shortName={transfer.playerOut.realTeam.shortName} position={transfer.playerOut.position} clubId={transfer.playerOut.realTeam.id} />
                <span><strong>{transfer.playerOut.name}</strong><small>{transfer.playerOut.realTeam.name}</small></span>
                <b aria-hidden="true">→</b>
              </div>
              <div>
                <ShirtVisual shortName={transfer.playerIn.realTeam.shortName} position={transfer.playerIn.position} clubId={transfer.playerIn.realTeam.id} />
                <span><strong>{transfer.playerIn.name}</strong><small>{transfer.playerIn.realTeam.name}</small></span>
                <b aria-hidden="true">←</b>
              </div>
            </article>
          ))}
        </div>
        <p>
          Transfers will be active for Gameweek {selectedGameweek?.number ?? team.gameweek?.number ?? '-'} if made before the deadline ({deadline.deadlineValue}).
        </p>
      </section>

      {allowTransferChips ? (
        <fieldset className="transfer-chip-choices transfer-chip-choices--review">
          <legend>Transfer chip</legend>
          <button type="button" className={!selectedChip ? 'is-active' : undefined} onClick={() => onChipChange(null)}>
            No chip
          </button>
          <button
            type="button"
            disabled={!chipStatus?.availability.FREE_HIT}
            className={selectedChip?.type === 'FREE_HIT' ? 'is-active' : undefined}
            onClick={() => onChipChange({ type: 'FREE_HIT' })}
          >
            Free Hit <small>Unlimited for one week</small>
          </button>
          {([1, 2] as const).map((number) => (
            <button
              key={number}
              type="button"
              disabled={!chipStatus?.availability.WILDCARD[String(number) as '1' | '2']}
              className={selectedChip?.type === 'WILDCARD' && selectedChip.wildcardNumber === number ? 'is-active' : undefined}
              onClick={() => onChipChange({ type: 'WILDCARD', wildcardNumber: number })}
            >
              Wildcard {number} <small>Unlimited permanent transfers</small>
            </button>
          ))}
        </fieldset>
      ) : null}

      <section className="transfer-points-overview">
        <h2>Points Overview</h2>
        <dl>
          <div><dt>Free transfers used</dt><dd>{freeUsed}</dd></div>
          <div><dt>Additional transfers used</dt><dd>{additionalUsed}</dd></div>
          <div><dt>Points cost</dt><dd>{validation.pointHit} pts</dd></div>
          <div><dt>Left in the bank</dt><dd>{formatPrice(validation.projectedBank)}</dd></div>
          <div><dt>Selected chip</dt><dd>{selectedChip?.type === 'FREE_HIT' ? 'Free Hit' : selectedChip?.type === 'WILDCARD' ? `Wildcard ${selectedChip.wildcardNumber}` : 'None'}</dd></div>
        </dl>
      </section>

      {validation.issues.length > 0 ? (
        <div className="transfer-error-stack" role="alert">
          {validation.issues.map((issue) => <p key={`${issue.code}-${issue.playerId ?? issue.message}`}>{issue.message}</p>)}
        </div>
      ) : null}

      <WorkflowStickyActions className="transfer-sticky-actions--review">
        <Button variant="secondary" onClick={onEdit} disabled={isLoading}>Edit Transfer</Button>
        <Button onClick={onConfirm} isLoading={isLoading} disabled={!validation.canSubmit || isLoading}>Confirm</Button>
      </WorkflowStickyActions>
    </div>
  );
}

export function TransfersView({ team, selectedGameweek, onUpdated }: TransfersViewProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { playerOutId } = useParams();
  const [detailPlayerId, setDetailPlayerId] = useState<string | null>(null);
  const [detailOriginId, setDetailOriginId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<TransferViewMode>('pitch');
  const [metric] = useState<TransferMetric>('opponent');
  const hasSubmittedRef = useRef(false);
  const { isTelegram } = useTelegram();

  const pendingTransfers = useTransferStore((state) => state.pendingTransfers);
  const activeRemovedPlayerId = useTransferStore((state) => state.activeRemovedPlayerId);
  const selectedChip = useTransferStore((state) => state.selectedChip);
  const openRemoval = useTransferStore((state) => state.openRemoval);
  const setSelectedChip = useTransferStore((state) => state.setSelectedChip);
  const addTransfer = useTransferStore((state) => state.addTransfer);
  const removeTransfer = useTransferStore((state) => state.removeTransfer);
  const clearAll = useTransferStore((state) => state.clearAll);

  const submitMutation = useSubmitTransfers(team.id);
  const { data: chipStatus } = useChipStatus(team.id);
  const fixturesQuery = useFixtures({ gameweek: selectedGameweek?.number, limit: 50 });

  const isReplaceRoute = location.pathname.startsWith('/transfers/replace/');
  const isReviewRoute = location.pathname === '/transfers/review';
  const activeOutId = isReplaceRoute ? (playerOutId ?? activeRemovedPlayerId) : activeRemovedPlayerId;

  useEffect(() => {
    if (!isReplaceRoute || !playerOutId) return;
    const entry = team.squad.find((item) => item.playerId === playerOutId);
    if (!entry) {
      navigate('/transfers', { replace: true });
      return;
    }
    const check = canTransferOut(entry);
    if (!check.ok) {
      setError(check.reason ?? 'Cannot transfer this player');
      navigate('/transfers', { replace: true });
      return;
    }
    const hasJustCompletedReplacement = pendingTransfers.some(
      (transfer) => transfer.playerOutId === playerOutId,
    );
    if (activeRemovedPlayerId !== playerOutId && !hasJustCompletedReplacement) {
      removeTransfer(playerOutId);
      openRemoval(playerOutId);
    }
  }, [
    activeRemovedPlayerId,
    isReplaceRoute,
    navigate,
    openRemoval,
    pendingTransfers,
    playerOutId,
    removeTransfer,
    team.squad,
  ]);

  useEffect(() => {
    if (
      isReviewRoute &&
      pendingTransfers.length === 0 &&
      !submitMutation.isPending &&
      !hasSubmittedRef.current
    ) {
      navigate('/transfers', { replace: true });
    }
  }, [isReviewRoute, navigate, pendingTransfers.length, submitMutation.isPending]);

  const displaySquad = useMemo(() => applyPendingToSquadDisplay(team.squad, pendingTransfers), [team.squad, pendingTransfers]);
  const squadPlayerList = useMemo(() => squadToPlayerList(displaySquad), [displaySquad]);
  const fixtureMap = useMemo(() => buildFixtureMap(fixturesQuery.data?.data ?? []), [fixturesQuery.data?.data]);
  const displayValues = useMemo(() => {
    const values = new Map<string, string>();
    for (const player of squadPlayerList) {
      const fixture = getFixtureDisplay(player, fixtureMap);
      values.set(
        player.id,
        metric === 'price'
          ? fixture.price
          : metric === 'fdr'
            ? fixture.fdr
            : metric === 'status'
              ? player.isAvailable ? 'Available' : 'Unavailable'
              : fixture.opponent,
      );
    }
    return values;
  }, [fixtureMap, metric, squadPlayerList]);

  const pendingByIncomingId = useMemo(
    () => new Map(pendingTransfers.map((transfer) => [transfer.playerInId, transfer.playerOutId])),
    [pendingTransfers],
  );
  const selectedOutEntry = team.squad.find((entry) => entry.playerId === activeOutId);
  const selectedOutPlayer = selectedOutEntry ? squadEntryToPlayer(selectedOutEntry) : null;
  const validation = useMemo(
    () => validateTransferDraft(team, pendingTransfers, {
      activeRemovedPlayerId: activeOutId && !pendingTransfers.some((transfer) => transfer.playerOutId === activeOutId)
        ? activeOutId
        : activeRemovedPlayerId,
      selectedChip,
      gameweekNumber: selectedGameweek?.number,
    }),
    [activeOutId, activeRemovedPlayerId, pendingTransfers, selectedChip, selectedGameweek?.number, team],
  );
  const isPreGameweekOne = selectedGameweek?.number === 1;

  const openPlayerDetails = (playerId: string) => {
    if (submitMutation.isPending) return;
    const originId = pendingByIncomingId.get(playerId) ?? playerId;
    setDetailPlayerId(playerId);
    setDetailOriginId(originId);
    setError(null);
  };

  const removePlayerToSlot = (originId: string) => {
    const entry = team.squad.find((item) => item.playerId === originId);
    if (!entry) return;
    const check = canTransferOut(entry);
    if (!check.ok) {
      setError(check.reason ?? 'Cannot transfer this player');
      return;
    }
    removeTransfer(originId);
    openRemoval(originId);
    setDetailPlayerId(null);
    setDetailOriginId(null);
    navigate('/transfers');
  };

  const beginReplacement = (originId: string) => {
    const entry = team.squad.find((item) => item.playerId === originId);
    if (!entry) return;
    const check = canTransferOut(entry);
    if (!check.ok) {
      setError(check.reason ?? 'Cannot transfer this player');
      return;
    }
    removeTransfer(originId);
    openRemoval(originId);
    setDetailPlayerId(null);
    setDetailOriginId(null);
    navigate(`/transfers/replace/${originId}`);
  };

  const restorePlayer = (originId: string) => {
    removeTransfer(originId);
    if (activeRemovedPlayerId === originId) openRemoval(null);
    setDetailPlayerId(null);
    setDetailOriginId(null);
    setError(null);
    navigate('/transfers');
  };

  const handleTransferIn = (playerIn: PlayerListItem) => {
    setError(null);
    if (!selectedOutEntry || !selectedOutPlayer) return;
    addTransfer(selectedOutPlayer, playerIn);
    navigate('/transfers');
  };

  const canPreviewTransferIn = (playerIn: PlayerListItem) => {
    if (!selectedOutEntry) return { ok: false, reason: 'Select a player to transfer out' };
    if (!playerIn.isAvailable) return { ok: false, reason: 'Player unavailable' };
    if (playerIn.id === selectedOutEntry.playerId) return { ok: false, reason: 'Outgoing player' };
    if (playerIn.position !== selectedOutEntry.position) {
      return { ok: false, reason: `Must transfer in a ${selectedOutEntry.position}` };
    }
    const alreadyInSquad = displaySquad.some(
      (entry) => entry.playerId === playerIn.id && entry.playerId !== selectedOutEntry.playerId,
    );
    if (alreadyInSquad) return { ok: false, reason: 'Player already in squad' };
    return { ok: true };
  };

  const handleGoReview = () => {
    setError(null);
    if (validation.canSubmit) {
      navigate('/transfers/review');
      return;
    }
    const firstIssue = validation.issues[0]?.message;
    setError(firstIssue ?? 'Complete a valid transfer before continuing.');
  };

  const handleConfirm = async () => {
    setError(null);
    const latestValidation = validateTransferDraft(team, pendingTransfers, {
      activeRemovedPlayerId,
      selectedChip,
      gameweekNumber: selectedGameweek?.number,
    });
    if (!latestValidation.canSubmit) {
      setError(latestValidation.issues[0]?.message ?? 'Transfers are not ready to submit.');
      navigate('/transfers');
      return;
    }
    try {
      const result = await submitMutation.mutateAsync({
        transfers: pendingTransfers.map((transfer) => ({
          playerInId: transfer.playerInId,
          playerOutId: transfer.playerOutId,
        })),
        ...(selectedChip ? { chip: selectedChip } : {}),
      });
      hasSubmittedRef.current = true;
      navigate('/my-team', {
        replace: true,
        state: {
          transferNotice: `${result.transferSummary.transfersMade} transfer${result.transferSummary.transfersMade === 1 ? '' : 's'} completed${result.transferSummary.pointsHit > 0 ? ` (-${result.transferSummary.pointsHit} pts)` : ''}.`,
        },
      });
      clearAll();
      onUpdated();
    } catch (caught) {
      hasSubmittedRef.current = false;
      setError(getErrorMessage(caught, 'Failed to submit transfers'));
      navigate('/transfers');
    }
  };

  const resetDraft = () => {
    clearAll();
    setError(null);
    navigate('/transfers');
  };

  useTelegramMainButton({
    text: isReviewRoute ? 'Confirm Transfers' : 'Review Transfers',
    visible: isTelegram && !isReplaceRoute && !detailPlayerId,
    enabled: isReviewRoute ? validation.canSubmit && !submitMutation.isPending : validation.canReview,
    loading: submitMutation.isPending,
    onClick: isReviewRoute ? () => void handleConfirm() : handleGoReview,
  });

  if (isReplaceRoute) {
    return (
      <main className="transfer-mobile-flow transfer-add-flow" aria-labelledby="add-player-title">
        <TransferWorkflowHeader
          title="Add Player"
          selectedGameweek={selectedGameweek}
          onBack={() => navigate('/transfers')}
        />
        {selectedOutPlayer ? (
          <PlayerListPanel
            mode="transfer"
            selectedPlayers={squadPlayerList}
            activePosition={selectedOutPlayer.position}
            availableBank={validation.replacementBudget}
            outgoingPlayer={selectedOutPlayer}
            onTransferIn={handleTransferIn}
            canTransferIn={canPreviewTransferIn}
          />
        ) : (
          <p className="fpl-inline-error" role="alert">Select a player to transfer out first.</p>
        )}
      </main>
    );
  }

  if (isReviewRoute) {
    return (
      <main className="transfer-mobile-flow" aria-labelledby="transfer-review-title">
        <TransferWorkflowHeader
          title="Transfers"
          selectedGameweek={selectedGameweek}
          onBack={() => navigate('/transfers')}
        />
        <h2 id="transfer-review-title" className="sr-only">Review transfers</h2>
        <TransferReviewScreen
          team={team}
          transfers={pendingTransfers}
          validation={validation}
          selectedGameweek={selectedGameweek}
          chipStatus={chipStatus}
          selectedChip={selectedChip}
          onChipChange={setSelectedChip}
          onEdit={() => navigate('/transfers')}
          onConfirm={() => void handleConfirm()}
          isLoading={submitMutation.isPending}
        />
      </main>
    );
  }

  return (
    <main className="transfer-mobile-flow fpl-transfer-workspace" aria-labelledby="transfers-title">
      <TransferWorkflowHeader
        title="Transfers"
        selectedGameweek={selectedGameweek}
        onBack={() => navigate('/team')}
        onReset={pendingTransfers.length > 0 || Boolean(activeRemovedPlayerId) || Boolean(selectedChip) ? resetDraft : undefined}
      />

      {validation.issues.some((issue) => issue.code === 'BUDGET_EXCEEDED') ? (
        <p className="transfer-top-alert" role="alert">Funds not available to complete your transfer</p>
      ) : null}

      <section className="transfer-kpi-strip" aria-label="Transfer summary">
        <div><strong>{validation.isUnlimitedTransfers ? 'Unlimited' : team.freeTransfers}</strong><span>Free Transfers</span></div>
        <div><strong>{validation.pointHit} pts</strong><span>Cost</span></div>
        <div className={validation.projectedBank < 0 ? 'is-negative' : 'is-bank'}>
          <strong>{formatPrice(validation.projectedBank)}</strong><span>Budget</span>
        </div>
        <WorkflowChipCard
          icon={RefreshCw}
          title="Wildcard"
          state={selectedChip?.type === 'WILDCARD'
            ? 'selected'
            : (team.activeChip ?? chipStatus?.activeThisGameweek) === 'WILDCARD'
              ? 'active'
              : chipStatus?.availability.WILDCARD['1'] || chipStatus?.availability.WILDCARD['2']
                ? 'available'
                : chipStatus?.history.some((item) => item.chipType === 'WILDCARD')
                  ? 'used'
                  : 'unavailable'}
          disabledReason={isPreGameweekOne ? 'Not needed before Gameweek 1' : undefined}
          onClick={!isPreGameweekOne && !(team.activeChip ?? chipStatus?.activeThisGameweek) && (selectedChip?.type === 'WILDCARD' || chipStatus?.availability.WILDCARD['1'] || chipStatus?.availability.WILDCARD['2'])
            ? () => selectedChip?.type === 'WILDCARD'
              ? setSelectedChip(null)
              : setSelectedChip({ type: 'WILDCARD', wildcardNumber: chipStatus?.availability.WILDCARD['1'] ? 1 : 2 })
            : undefined}
        />
        <WorkflowChipCard
          icon={ShieldCheck}
          title="Free Hit"
          state={selectedChip?.type === 'FREE_HIT'
            ? 'selected'
            : (team.activeChip ?? chipStatus?.activeThisGameweek) === 'FREE_HIT'
              ? 'active'
              : chipStatus?.availability.FREE_HIT
                ? 'available'
                : chipStatus?.history.some((item) => item.chipType === 'FREE_HIT')
                  ? 'used'
                  : 'unavailable'}
          disabledReason={isPreGameweekOne ? 'Not needed before Gameweek 1' : undefined}
          onClick={!isPreGameweekOne && !(team.activeChip ?? chipStatus?.activeThisGameweek) && (selectedChip?.type === 'FREE_HIT' || chipStatus?.availability.FREE_HIT)
            ? () => setSelectedChip(selectedChip?.type === 'FREE_HIT' ? null : { type: 'FREE_HIT' })
            : undefined}
        />
      </section>

      {error ? <p className="fpl-inline-error" role="alert">{error}{error.includes('captain') ? <Link to="/my-team">Go to My Team</Link> : null}</p> : null}
      <div className="fpl-pick-toolbar transfer-mode-toggle">
        <WorkflowSegmentedControl
          value={viewMode}
          label="Transfer display"
          options={[{ value: 'pitch', label: 'Pitch' }, { value: 'list', label: 'List' }]}
          onChange={setViewMode}
        />
      </div>

      {viewMode === 'pitch' ? (
        <PitchView
          mode="transfer"
          badgeMode="price"
          squad={displaySquad}
          selectedOutId={activeRemovedPlayerId}
          onTransferOutClick={openPlayerDetails}
          cardLayout="shirt"
          builderMode
          playerDisplayValues={displayValues}
          transferLayout="squad"
          invalidPlayerIds={validation.invalidPlayerIds}
          pendingIncomingIds={validation.pendingIncomingIds}
          className="fpl-pick-pitch fpl-transfer-pitch"
        />
      ) : (
        <TransferListView squad={displaySquad} displayValues={displayValues} onPlayerClick={openPlayerDetails} />
      )}

      <PointsHitWarning
        pendingCount={pendingTransfers.length}
        freeTransfers={team.freeTransfers}
        isUnlimitedTransfers={validation.isUnlimitedTransfers}
      />

      {validation.issues.length > 0 ? (
        <div className="transfer-error-stack" role="alert">
          {validation.issues.map((issue) => <p key={`${issue.code}-${issue.playerId ?? issue.message}`}>{issue.message}</p>)}
        </div>
      ) : null}

      <WorkflowStickyActions>
        <Button
          variant="secondary"
          onClick={() => {
            if (activeRemovedPlayerId) {
              navigate(`/transfers/replace/${activeRemovedPlayerId}`);
              return;
            }
            setError('Remove a player first, then choose Add Player.');
          }}
        >
          Add Player
        </Button>
        <Button disabled={!validation.canSubmit} onClick={handleGoReview}>Next</Button>
      </WorkflowStickyActions>

      <PlayerDetailModal
        playerId={detailPlayerId}
        workflowTitle="Transfers"
        onClose={() => { setDetailPlayerId(null); setDetailOriginId(null); }}
        actions={detailOriginId ? (
          <>
            <Button variant="secondary" onClick={() => removePlayerToSlot(detailOriginId)}>Remove</Button>
            {pendingTransfers.some((transfer) => transfer.playerOutId === detailOriginId) || activeRemovedPlayerId === detailOriginId ? (
              <Button onClick={() => restorePlayer(detailOriginId)}>Restore Player</Button>
            ) : (
              <Button onClick={() => beginReplacement(detailOriginId)}>Replace</Button>
            )}
            <Link className="transfer-full-profile-link" to={`/players/${detailPlayerId}`}>Full Profile</Link>
          </>
        ) : null}
      />

    </main>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CircleHelp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/common/Modal';
import { TeamLogo } from '@/components/common/TeamLogo';
import { CaptainSelector } from '@/components/pitch/CaptainSelector';
import { FormationSelector } from '@/components/pitch/FormationSelector';
import { PitchView } from '@/components/pitch/PitchView';
import { PlayerSelectionModal } from '@/components/pitch/PlayerSelectionModal';
import { PlayerSelectionPanel } from '@/components/pitch/PlayerSelectionPanel';
import { PlayerDetailModal } from '@/components/team/PlayerDetailModal';
import { SquadBuilderActions } from '@/components/team/SquadBuilderActions';
import { SquadBuilderFixtures } from '@/components/team/SquadBuilderFixtures';
import { SquadBuilderIdentity } from '@/components/team/SquadBuilderIdentity';
import { InlineAddBanner } from '@/components/team/InlineAddBanner';
import { SquadBuilderSummary } from '@/components/team/SquadBuilderSummary';
import { SquadSlotListView } from '@/components/team/SquadSlotListView';
import {
  SquadBuilderViewToggle,
  type SquadBuilderViewMode,
} from '@/components/team/SquadBuilderViewToggle';
import { fetchAllPlayersForAutoPick } from '@/api/players.api';
import { useFixtures } from '@/hooks/useFixtures';
import { useCreateTeam } from '@/hooks/useTeamMutations';
import { setCaptain, setLineup } from '@/api/teams.api';
import { useIsLgUp } from '@/hooks/useIsLgUp';
import { CURRENT_SEASON } from '@/lib/config';
import { fillRemainingSlots, canBuildSquadFromPool } from '@/lib/autoPickSquad';
import {
  assignLineupForFormation,
  getRemainingBudget,
  SQUAD_SIZE,
  type Formation,
} from '@/lib/fplRules';
import { useSquadStore } from '@/store/squadStore';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/store/toastStore';
import { getErrorMessage, isApiError } from '@/types/api';
import { formatPrice } from '@/lib/formatters';
import {
  buildFixtureMap,
  getMetricValue,
  type SquadDisplayMetric,
} from '@/lib/squadFixtureDisplay';
import type { CreateTeamLineupSlot, LineupSlotInput, SquadEntry, TeamDetail } from '@/types/team';
import type { Gameweek } from '@/types/gameweek';
import type { PlayerListItem, Position } from '@/types/player';
import { useTelegram, useTelegramMainButton } from '@/lib/telegram';
import { WorkflowDeadlineLine, WorkflowHeader } from '@/components/team/TeamWorkflowUi';

interface SquadBuilderViewProps {
  onTeamCreated: () => void;
  selectedGameweek?: Gameweek | null;
}

type SquadBanner = {
  playerName: string;
  action: 'added' | 'removed';
};

type StoreLineup = ReturnType<typeof useSquadStore.getState>['lineup'];
type SquadMetric = SquadDisplayMetric;

const METRIC_LABELS: Record<SquadMetric, string> = {
  opponent: 'Opponent',
  price: 'Price',
  fdr: 'FDR',
  ownership: 'Ownership',
};

function toCreateLineup(lineup: StoreLineup): CreateTeamLineupSlot[] {
  return lineup.map((slot) => ({
    playerId: slot.playerId,
    isStarter: slot.isStarter,
    benchOrder: slot.benchOrder,
    isCaptain: slot.isCaptain,
    isViceCaptain: slot.isViceCaptain,
  }));
}

function toLineupInput(lineup: StoreLineup): LineupSlotInput[] {
  return lineup.map((slot) => ({
    playerId: slot.playerId,
    isStarter: slot.isStarter,
    benchOrder: slot.benchOrder,
  }));
}

function lineupDiffers(userLineup: StoreLineup, serverSquad: SquadEntry[]): boolean {
  const serverMap = new Map(
    serverSquad.map((entry) => [
      entry.playerId,
      { isStarter: entry.isStarter, benchOrder: entry.benchOrder },
    ]),
  );

  return userLineup.some((slot) => {
    const server = serverMap.get(slot.playerId);
    if (!server) {
      return true;
    }
    return server.isStarter !== slot.isStarter || server.benchOrder !== slot.benchOrder;
  });
}

function captainDiffers(userLineup: StoreLineup, serverSquad: SquadEntry[]): boolean {
  const userCaptain = userLineup.find((s) => s.isCaptain)?.playerId;
  const userVice = userLineup.find((s) => s.isViceCaptain)?.playerId;
  const serverCaptain = serverSquad.find((s) => s.isCaptain)?.playerId;
  const serverVice = serverSquad.find((s) => s.isViceCaptain)?.playerId;
  return userCaptain !== serverCaptain || userVice !== serverVice;
}

async function applyPostCreatePatches(
  team: TeamDetail,
  userLineup: StoreLineup,
): Promise<TeamDetail> {
  const needsLineup = lineupDiffers(userLineup, team.squad);
  const needsCaptain = captainDiffers(userLineup, team.squad);

  if (!needsLineup && !needsCaptain) {
    return team;
  }

  const captainId = userLineup.find((s) => s.isCaptain)?.playerId;
  const viceCaptainId = userLineup.find((s) => s.isViceCaptain)?.playerId;

  if (needsLineup) {
    return setLineup(team.id, {
      lineup: toLineupInput(userLineup),
      ...(captainId && viceCaptainId ? { captainId, viceCaptainId } : {}),
    });
  }

  if (captainId && viceCaptainId) {
    return setCaptain(team.id, { captainId, viceCaptainId });
  }

  return team;
}

function applyAutoPickedSquad(players: PlayerListItem[], formation: Formation) {
  const lineup = assignLineupForFormation(players, formation);
  const captain = lineup.find((slot) => slot.isCaptain)?.playerId ?? null;
  const viceCaptain = lineup.find((slot) => slot.isViceCaptain)?.playerId ?? null;

  useSquadStore.setState({
    selectedPlayers: players,
    lineup,
    formation,
    captainId: captain,
    viceCaptainId: viceCaptain,
    activeSlot: null,
    activeSlotIndex: null,
  });
}

export function SquadBuilderView({ selectedGameweek, onTeamCreated }: SquadBuilderViewProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createTeamMutation = useCreateTeam();
  const toast = useToast();
  const teamNameFromUser = useAuthStore(
    (s) => s.user?.displayName?.trim() || s.user?.email?.trim() || 'Manager',
  );

  const selectedPlayers = useSquadStore((s) => s.selectedPlayers);
  const activeSlot = useSquadStore((s) => s.activeSlot);
  const activeSlotIndex = useSquadStore((s) => s.activeSlotIndex);
  const formation = useSquadStore((s) => s.formation);
  const lineup = useSquadStore((s) => s.lineup);
  const addPlayer = useSquadStore((s) => s.addPlayer);
  const removePlayer = useSquadStore((s) => s.removePlayer);
  const setActiveSlot = useSquadStore((s) => s.setActiveSlot);
  const clearActiveSlot = useSquadStore((s) => s.clearActiveSlot);
  const setFormation = useSquadStore((s) => s.setFormation);
  const cycleCaptainOnPlayer = useSquadStore((s) => s.cycleCaptainOnPlayer);
  const reset = useSquadStore((s) => s.reset);
  const getErrors = useSquadStore((s) => s.getErrors);
  const isComplete = useSquadStore((s) => s.isComplete);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<SquadBuilderViewMode>('pitch');
  const [banner, setBanner] = useState<SquadBanner | null>(null);
  const [autoPickSuccess, setAutoPickSuccess] = useState(false);
  const [metric, setMetric] = useState<SquadMetric>('opponent');
  const [isAutoPicking, setIsAutoPicking] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [detailPlayerId, setDetailPlayerId] = useState<string | null>(null);
  const isLgUp = useIsLgUp();
  const fixtureGameweek = selectedGameweek?.number;
  const fixturesQuery = useFixtures({ gameweek: fixtureGameweek, limit: 50 });
  const { isTelegram } = useTelegram();

  const errors = getErrors();
  const canSubmit = isComplete() && errors.length === 0 && Boolean(teamNameFromUser);
  const modalOpen = !isLgUp && activeSlot !== null && activeSlotIndex !== null;
  const fixtureMap = useMemo(
    () => buildFixtureMap(fixturesQuery.data?.data ?? []),
    [fixturesQuery.data?.data],
  );
  const playerDisplayValues = useMemo(
    () =>
      new Map(
        selectedPlayers.map((player) => [
          player.id,
          getMetricValue(player, fixtureMap, metric),
        ]),
      ),
    [fixtureMap, metric, selectedPlayers],
  );

  useEffect(() => {
    if (!banner) {
      return;
    }
    const timer = window.setTimeout(() => setBanner(null), 2500);
    return () => window.clearTimeout(timer);
  }, [banner]);

  const showBanner = (playerName: string, action: 'added' | 'removed') => {
    setAutoPickSuccess(false);
    setBanner({ playerName, action });
  };

  const handleSlotClick = (position: Position, index: number, playerId?: string) => {
    if (playerId) {
      const player = selectedPlayers.find((p) => p.id === playerId);
      removePlayer(playerId);
      if (player) {
        showBanner(player.name, 'removed');
      }
      return;
    }
    setActiveSlot(position, index);
  };

  const handleRemovePlayer = (playerId: string) => {
    const player = selectedPlayers.find((p) => p.id === playerId);
    removePlayer(playerId);
    if (player) {
      showBanner(player.name, 'removed');
    }
  };

  const handleAddPlayer = (player: PlayerListItem) => {
    const beforeCount = useSquadStore.getState().selectedPlayers.length;
    addPlayer(player);
    const afterCount = useSquadStore.getState().selectedPlayers.length;
    if (afterCount > beforeCount) {
      showBanner(player.name, 'added');
    }
    clearActiveSlot();
  };

  const finishAfterCreate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['myTeamRef', CURRENT_SEASON] });
    await queryClient.invalidateQueries({ queryKey: ['team'] });
    reset();
    setBanner(null);
    setAutoPickSuccess(false);
    setMetric('opponent');
    setViewMode('pitch');
    toast.success('Squad saved. Good luck!');
    onTeamCreated();
  };

  const handleSubmit = async () => {
    const trimmedName = teamNameFromUser.trim();
    if (!trimmedName) {
      setSubmitError('Unable to resolve your username for the team name');
      return;
    }

    setSubmitError(null);

    try {
      const created = await createTeamMutation.mutateAsync({
        name: trimmedName,
        season: CURRENT_SEASON,
        playerIds: selectedPlayers.map((p) => p.id),
        lineup: toCreateLineup(lineup),
      });

      try {
        await applyPostCreatePatches(created, lineup);
      } catch (error) {
        toast.error(
          getErrorMessage(
            error,
            'Team created, but lineup/captain could not be saved — open My Team to finish',
          ),
        );
        await finishAfterCreate();
        return;
      }

      await finishAfterCreate();
    } catch (error) {
      if (isApiError(error) && error.error.includes('already have a team')) {
        setSubmitError(error.error);
        await queryClient.invalidateQueries({ queryKey: ['myTeamRef', CURRENT_SEASON] });
        onTeamCreated();
        return;
      }
      setSubmitError(getErrorMessage(error, 'Failed to create team'));
    }
  };

  useTelegramMainButton({
    text: 'Confirm Squad',
    visible: isTelegram,
    enabled: canSubmit && !isAutoPicking && !createTeamMutation.isPending,
    loading: createTeamMutation.isPending,
    onClick: () => void handleSubmit(),
  });

  const handleAutoPick = async () => {
    setIsAutoPicking(true);
    setSubmitError(null);

    try {
      if (selectedPlayers.length >= SQUAD_SIZE) {
        setSubmitError('Squad is already full');
        return;
      }

      const candidates = await fetchAllPlayersForAutoPick();

      if (candidates.length === 0) {
        setSubmitError('No players found. Sync player data from the admin panel, then try again.');
        return;
      }

      if (!canBuildSquadFromPool(candidates)) {
        setSubmitError(
          'Not enough players in each position to auto-pick. Run a full data sync, then try again.',
        );
        return;
      }

      const autoSquad = fillRemainingSlots(selectedPlayers, candidates);

      if (!autoSquad) {
        setSubmitError('Auto Pick could not build a valid squad from the available players.');
        return;
      }

      applyAutoPickedSquad(autoSquad, formation);
      setViewMode('pitch');
      setAutoPickSuccess(true);
      window.setTimeout(() => setAutoPickSuccess(false), 4500);
    } catch {
      setSubmitError('Auto Pick failed to load players. Please try again.');
    } finally {
      setIsAutoPicking(false);
    }
  };

  const handleResetRequest = () => {
    if (selectedPlayers.length === 0) {
      setSubmitError(null);
      setBanner(null);
      setAutoPickSuccess(false);
      setViewMode('pitch');
      return;
    }
    setResetConfirmOpen(true);
  };

  const handleResetConfirm = () => {
    reset();
    setSubmitError(null);
    setBanner(null);
    setAutoPickSuccess(false);
    setMetric('opponent');
    setViewMode('pitch');
    setResetConfirmOpen(false);
  };

  return (
    <div
      className="squad-builder-shell w-full pb-4 lg:grid lg:grid-cols-[minmax(430px,32vw)_minmax(0,1fr)] lg:items-start lg:gap-5 xl:grid-cols-[minmax(520px,560px)_minmax(0,1fr)]"
      data-testid="squad-builder"
    >
      {isLgUp ? (
        <PlayerSelectionPanel
          variant="sidebar"
          activePosition={activeSlot}
          activeSlotIndex={activeSlotIndex}
          selectedPlayers={selectedPlayers}
          onAdd={handleAddPlayer}
          onRemove={handleRemovePlayer}
          onPlayerInfo={setDetailPlayerId}
          showHeaderStats={false}
          showTitle
        />
      ) : null}

      <section
        className="fpl-surface-panel squad-builder-workspace create-team-reference relative min-w-0"
        aria-labelledby="squad-builder-title"
      >
        <WorkflowHeader
          title="Create Team"
          titleId="squad-builder-title"
          leading={<button type="button" className="pick-team-header-action" aria-label="Back" onClick={() => navigate('/team')}><ArrowLeft /></button>}
          trailing={<button type="button" className="workflow-brand-action" aria-label="Squad builder help" onClick={() => setHelpOpen(true)}><TeamLogo decorative eager /><CircleHelp /></button>}
        />
        <WorkflowDeadlineLine gameweek={selectedGameweek} fallbackNumber={1} />

        <div className="mt-8 grid gap-7 border-b border-white/12 pb-9 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
          <SquadBuilderIdentity />
          <SquadBuilderSummary selectedPlayers={selectedPlayers} layout="header" />
        </div>

        <div className="mt-6 flex min-h-12 justify-center">
          {autoPickSuccess ? (
            <div
              className="rounded-lg bg-[#2baa4b] px-6 py-3 text-base font-semibold text-white"
              role="status"
            >
              Auto Pick successful
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <SquadBuilderViewToggle
            value={viewMode}
            onChange={(mode) => {
              setViewMode(mode);
              if (mode === 'pitch') {
                clearActiveSlot();
              }
            }}
          />
          <label className="inline-flex items-center gap-2 self-start rounded-lg border border-white/45 px-3 py-2 text-base font-bold text-white sm:self-auto">
            <span aria-hidden>▦</span>
            <select
              value={metric}
              onChange={(event) => setMetric(event.target.value as SquadMetric)}
              className="bg-transparent text-white outline-none"
              aria-label="List display metric"
            >
              {(Object.keys(METRIC_LABELS) as SquadMetric[]).map((key) => (
                <option key={key} value={key} className="bg-[#37003c]">
                  {METRIC_LABELS[key]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="relative mt-8 space-y-4">
          {banner ? (
            <div className="pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2">
              <InlineAddBanner playerName={banner.playerName} action={banner.action} />
            </div>
          ) : null}

          {viewMode === 'pitch' ? (
            <PitchView
              mode="draft-buckets"
              badgeMode="price"
              selectedPlayers={selectedPlayers}
              lineup={lineup}
              activeSlot={activeSlot}
              activeSlotIndex={activeSlotIndex}
              onSlotClick={handleSlotClick}
              onStarterClick={isComplete() ? cycleCaptainOnPlayer : undefined}
              keepBucketLayout
              cardLayout="shirt"
              builderMode
              playerDisplayValues={playerDisplayValues}
            />
          ) : (
            <SquadSlotListView
              selectedPlayers={selectedPlayers}
              onSlotClick={handleSlotClick}
              onPlayerInfo={setDetailPlayerId}
              displayMetric={metric}
              fixtureMap={fixtureMap}
            />
          )}

          {isComplete() ? (
            <section className="rounded-2xl border border-white/10 bg-fpl-purple/30 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wide text-white/85">
                  Formation & captain
                </h3>
                <div className="rounded-full bg-white/8 px-3 py-1 text-xs font-medium text-white/60">
                  Bank: {formatPrice(getRemainingBudget(selectedPlayers))}
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <FormationSelector
                    value={formation}
                    onChange={setFormation}
                    disabled={!isComplete()}
                  />
                </div>
                <CaptainSelector disabled={!isComplete()} />
              </div>
            </section>
          ) : null}
        </div>

        {errors.length > 0 && selectedPlayers.length > 0 ? (
          <div className="rounded-lg border border-fpl-cyan/30 bg-fpl-cyan/10 p-3">
            <ul className="list-inside list-disc text-sm text-fpl-cyan">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {submitError ? (
          <p className="text-center text-sm text-fpl-pink">{submitError}</p>
        ) : null}

        <div className="fpl-action-bar">
          <SquadBuilderActions
            canSubmit={canSubmit}
            isSubmitting={createTeamMutation.isPending}
            canAutoPick={!isAutoPicking && !createTeamMutation.isPending}
            isAutoPicking={isAutoPicking}
            selectedCount={selectedPlayers.length}
            onAutoPick={() => void handleAutoPick()}
            onReset={handleResetRequest}
            onSubmit={() => void handleSubmit()}
            hidePrimary={isTelegram}
          />
        </div>

        <SquadBuilderFixtures selectedGameweek={selectedGameweek} />
      </section>

      {modalOpen ? (
        <PlayerSelectionModal
          open={modalOpen}
          activePosition={activeSlot!}
          activeSlotIndex={activeSlotIndex!}
          selectedPlayers={selectedPlayers}
          onAdd={handleAddPlayer}
          onPlayerInfo={setDetailPlayerId}
          onClose={clearActiveSlot}
        />
      ) : null}

      {detailPlayerId ? (
        <PlayerDetailModal playerId={detailPlayerId} onClose={() => setDetailPlayerId(null)} />
      ) : null}

      <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title="Squad rules">
        <div className="space-y-3 text-sm leading-relaxed text-white/75">
          <p>Pick 15 players: 2 goalkeepers, 5 defenders, 5 midfielders, and 3 forwards.</p>
          <p>You can select a maximum of 3 players from the same club and must stay within budget.</p>
          <p>Use Pitch and List views to review your squad, then choose formation, captain, and vice-captain before entering your squad.</p>
        </div>
      </Modal>

      <Modal
        open={resetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
        title="Reset squad?"
      >
        <p className="mb-4 text-sm text-white/70">
          This clears all players from your squad. Your team name will be kept.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setResetConfirmOpen(false)}
            className="rounded-full border border-white/40 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleResetConfirm}
            className="rounded-full bg-white px-4 py-2 text-sm font-bold text-[#37003c] transition hover:bg-fpl-gray-50"
          >
            Reset
          </button>
        </div>
      </Modal>
    </div>
  );
}

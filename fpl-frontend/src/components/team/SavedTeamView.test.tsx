import { cleanup, fireEvent, render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SavedTeamView } from '@/components/team/SavedTeamView';
import type { Position } from '@/types/player';
import type { SquadEntry, TeamDetail } from '@/types/team';

const setLineup = vi.fn();

vi.mock('@/hooks/useTeamMutations', () => ({
  useSetLineup: () => ({ mutateAsync: setLineup, isPending: false }),
}));

vi.mock('@/hooks/useChipStatus', () => ({
  useChipStatus: () => ({
    data: {
      activeThisGameweek: null,
      availability: {
        BENCH_BOOST: true,
        TRIPLE_CAPTAIN: true,
        WILDCARD: false,
        FREE_HIT: false,
      },
      history: [],
    },
  }),
}));

vi.mock('@/hooks/useCancelChip', () => ({
  useCancelChip: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/useFixtures', () => ({
  useFixtures: () => ({
    data: {
      data: [
        {
          id: 'fixture-1',
          kickoffTime: '2026-08-15T14:00:00.000Z',
          homeDifficulty: 2,
          awayDifficulty: 4,
          homeTeam: { id: 'club-gk', name: 'Goal Club', shortName: 'GCL' },
          awayTeam: { id: 'opponent', name: 'Opponent', shortName: 'OPP' },
        },
      ],
    },
    isLoading: false,
    isError: false,
  }),
}));

vi.mock('@/hooks/usePlayers', () => ({
  usePlayers: () => ({ data: undefined, isLoading: false, isError: false }),
}));

vi.mock('@/hooks/useMyLeagues', () => ({
  useMyLeagues: () => ({ data: { data: [] }, isLoading: false, isError: false, refetch: vi.fn() }),
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (state: { user: { displayName: string } }) => unknown) =>
    selector({ user: { displayName: 'Test Manager' } }),
}));

vi.mock('@/components/chips/ChipSelector', () => ({ ChipSelector: () => null }));
vi.mock('@/components/team/SquadBuilderFixtures', () => ({ SquadBuilderFixtures: () => null }));
vi.mock('@/components/team/PlayerDetailModal', () => ({
  PlayerDetailModal: ({
    playerId,
    actions,
    teamActions,
  }: {
    playerId: string | null;
    actions?: ReactNode;
    teamActions?: {
      onCaptain: () => void;
      onViceCaptain: () => void;
      onSubstitute: () => void;
    };
  }) => playerId ? (
    <div>
      Details for {playerId}{actions}
      {teamActions ? (
        <>
          <button type="button" onClick={teamActions.onSubstitute}>Switch</button>
          <button type="button" onClick={teamActions.onCaptain}>Make Captain</button>
          <button type="button" onClick={teamActions.onViceCaptain}>Make Vice-Captain</button>
        </>
      ) : null}
    </div>
  ) : null,
}));
vi.mock('@/components/team/PlayerPointsModal', () => ({ PlayerPointsModal: () => null }));
vi.mock('@/components/team/PointsBreakdownPanel', () => ({ PointsBreakdownPanel: () => null }));
vi.mock('@/components/team/GameweekStatusBanner', () => ({ GameweekStatusBanner: () => null }));

vi.mock('@/components/pitch/PitchView', () => ({
  PitchView: ({
    squad,
    onPlayerActivate,
    playerDisplayValues,
  }: {
    squad: SquadEntry[];
    onPlayerActivate?: (playerId: string) => void;
    playerDisplayValues?: Map<string, string>;
  }) => (
    <div>
      {squad.map((entry) => (
        <button key={entry.playerId} type="button" onClick={() => onPlayerActivate?.(entry.playerId)}>
          {entry.player.name} {playerDisplayValues?.get(entry.playerId)}
        </button>
      ))}
    </div>
  ),
}));

function makeEntry(
  id: string,
  position: Position,
  isStarter: boolean,
  benchOrder: number | null,
  index: number,
): SquadEntry {
  return {
    playerId: id,
    position,
    isStarter,
    benchOrder,
    isCaptain: id === 'mid-1',
    isViceCaptain: id === 'mid-2',
    player: {
      name: id,
      price: 50 + index,
      realTeam: {
        id: position === 'GK' ? 'club-gk' : `club-${index}`,
        name: `Club ${index}`,
        shortName: position === 'GK' ? 'GCL' : `C${index}`,
      },
    },
    rawPoints: 0,
    gameweekPoints: null,
    counted: null,
    captainMultiplier: id === 'mid-1' ? 2 : null,
    wasSubstitutedIn: false,
    wasSubstitutedOut: false,
    pointsStatus: 'pending',
  };
}

function makeTeam(): TeamDetail {
  const squad = [
    makeEntry('gk-1', 'GK', true, null, 1),
    makeEntry('gk-2', 'GK', false, 1, 2),
    ...Array.from({ length: 5 }, (_, index) =>
      makeEntry(`def-${index + 1}`, 'DEF', index < 3, index < 3 ? null : index - 1, index + 3),
    ),
    ...Array.from({ length: 5 }, (_, index) =>
      makeEntry(`mid-${index + 1}`, 'MID', index < 4, index < 4 ? null : 4, index + 8),
    ),
    ...Array.from({ length: 3 }, (_, index) =>
      makeEntry(`fwd-${index + 1}`, 'FWD', true, null, index + 13),
    ),
  ];
  return {
    id: 'team-1',
    name: 'Test XI',
    season: '2026/27',
    bankBalance: 10,
    squadValue: 990,
    totalPoints: 0,
    freeTransfers: 1,
    activeChip: null,
    gameweek: { number: 1, status: 'UPCOMING' },
    gameweekTotal: null,
    gameweekBreakdown: null,
    squad,
  };
}

function renderView() {
  return render(
    <MemoryRouter>
      <SavedTeamView
        team={makeTeam()}
        canEdit
        onUpdated={vi.fn()}
        selectedGameweek={{
          id: 'gw-1',
          number: 1,
          deadline: '2026-08-15T10:00:00.000Z',
          status: 'UPCOMING',
          isCurrent: false,
        }}
      />
    </MemoryRouter>,
  );
}

describe('SavedTeamView official workflow', () => {
  beforeEach(() => {
    setLineup.mockReset();
    setLineup.mockResolvedValue(undefined);
  });

  it('opens the combined player sheet and starts a switch from it', async () => {
    renderView();

    fireEvent.click(screen.getByRole('button', { name: /gk-1 OPP \(H\)/i }));
    expect(screen.getByText('Details for gk-1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Switch/i }));
    expect(screen.getAllByText(/Choose a highlighted player/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /gk-2 OPP \(H\)/i }));
    expect(screen.getByText('Players switched.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm team changes' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Cancel team changes' })).toBeInTheDocument();
  });

  it('updates captaincy as a draft and saves through the existing lineup payload', async () => {
    renderView();

    fireEvent.click(screen.getByRole('button', { name: /fwd-1/i }));
    fireEvent.click(screen.getByRole('button', { name: /Make Captain/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm team changes' }));

    expect(setLineup).toHaveBeenCalledWith(
      expect.objectContaining({ captainId: 'fwd-1', viceCaptainId: 'mid-2' }),
    );
  });

  it('cancels an edit session without saving it', () => {
    renderView();
    fireEvent.click(screen.getByRole('button', { name: /fwd-1/i }));
    fireEvent.click(screen.getByRole('button', { name: /Make Captain/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel team changes' }));
    expect(setLineup).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Back to Home' })).toHaveAttribute('href', '/home');
  });

  it('shows player information together with team actions', async () => {
    renderView();

    fireEvent.click(screen.getByRole('button', { name: /mid-3/i }));
    expect(screen.getByText('Details for mid-3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Switch/i })).toBeInTheDocument();
  });

  it('renders the clean reference workflow in order', () => {
    const { container } = renderView();
    const labels = [
      'Pick Team',
      'Gameweek 1',
      'Bench Boost',
      'Triple Captain',
      'Wildcard',
      'Free Hit',
      'Pitch',
      'List',
    ];

    const positions = labels.map((label) => container.textContent?.indexOf(label) ?? -1);

    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('removes manager and sidebar content from the Pick Team interface', () => {
    renderView();
    expect(screen.queryByText('Points & Rankings')).not.toBeInTheDocument();
    expect(screen.queryByText('Please note:')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Home' })).toHaveAttribute('href', '/home');
  });

  it('shows the requested detailed columns in list view', () => {
    renderView();
    fireEvent.click(screen.getByRole('tab', { name: 'List' }));
    expect(screen.getByText('Form')).toBeInTheDocument();
    expect(screen.getByText('Current Price')).toBeInTheDocument();
    expect(screen.getByText('Selected')).toBeInTheDocument();
  });

  it('opens and confirms each pick-team chip from the drawer', async () => {
    renderView();

    fireEvent.click(screen.getByRole('button', { name: /Bench Boost available/i }));
    expect(screen.getByRole('dialog', { name: 'Bench Boost' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Play Bench Boost' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm team changes' }));
    expect(setLineup).toHaveBeenCalledWith(expect.objectContaining({ chipSelection: 'BENCH_BOOST' }));

    cleanup();
    setLineup.mockClear();
    renderView();

    fireEvent.click(screen.getByRole('button', { name: /Triple Captain available/i }));
    expect(screen.getByRole('dialog', { name: 'Triple Captain' })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Close chip details' })[0]);
    expect(screen.queryByRole('dialog', { name: 'Triple Captain' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Triple Captain available/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Play Triple Captain' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm team changes' }));
    expect(setLineup).toHaveBeenCalledWith(expect.objectContaining({ chipSelection: 'TRIPLE_CAPTAIN' }));
  });
});

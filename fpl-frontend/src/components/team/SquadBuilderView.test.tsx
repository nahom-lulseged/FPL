import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SquadBuilderView } from '@/components/team/SquadBuilderView';
import { useSquadStore } from '@/store/squadStore';
import type { PlayerListItem } from '@/types/player';
import { TelegramProvider } from '@/lib/telegram';

const mockUsePlayers = vi.fn();
const mockCreateTeam = vi.fn();

vi.mock('@/hooks/usePlayers', () => ({
  usePlayers: (...args: unknown[]) => mockUsePlayers(...args),
}));

vi.mock('@/hooks/useFixtures', () => ({
  useFixtures: () => ({
    data: { data: [] },
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/hooks/useRealTeams', () => ({
  useRealTeams: () => ({
    data: [{ id: 'liv', name: 'Liverpool', shortName: 'LIV' }],
  }),
}));

vi.mock('@/hooks/useTeamMutations', () => ({
  useCreateTeam: () => ({
    mutateAsync: mockCreateTeam,
    isPending: false,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: vi.fn(),
    }),
  };
});

vi.mock('@/components/pitch/PitchView', () => ({
  PitchView: ({
    onSlotClick,
  }: {
    onSlotClick?: (position: 'MID', index: number, playerId?: string) => void;
  }) => (
    <button type="button" onClick={() => onSlotClick?.('MID', 0)}>
      Open MID slot
    </button>
  ),
}));

function makePlayer(overrides: Partial<PlayerListItem> = {}): PlayerListItem {
  return {
    id: 'p1',
    name: 'Salah',
    position: 'MID',
    price: 85,
    isAvailable: true,
    realTeam: { id: 'liv', name: 'Liverpool', shortName: 'LIV' },
    totalPoints: 180,
    eventPoints: 8,
    selectedByPercent: 25.4,
    minutes: 2500,
    goalsScored: 15,
    assists: 10,
    cleanSheets: 0,
    goalsConceded: 0,
    ownGoals: 0,
    penaltiesSaved: 0,
    ...overrides,
  };
}

const listResponse = {
  data: [makePlayer()],
  meta: {
    page: 1,
    limit: 12,
    total: 1,
    totalPages: 1,
    priceBounds: { min: 45, max: 85, q1: 50, q2: 70, q3: 80 },
  },
};

function renderBuilder() {
  return render(
    <TelegramProvider>
      <SquadBuilderView onTeamCreated={vi.fn()} />
    </TelegramProvider>,
  );
}

describe('SquadBuilderView', () => {
  beforeEach(() => {
    useSquadStore.getState().reset();
    mockUsePlayers.mockReturnValue({
      data: listResponse,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    mockCreateTeam.mockReset();
  });

  it('opens player selection modal from pitch slot tap', async () => {
    const user = userEvent.setup();

    renderBuilder();

    await user.click(screen.getByRole('button', { name: 'Open MID slot' }));
    expect(screen.getByRole('heading', { name: 'Player Selection' })).toBeInTheDocument();
    expect(document.body).toHaveStyle({ overflow: 'hidden' });
  });

  it('renders the responsive builder shell and view controls', () => {
    renderBuilder();

    expect(screen.getByTestId('squad-builder')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pitch View' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'List View' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('closes the mobile player sheet with Escape and restores page scrolling', async () => {
    const user = userEvent.setup();

    renderBuilder();
    await user.click(screen.getByRole('button', { name: 'Open MID slot' }));
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('heading', { name: 'Player Selection' })).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('');
  });

  it('shows banner and updates counter after adding a player', async () => {
    const user = userEvent.setup();

    renderBuilder();

    expect(screen.getByText('0 / 15')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'List View' }));
    await user.click(screen.getAllByRole('button', { name: 'Select Midfielder' })[0]!);
    await user.click(screen.getByRole('button', { name: 'Add Salah' }));

    expect(screen.queryByRole('heading', { name: 'Player Selection' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Salah has been added to your squad');
    expect(screen.getByText('1 / 15')).toBeInTheDocument();
    expect(useSquadStore.getState().selectedPlayers).toHaveLength(1);
  });

  it('opens modal from list view select button', async () => {
    const user = userEvent.setup();

    renderBuilder();

    await user.click(screen.getByRole('button', { name: 'List View' }));
    await user.click(screen.getAllByRole('button', { name: 'Select Goalkeeper' })[0]!);

    expect(screen.getByRole('heading', { name: 'Player Selection' })).toBeInTheDocument();
    // The position filter is now surfaced through the "Team" scope filter dropdown:
    // opening the modal with active position GK sets teamFilter to `pos-GK`,
    // which renders the trigger label as "Goalkeepers" (see getScopeFilterTriggerLabel).
    const teamFilterTrigger = screen.getByRole('button', { name: 'Team' });
    expect(teamFilterTrigger).toHaveTextContent('Goalkeepers');
  });
});

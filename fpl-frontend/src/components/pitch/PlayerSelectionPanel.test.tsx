import { render, fireEvent, act } from '@testing-library/react';
import { screen, within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PlayerSelectionPanel } from '@/components/pitch/PlayerSelectionPanel';
import { clearWatchlist } from '@/lib/watchlistStorage';
import type { PlayerListItem } from '@/types/player';

const mockUsePlayers = vi.fn();
const mockUseRealTeams = vi.fn();

vi.mock('@/hooks/usePlayers', () => ({
  usePlayers: (...args: unknown[]) => mockUsePlayers(...args),
}));

vi.mock('@/hooks/useRealTeams', () => ({
  useRealTeams: () => mockUseRealTeams(),
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
    totalPages: 3,
    priceBounds: { min: 45, max: 85, q1: 50, q2: 70, q3: 80 },
  },
};

function getMainListCalls() {
  return mockUsePlayers.mock.calls.filter((call) => call[0]?.limit === 12);
}

async function openFilter(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(screen.getByRole('button', { name: label }));
}

describe('PlayerSelectionPanel', () => {
  beforeEach(() => {
    clearWatchlist();
    mockUsePlayers.mockReturnValue({
      data: listResponse,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseRealTeams.mockReturnValue({
      data: [{ id: 'liv', name: 'Liverpool', shortName: 'LIV' }],
    });
  });

  it('defaults scope filter to the active slot position', () => {
    render(
      <PlayerSelectionPanel
        activePosition="GK"
        activeSlotIndex={0}
        selectedPlayers={[]}
        onAdd={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Team' })).toHaveTextContent('Goalkeepers');
  });

  it('uses Find a player label and Search by name placeholder', () => {
    render(
      <PlayerSelectionPanel
        activePosition="MID"
        activeSlotIndex={0}
        selectedPlayers={[]}
        onAdd={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Find a player')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search by name')).toBeInTheDocument();
  });

  it('updates sort column header when sort changes', async () => {
    const user = userEvent.setup();
    render(
      <PlayerSelectionPanel
        activePosition="MID"
        activeSlotIndex={0}
        selectedPlayers={[]}
        onAdd={vi.fn()}
      />,
    );

    expect(screen.getByTitle('Total points')).toHaveTextContent('TP');

    await openFilter(user, 'Sort');
    await user.click(screen.getByRole('option', { name: 'Price' }));
    expect(screen.getByTitle('Price')).toHaveTextContent('£');
  });

  it('shows squad counter when showHeaderStats is true', () => {
    render(
      <PlayerSelectionPanel
        activePosition="MID"
        activeSlotIndex={0}
        selectedPlayers={[makePlayer()]}
        onAdd={vi.fn()}
        showHeaderStats
      />,
    );

    expect(screen.getByText(/Players selected 1\/15/)).toBeInTheDocument();
  });

  it('hides squad counter when showHeaderStats is false', () => {
    render(
      <PlayerSelectionPanel
        activePosition="MID"
        activeSlotIndex={0}
        selectedPlayers={[makePlayer()]}
        onAdd={vi.fn()}
        showHeaderStats={false}
      />,
    );

    expect(screen.queryByText(/Players selected/)).not.toBeInTheDocument();
    expect(screen.getByText(/players shown/i)).toBeInTheDocument();
  });

  it('calls onAdd when adding a player', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();

    render(
      <PlayerSelectionPanel
        activePosition="MID"
        activeSlotIndex={0}
        selectedPlayers={[]}
        onAdd={onAdd}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Add Salah' }));
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ name: 'Salah' }));
  });

  it('shows inline reason when tapping disabled add button', async () => {
    const user = userEvent.setup();
    const overBudget = makePlayer({ price: 1001 });

    mockUsePlayers.mockReturnValue({
      data: { ...listResponse, data: [overBudget] },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <PlayerSelectionPanel
        activePosition="MID"
        activeSlotIndex={0}
        selectedPlayers={[]}
        onAdd={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Add Salah' }));
    expect(screen.getByText(/You need £.* more/)).toBeInTheDocument();
  });

  it('debounces search before querying players', () => {
    vi.useFakeTimers();

    render(
      <PlayerSelectionPanel
        activePosition="MID"
        activeSlotIndex={0}
        selectedPlayers={[]}
        onAdd={vi.fn()}
      />,
    );

    mockUsePlayers.mockClear();
    fireEvent.change(screen.getByLabelText('Find a player'), { target: { value: 'Sal' } });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    const listCalls = getMainListCalls();
    expect(listCalls.some((call) => call[0]?.search === 'Sal')).toBe(true);

    vi.useRealTimers();
  });

  it('applies affordable price tier filter', async () => {
    const user = userEvent.setup();
    render(
      <PlayerSelectionPanel
        activePosition="MID"
        activeSlotIndex={0}
        selectedPlayers={[]}
        onAdd={vi.fn()}
      />,
    );

    mockUsePlayers.mockClear();
    await openFilter(user, 'Price');
    await user.click(screen.getByRole('option', { name: 'Affordable' }));

    const listCalls = getMainListCalls();
    expect(listCalls.some((call) => call[0]?.maxPrice === 1000)).toBe(true);
  });

  it('applies team club filter', async () => {
    const user = userEvent.setup();
    render(
      <PlayerSelectionPanel
        activePosition="MID"
        activeSlotIndex={0}
        selectedPlayers={[]}
        onAdd={vi.fn()}
      />,
    );

    mockUsePlayers.mockClear();
    await openFilter(user, 'Team');
    const dialog = screen.getByRole('dialog', { name: 'Team' });
    expect(within(dialog).getByRole('heading', { name: 'Global' })).toBeInTheDocument();
    expect(within(dialog).getByRole('heading', { name: 'Position' })).toBeInTheDocument();
    expect(within(dialog).getByRole('heading', { name: 'Teams' })).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: /Liverpool/i }));

    const listCalls = getMainListCalls();
    expect(listCalls.some((call) => call[0]?.teamId === 'liv')).toBe(true);
    expect(screen.getByRole('button', { name: 'Team' })).toHaveTextContent('LIV');
  });

  it('syncs position filter when team position shortcut is selected', async () => {
    const user = userEvent.setup();
    render(
      <PlayerSelectionPanel
        activePosition="MID"
        activeSlotIndex={0}
        selectedPlayers={[]}
        onAdd={vi.fn()}
      />,
    );

    await openFilter(user, 'Team');
    const dialog = screen.getByRole('dialog', { name: 'Team' });
    await user.click(within(dialog).getByRole('button', { name: 'Defenders' }));

    expect(screen.getByRole('button', { name: 'Team' })).toHaveTextContent('Defenders');
  });

  it('resets filters when Reset is clicked', async () => {
    const user = userEvent.setup();

    render(
      <PlayerSelectionPanel
        activePosition="GK"
        activeSlotIndex={0}
        selectedPlayers={[]}
        onAdd={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Find a player'), { target: { value: 'Test' } });
    await openFilter(user, 'Sort');
    await user.click(screen.getByRole('option', { name: 'Price' }));
    await openFilter(user, 'Team');
    await user.click(
      within(screen.getByRole('dialog', { name: 'Team' })).getByRole('button', {
        name: 'Defenders',
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Reset' }));

    expect(screen.getByLabelText('Find a player')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Team' })).toHaveTextContent('Goalkeepers');
    expect(screen.getByRole('button', { name: 'Sort' })).toHaveTextContent('Total points');
  });

  it('resets filters when active slot changes', () => {
    const { rerender } = render(
      <PlayerSelectionPanel
        activePosition="GK"
        activeSlotIndex={0}
        selectedPlayers={[]}
        onAdd={vi.fn()}
      />,
    );

    rerender(
      <PlayerSelectionPanel
        activePosition="FWD"
        activeSlotIndex={1}
        selectedPlayers={[]}
        onAdd={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Team' })).toHaveTextContent('Forwards');
    expect(screen.getByRole('button', { name: 'Sort' })).toHaveTextContent('Total points');
  });

  it('navigates pagination controls', async () => {
    const user = userEvent.setup();

    render(
      <PlayerSelectionPanel
        activePosition="MID"
        activeSlotIndex={0}
        selectedPlayers={[]}
        onAdd={vi.fn()}
      />,
    );

    expect(screen.getByText('1 of 3')).toBeInTheDocument();

    mockUsePlayers.mockClear();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(getMainListCalls().some((call) => call[0]?.page === 2)).toBe(true);

    mockUsePlayers.mockReturnValue({
      data: { ...listResponse, meta: { ...listResponse.meta, page: 3 } },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    mockUsePlayers.mockClear();
    await user.click(screen.getByRole('button', { name: 'Last page' }));
    expect(getMainListCalls().some((call) => call[0]?.page === 3)).toBe(true);
  });

  it('disables first and previous on page 1', () => {
    render(
      <PlayerSelectionPanel
        activePosition="MID"
        activeSlotIndex={0}
        selectedPlayers={[]}
        onAdd={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'First page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
  });

  it('resets page to 1 when sort changes', async () => {
    const user = userEvent.setup();
    render(
      <PlayerSelectionPanel
        activePosition="MID"
        activeSlotIndex={0}
        selectedPlayers={[]}
        onAdd={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Next page' }));
    mockUsePlayers.mockClear();
    await openFilter(user, 'Sort');
    await user.click(screen.getByRole('option', { name: 'Assists' }));

    expect(getMainListCalls().some((call) => call[0]?.page === 1)).toBe(true);
  });

  it('shows empty state when no players match', () => {
    mockUsePlayers.mockReturnValue({
      data: { ...listResponse, data: [] },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <PlayerSelectionPanel
        activePosition="MID"
        activeSlotIndex={0}
        selectedPlayers={[]}
        onAdd={vi.fn()}
      />,
    );

    expect(screen.getByText('No players match your filters.')).toBeInTheDocument();
  });

  it('toggles a player onto the watchlist via the star button', async () => {
    const user = userEvent.setup();
    render(
      <PlayerSelectionPanel
        activePosition="MID"
        activeSlotIndex={0}
        selectedPlayers={[]}
        onAdd={vi.fn()}
      />,
    );

    const star = screen.getByRole('button', { name: 'Add Salah to watchlist' });
    expect(star).toHaveAttribute('aria-pressed', 'false');
    await user.click(star);
    expect(screen.getByRole('button', { name: 'Remove Salah from watchlist' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('filters by watchlist ids when Watchlist is selected', async () => {
    const user = userEvent.setup();
    render(
      <PlayerSelectionPanel
        activePosition="MID"
        activeSlotIndex={0}
        selectedPlayers={[]}
        onAdd={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Add Salah to watchlist' }));
    mockUsePlayers.mockClear();
    await openFilter(user, 'Team');
    await user.click(
      within(screen.getByRole('dialog', { name: 'Team' })).getByRole('button', {
        name: 'Watchlist',
      }),
    );

    expect(screen.getByRole('button', { name: 'Team' })).toHaveTextContent('Watchlist');
    const listCalls = getMainListCalls();
    expect(listCalls.some((call) => call[0]?.ids === 'p1')).toBe(true);
    expect(listCalls.some((call) => call[0]?.position === undefined)).toBe(true);
  });

  it('shows empty watchlist state without querying players', async () => {
    const user = userEvent.setup();
    render(
      <PlayerSelectionPanel
        activePosition="MID"
        activeSlotIndex={0}
        selectedPlayers={[]}
        onAdd={vi.fn()}
      />,
    );

    await openFilter(user, 'Team');
    mockUsePlayers.mockClear();
    await user.click(
      within(screen.getByRole('dialog', { name: 'Team' })).getByRole('button', {
        name: 'Watchlist',
      }),
    );

    expect(screen.getByText('No players on your watchlist.')).toBeInTheDocument();
    expect(screen.getByText('0 players shown')).toBeInTheDocument();
    expect(getMainListCalls().length).toBeGreaterThan(0);
    expect(getMainListCalls().every((call) => call[1]?.enabled === false)).toBe(true);
  });

  it('does not clear saved watchlist ids on Reset', async () => {
    const user = userEvent.setup();
    render(
      <PlayerSelectionPanel
        activePosition="MID"
        activeSlotIndex={0}
        selectedPlayers={[]}
        onAdd={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Add Salah to watchlist' }));
    await openFilter(user, 'Team');
    await user.click(
      within(screen.getByRole('dialog', { name: 'Team' })).getByRole('button', {
        name: 'Watchlist',
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Reset' }));

    expect(screen.getByRole('button', { name: 'Team' })).toHaveTextContent('Midfielders');
    expect(screen.getByRole('button', { name: 'Remove Salah from watchlist' })).toBeInTheDocument();
  });
});

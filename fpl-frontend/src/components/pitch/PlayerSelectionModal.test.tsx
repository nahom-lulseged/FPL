import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PlayerSelectionModal } from '@/components/pitch/PlayerSelectionModal';
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
    totalPages: 1,
    priceBounds: { min: 45, max: 85, q1: 50, q2: 70, q3: 80 },
  },
};

describe('PlayerSelectionModal', () => {
  beforeEach(() => {
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

  it('renders panel content when open', () => {
    render(
      <PlayerSelectionModal
        open
        activePosition="GK"
        activeSlotIndex={0}
        selectedPlayers={[]}
        onAdd={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Player Selection' })).toBeInTheDocument();
    expect(screen.getByLabelText('Find a player')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <PlayerSelectionModal
        open={false}
        activePosition="GK"
        activeSlotIndex={0}
        selectedPlayers={[]}
        onAdd={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.queryByText('Player Selection')).not.toBeInTheDocument();
  });

  it('calls onAdd and onClose when adding a player', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    const onClose = vi.fn();

    render(
      <PlayerSelectionModal
        open
        activePosition="MID"
        activeSlotIndex={0}
        selectedPlayers={[]}
        onAdd={onAdd}
        onClose={onClose}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Add Salah' }));
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ name: 'Salah' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <PlayerSelectionModal
        open
        activePosition="MID"
        activeSlotIndex={0}
        selectedPlayers={[]}
        onAdd={vi.fn()}
        onClose={onClose}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });
});

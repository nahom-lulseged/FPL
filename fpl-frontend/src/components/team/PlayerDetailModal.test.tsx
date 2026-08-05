import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PlayerDetailModal } from '@/components/team/PlayerDetailModal';

vi.mock('@/hooks/usePlayer', () => ({
  usePlayer: () => ({
    data: {
      id: 'player-1',
      fplId: 123,
      name: 'Abel Tesfaye',
      position: 'MID',
      price: 75,
      isAvailable: true,
      realTeam: { id: 'club-1', name: 'Addis United', shortName: 'ADD' },
      totalPoints: 40,
      eventPoints: 5,
      selectedByPercent: 12.5,
      minutes: 720,
      goalsScored: 2,
      assists: 3,
      cleanSheets: 1,
      goalsConceded: 0,
      ownGoals: 0,
      penaltiesSaved: 0,
      history: [{ gameweek: 1, status: 'FINISHED', points: 5 }],
      upcomingFixtures: [],
    },
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/hooks/usePositionPlayerRanks', () => ({
  usePositionPlayerRanks: () => ({
    data: { total: 50, price: 10, pointsPerMatch: 8, form: 4, selected: 12 },
  }),
}));

describe('PlayerDetailModal', () => {
  it('uses the shared jersey artwork and contains no PL-hosted photo or shop link', () => {
    const { container } = render(
      <MemoryRouter>
        <PlayerDetailModal playerId="player-1" workflowTitle="Transfers" onClose={vi.fn()} />
      </MemoryRouter>,
    );
    expect(container.querySelector('.reference-player-shirt img')).toHaveAttribute('src', expect.stringContaining('data:image/svg+xml'));
    expect(screen.getByRole('heading', { name: 'Transfers' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Buy Player Shirt/i })).toBeDisabled();
    expect(screen.getByRole('link', { name: /Player Profile/i })).toHaveAttribute('href', '/players/player-1');
    expect(container.querySelector('img[src*="premierleague.com"]')).toBeNull();
    expect(container.querySelector('a[href*="shop.premierleague.com"]')).toBeNull();
    expect(screen.getByText('10 of 50')).toBeInTheDocument();
  });
});

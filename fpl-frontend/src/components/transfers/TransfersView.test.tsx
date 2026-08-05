import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TransfersView } from '@/components/transfers/TransfersView';
import { useTransferStore } from '@/store/transferStore';
import { DEFAULT_PLAYER_STATS, type PlayerListItem, type Position } from '@/types/player';
import type { SquadEntry, TeamDetail } from '@/types/team';

const mutateAsync = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useSubmitTransfers', () => ({
  useSubmitTransfers: () => ({ isPending: false, mutateAsync }),
}));
vi.mock('@/hooks/useChipStatus', () => ({
  useChipStatus: () => ({ data: {
    activeThisGameweek: null,
    availability: { WILDCARD: { '1': true, '2': false }, FREE_HIT: true, BENCH_BOOST: true, TRIPLE_CAPTAIN: true },
    history: [],
  } }),
}));
vi.mock('@/hooks/useFixtures', () => ({ useFixtures: () => ({ data: { data: [] } }) }));
vi.mock('@/lib/telegram', () => ({
  useTelegram: () => ({ isTelegram: false }),
  useTelegramMainButton: () => undefined,
}));
vi.mock('@/components/team/PlayerDetailModal', () => ({
  PlayerDetailModal: ({ playerId, actions }: { playerId: string | null; actions?: React.ReactNode }) =>
    playerId ? <div role="dialog" aria-label="Player details">{actions}</div> : null,
}));

const incoming: PlayerListItem = {
  ...DEFAULT_PLAYER_STATS,
  id: 'incoming-mid',
  name: 'Incoming Mid',
  position: 'MID',
  price: 55,
  isAvailable: true,
  realTeam: { id: 'incoming-club', name: 'Incoming Club', shortName: 'INC' },
};

vi.mock('@/components/transfers/PlayerListPanel', () => ({
  PlayerListPanel: ({ onTransferIn }: { onTransferIn: (player: PlayerListItem) => void }) => (
    <button type="button" onClick={() => onTransferIn(incoming)}>Choose Incoming Mid</button>
  ),
}));

const positions: Position[] = [
  'GK', 'GK',
  'DEF', 'DEF', 'DEF', 'DEF', 'DEF',
  'MID', 'MID', 'MID', 'MID', 'MID',
  'FWD', 'FWD', 'FWD',
];

function squadEntry(position: Position, index: number): SquadEntry {
  return {
    playerId: `player-${index}`,
    position,
    isStarter: index < 11,
    benchOrder: index < 11 ? null : index - 10,
    isCaptain: false,
    isViceCaptain: false,
    player: {
      name: `Player ${index}`,
      price: 50,
      realTeam: { id: `club-${Math.floor(index / 3)}`, name: `Club ${index}`, shortName: `C${index}` },
    },
    rawPoints: null,
    gameweekPoints: null,
    counted: null,
    captainMultiplier: null,
    wasSubstitutedIn: null,
    wasSubstitutedOut: null,
    pointsStatus: 'pending',
  };
}

const team: TeamDetail = {
  id: 'team-1',
  name: 'Test XI',
  season: '2026/27',
  bankBalance: 10,
  squadValue: 750,
  totalPoints: 0,
  freeTransfers: 1,
  activeChip: null,
  gameweek: { number: 2, status: 'UPCOMING' },
  gameweekTotal: null,
  gameweekBreakdown: null,
  squad: positions.map(squadEntry),
};

function renderFlow(onUpdated = vi.fn()) {
  return render(
    <MemoryRouter initialEntries={['/transfers']}>
      <Routes>
        <Route path="/transfers" element={<TransfersView team={team} onUpdated={onUpdated} />} />
        <Route path="/transfers/replace/:playerOutId" element={<TransfersView team={team} onUpdated={onUpdated} />} />
        <Route path="/transfers/review" element={<TransfersView team={team} onUpdated={onUpdated} />} />
        <Route path="/my-team" element={<h1>My Team</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('TransfersView route-backed flow', () => {
  beforeEach(() => {
    useTransferStore.getState().clearAll();
    mutateAsync.mockReset();
  });

  it('removes, replaces, reviews, and confirms a staged transfer', async () => {
    const user = userEvent.setup();
    const onUpdated = vi.fn();
    mutateAsync.mockResolvedValue({ transferSummary: { transfersMade: 1, pointsHit: 0, freeTransfersRemaining: 0 } });
    renderFlow(onUpdated);

    await user.click(screen.getByRole('button', { name: /Player 7.*MID/i }));
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(screen.getByRole('button', { name: /Empty MID slot/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add Player' }));
    await user.click(screen.getByRole('button', { name: 'Choose Incoming Mid' }));
    expect(screen.getByLabelText('Pending transfer')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('You are about to transfer 1 player!')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({
      transfers: [{ playerOutId: 'player-7', playerInId: 'incoming-mid' }],
    }));
    expect(onUpdated).toHaveBeenCalled();
    expect(await screen.findByRole('heading', { name: 'My Team' })).toBeInTheDocument();
    expect(useTransferStore.getState().pendingTransfers).toEqual([]);
  });
});

import { fireEvent, render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PlayerCard } from '@/components/pitch/PlayerCard';
import type { PlayerListItem, Position } from '@/types/player';

const MID = 'MID' as Position;

describe('PlayerCard (shirt layout)', () => {
  it('fires onClick when an empty shirt slot is tapped', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <PlayerCard
        variant="empty"
        layout="shirt"
        position={MID}
        onClick={onClick}
      />,
    );

    const card = screen.getByRole('button', { name: /Empty MID slot/i });
    await user.click(card);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('fires onClick when a filled shirt slot is tapped', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    const player = {
      id: 'p1',
      name: 'Salah',
      position: MID as Position,
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
    } satisfies PlayerListItem;

    render(
      <PlayerCard
        variant="filled"
        layout="shirt"
        name={player.name}
        shortName={player.realTeam.shortName}
        price={player.price}
        position={MID}
        onClick={onClick}
      />,
    );

    // The card renders as a <button>; assistant: dropdown labels the card by player + position.
    const card = screen.getByRole('button', { name: /Salah.*MID/i });
    await user.click(card);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders a static club jersey before falling back to the procedural SVG', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { container, unmount } = render(
      <PlayerCard
        variant="filled"
        layout="shirt"
        name="Salah"
        shortName="LIV"
        clubId="club-liv"
        price={85}
        position={MID}
      />,
    );

    const staticJersey = container.querySelector('.player-card-shirt-stage img');
    expect(staticJersey).toHaveAttribute('src', '/assets/jerseys/LIV.png');
    expect(staticJersey).toHaveAttribute('width', '156');
    expect(staticJersey).toHaveAttribute('height', '156');
    expect(staticJersey).toHaveAttribute('loading', 'lazy');

    fireEvent.error(staticJersey!);
    expect(container.querySelector('.player-card-shirt-stage img')).toHaveAttribute('src', expect.stringContaining('data:image/svg+xml'));

    unmount();
    const missing = render(
      <PlayerCard
        variant="filled"
        layout="shirt"
        name="Mystery"
        shortName="XYZ"
        clubId="club-xyz"
        price={45}
        position="GK"
      />,
    );

    expect(missing.container.querySelector('.player-card-shirt-stage img')).toHaveAttribute('src', expect.stringContaining('data:image/svg+xml'));
    expect(warnSpy).toHaveBeenCalledWith(
      '[jerseys] Missing static jersey assets. Falling back to procedural SVG.',
      [{ clubId: 'club-xyz', shortName: 'XYZ' }],
    );

    warnSpy.mockRestore();
  });

  it('renders a div shell with captain controls and isolates armband clicks from the outer onClick', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const onMakeCaptain = vi.fn();
    const onMakeVice = vi.fn();

    render(
      <PlayerCard
        variant="filled"
        layout="shirt"
        name="Salah"
        shortName="LIV"
        price={85}
        position={MID}
        isStarter
        showCaptainControls
        onClick={onClick}
        onMakeCaptain={onMakeCaptain}
        onMakeVice={onMakeVice}
      />,
    );

    // When captain/bench controls are shown, the wrapper becomes a <div role="group">,
    // not a <button>.
    const group = screen.getByRole('group', { name: /Salah.*MID/i });
    expect(group.tagName).toBe('DIV');

    // The captain (C) armband button is rendered and dispatches onMakeCaptain.
    const captainButton = screen.getByRole('button', { name: /Make Salah captain/i });
    await user.click(captainButton);
    expect(onMakeCaptain).toHaveBeenCalledTimes(1);

    // The outer card onClick must NOT fire when an armband button is tapped (stopPropagation).
    expect(onClick).not.toHaveBeenCalled();

    // The vice-captain (V) armband button is disabled while the player is captain;
    // although isCaptain defaults to false here so V is tappable.
    const viceButton = screen.getByRole('button', { name: /Make Salah vice-captain/i });
    await user.click(viceButton);
    expect(onMakeVice).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders switch controls without nesting a button inside a button', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    const { container, rerender } = render(
      <PlayerCard
        variant="filled"
        layout="shirt"
        name="Salah"
        shortName="LIV"
        price={85}
        position={MID}
        showSwitchControl
        onClick={onClick}
      />,
    );

    expect(container.querySelector('button button')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Switch Salah' }));
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(
      <PlayerCard
        variant="active"
        layout="shirt"
        name="Salah"
        shortName="LIV"
        price={85}
        position={MID}
        showSwitchControl
        switchModeActive
        isSwitchSelected
        onClick={onClick}
      />,
    );
    expect(screen.getByRole('button', { name: 'Cancel switch for Salah' })).toBeInTheDocument();
  });

  it('labels valid and invalid targets during an active switch', () => {
    const { rerender } = render(
      <PlayerCard
        variant="filled"
        layout="shirt"
        name="Palmer"
        shortName="CHE"
        price={95}
        position={MID}
        showSwitchControl
        switchModeActive
        isSwitchTargetValid
        onClick={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Switch with Palmer' })).toHaveTextContent('Pick');

    rerender(
      <PlayerCard
        variant="filled"
        layout="shirt"
        name="Palmer"
        shortName="CHE"
        price={95}
        position={MID}
        showSwitchControl
        switchModeActive
        isSwitchTargetValid={false}
        onClick={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Palmer is not a valid switch' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('renders staged incoming and removed-slot transfer states', () => {
    const { rerender } = render(
      <PlayerCard
        variant="filled"
        layout="shirt"
        name="Palmer"
        shortName="CHE"
        price={95}
        position={MID}
        pendingTransfer
        onClick={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('Pending transfer')).toBeInTheDocument();
    expect(screen.queryByText('£9.5m')).not.toBeInTheDocument();

    rerender(
      <PlayerCard
        variant="active"
        layout="shirt"
        name="Palmer"
        shortName="CHE"
        price={95}
        position={MID}
        transferOut
        onClick={vi.fn()}
      />,
    );
    expect(screen.getAllByText('MID').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Empty MID slot/i })).toHaveClass('border-dashed');
  });

  it('renders price and availability as mutually exclusive badge modes', () => {
    const { rerender } = render(
      <PlayerCard variant="filled" layout="shirt" badgeMode="price" name="Salah" shortName="LIV" price={85} position={MID} />,
    );
    expect(document.querySelector('.player-card-price-badge')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Doubtful/)).not.toBeInTheDocument();

    rerender(
      <PlayerCard variant="filled" layout="shirt" badgeMode="status" availabilityStatus="d" chanceOfPlayingNextRound={50} name="Salah" shortName="LIV" price={85} position={MID} />,
    );
    expect(document.querySelector('.player-card-price-badge')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Doubtful, 50% chance of playing')).toBeInTheDocument();
  });

  it('does not show a status badge for a fully available player', () => {
    render(
      <PlayerCard variant="filled" layout="shirt" badgeMode="status" availabilityStatus="a" chanceOfPlayingNextRound={100} name="Salah" shortName="LIV" price={85} position={MID} />,
    );
    expect(document.querySelector('.player-card-status-badge')).not.toBeInTheDocument();
  });

  it('anchors captaincy inside the jersey wrapper and suppresses it on the bench', () => {
    const { container, rerender } = render(
      <PlayerCard variant="filled" layout="shirt" name="Salah" shortName="LIV" position={MID} isStarter isCaptain />,
    );
    expect(container.querySelector('.player-card-shirt-stage .player-card-armband')).toHaveTextContent('C');

    rerender(
      <PlayerCard variant="filled" layout="shirt" name="Salah" shortName="LIV" position={MID} isStarter={false} isCaptain />,
    );
    expect(container.querySelector('.player-card-armband')).not.toBeInTheDocument();
  });
});

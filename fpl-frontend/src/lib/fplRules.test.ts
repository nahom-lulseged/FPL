import { describe, expect, it } from 'vitest';
import { canAddPlayer, SQUAD_SIZE } from '@/lib/fplRules';
import { DEFAULT_PLAYER_STATS, type PlayerListItem } from '@/types/player';

function makePlayer(overrides: Partial<PlayerListItem> = {}): PlayerListItem {
  return {
    id: 'p1',
    name: 'Test Player',
    position: 'MID',
    price: 80,
    isAvailable: true,
    realTeam: { id: 't1', name: 'Arsenal', shortName: 'ARS' },
    ...DEFAULT_PLAYER_STATS,
    ...overrides,
  };
}

describe('canAddPlayer', () => {
  it('allows adding a valid player', () => {
    const result = canAddPlayer([], makePlayer(), 'MID');
    expect(result.ok).toBe(true);
  });

  it('rejects unavailable players', () => {
    const result = canAddPlayer([], makePlayer({ isAvailable: false }), 'MID');
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('Player unavailable');
  });

  it('rejects when over budget', () => {
    const expensive = makePlayer({ price: 1001 });
    const result = canAddPlayer([], expensive, 'MID');
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('You need £0.1m more');
  });

  it('rejects fourth player from same club', () => {
    const selected = [
      makePlayer({ id: '1', realTeam: { id: 't1', name: 'Arsenal', shortName: 'ARS' } }),
      makePlayer({ id: '2', realTeam: { id: 't1', name: 'Arsenal', shortName: 'ARS' } }),
      makePlayer({ id: '3', realTeam: { id: 't1', name: 'Arsenal', shortName: 'ARS' } }),
    ];
    const result = canAddPlayer(selected, makePlayer({ id: '4' }), 'MID');
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('Maximum 3 players per club.');
  });

  it('rejects when position quota is full', () => {
    const selected = Array.from({ length: 5 }, (_, index) =>
      makePlayer({
        id: `def-${index}`,
        position: 'DEF',
        realTeam: { id: `t${index}`, name: `Team ${index}`, shortName: `T${index}` },
      }),
    );
    const result = canAddPlayer(selected, makePlayer({ id: 'extra-def', position: 'DEF' }), 'DEF');
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('You already have 5 defenders.');
  });

  it('rejects wrong position for active slot', () => {
    const result = canAddPlayer([], makePlayer({ position: 'FWD' }), 'MID');
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('Select a MID player');
  });

  it('rejects when squad is full', () => {
    const selected = Array.from({ length: SQUAD_SIZE }, (_, index) =>
      makePlayer({
        id: `p${index}`,
        position: index < 2 ? 'GK' : index < 7 ? 'DEF' : index < 12 ? 'MID' : 'FWD',
        realTeam: { id: `t${index}`, name: `Team ${index}`, shortName: `T${index}` },
      }),
    );
    const result = canAddPlayer(selected, makePlayer({ id: 'extra' }), 'MID');
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('Squad is full');
  });
});

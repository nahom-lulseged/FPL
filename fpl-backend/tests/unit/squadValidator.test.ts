import type { Position } from '@prisma/client';
import {
  assignDefaultLineup,
  validateBudget,
  validateCaptaincy,
  validateFormation,
  validateFullSquad,
  validateMaxPerClub,
  validateSquadComposition,
} from '../../src/modules/teams/squadValidator';
import type { LineupSlot, SquadPlayerInput } from '../../src/modules/teams/teams.types';

function makePlayer(
  id: string,
  position: Position,
  price: number,
  realTeamId: string,
  isAvailable = true,
): SquadPlayerInput {
  return { playerId: id, position, price, realTeamId, isAvailable };
}

function buildValidSquad(): SquadPlayerInput[] {
  return [
    makePlayer('gk1', 'GK', 45, 'club-a'),
    makePlayer('gk2', 'GK', 40, 'club-b'),
    makePlayer('d1', 'DEF', 45, 'club-a'),
    makePlayer('d2', 'DEF', 45, 'club-b'),
    makePlayer('d3', 'DEF', 45, 'club-c'),
    makePlayer('d4', 'DEF', 45, 'club-d'),
    makePlayer('d5', 'DEF', 45, 'club-e'),
    makePlayer('m1', 'MID', 55, 'club-a'),
    makePlayer('m2', 'MID', 55, 'club-b'),
    makePlayer('m3', 'MID', 55, 'club-c'),
    makePlayer('m4', 'MID', 55, 'club-d'),
    makePlayer('m5', 'MID', 55, 'club-e'),
    makePlayer('f1', 'FWD', 60, 'club-c'),
    makePlayer('f2', 'FWD', 60, 'club-d'),
    makePlayer('f3', 'FWD', 60, 'club-e'),
  ];
}

describe('squad validator', () => {
  describe('validateSquadComposition', () => {
    it('accepts a valid 2/5/5/3 squad', () => {
      expect(validateSquadComposition(buildValidSquad())).toEqual({ ok: true });
    });

    it('rejects wrong squad size', () => {
      const players = buildValidSquad().slice(0, 14);
      const result = validateSquadComposition(players);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe('INVALID_SQUAD_SIZE');
      }
    });

    it('rejects duplicate players', () => {
      const players = buildValidSquad();
      players[14] = { ...players[0]! };
      const result = validateSquadComposition(players);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe('DUPLICATE_PLAYERS');
      }
    });

    it('rejects unavailable players', () => {
      const players = buildValidSquad();
      players[0] = makePlayer('gk1', 'GK', 45, 'club-a', false);
      const result = validateSquadComposition(players);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe('PLAYER_UNAVAILABLE');
      }
    });
  });

  describe('validateMaxPerClub', () => {
    it('accepts at most 3 per club', () => {
      expect(validateMaxPerClub(buildValidSquad())).toEqual({ ok: true });
    });

    it('rejects more than 3 from one club', () => {
      const players = buildValidSquad();
      players[12] = makePlayer('f3', 'FWD', 60, 'club-a');
      const result = validateMaxPerClub(players);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe('MAX_PER_CLUB_EXCEEDED');
      }
    });
  });

  describe('validateBudget', () => {
    it('accepts squad within budget', () => {
      expect(validateBudget(buildValidSquad())).toEqual({ ok: true });
    });

    it('rejects squad over budget', () => {
      const players = buildValidSquad().map((p) => ({ ...p, price: 100 }));
      const result = validateBudget(players);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe('BUDGET_EXCEEDED');
      }
    });
  });

  describe('assignDefaultLineup', () => {
    it('assigns a valid 4-4-2 with captain and vice', () => {
      const players = buildValidSquad();
      const lineup = assignDefaultLineup(players);
      const positions = new Map(players.map((p) => [p.playerId, p.position]));

      expect(lineup).toHaveLength(15);
      expect(validateFormation(lineup, positions)).toEqual({ ok: true });
      expect(validateCaptaincy(lineup)).toEqual({ ok: true });
      expect(validateFullSquad(players, lineup)).toEqual({ ok: true });

      const starters = lineup.filter((s) => s.isStarter);
      expect(starters).toHaveLength(11);

      const captains = lineup.filter((s) => s.isCaptain);
      const vices = lineup.filter((s) => s.isViceCaptain);
      expect(captains).toHaveLength(1);
      expect(vices).toHaveLength(1);
      expect(captains[0]!.isStarter).toBe(true);
      expect(vices[0]!.isStarter).toBe(true);
    });

    it('places bench GK at bench order 2', () => {
      const players = buildValidSquad();
      const lineup = assignDefaultLineup(players);
      const benchGk = lineup.find(
        (s) => !s.isStarter && players.find((p) => p.playerId === s.playerId)?.position === 'GK',
      );
      expect(benchGk?.benchOrder).toBe(2);
    });
  });

  describe('validateFormation', () => {
    it('accepts 5-2-3 formation', () => {
      const players = buildValidSquad();
      const positions = new Map(players.map((p) => [p.playerId, p.position]));

      const gks = players.filter((p) => p.position === 'GK');
      const defs = players.filter((p) => p.position === 'DEF');
      const mids = players.filter((p) => p.position === 'MID');
      const fwds = players.filter((p) => p.position === 'FWD');

      const starterIds = new Set([
        gks[0]!.playerId,
        ...defs.slice(0, 5).map((p) => p.playerId),
        ...mids.slice(0, 2).map((p) => p.playerId),
        ...fwds.slice(0, 3).map((p) => p.playerId),
      ]);

      const benchPlayers = players.filter((p) => !starterIds.has(p.playerId));
      const benchOrders = [1, 2, 3, 4];

      const lineup: LineupSlot[] = players.map((p) => {
        const isStarter = starterIds.has(p.playerId);
        if (isStarter) {
          return {
            playerId: p.playerId,
            isStarter: true,
            benchOrder: null,
            isCaptain: false,
            isViceCaptain: false,
          };
        }
        const benchIndex = benchPlayers.findIndex((bp) => bp.playerId === p.playerId);
        return {
          playerId: p.playerId,
          isStarter: false,
          benchOrder: benchOrders[benchIndex]!,
          isCaptain: false,
          isViceCaptain: false,
        };
      });

      expect(validateFormation(lineup, positions)).toEqual({ ok: true });
    });

    it('rejects invalid formation', () => {
      const players = buildValidSquad();
      const lineup = assignDefaultLineup(players);
      const positions = new Map(players.map((p) => [p.playerId, p.position]));

      const invalid: LineupSlot[] = lineup.map((s) => ({
        ...s,
        isStarter: s.playerId === 'd5' ? true : s.isStarter,
      }));
      const benchSlot = invalid.find((s) => s.playerId === 'm5')!;
      benchSlot.isStarter = false;
      benchSlot.benchOrder = 4;

      const result = validateFormation(invalid, positions);
      expect(result.ok).toBe(false);
    });
  });

  describe('validateCaptaincy', () => {
    it('rejects captain on bench', () => {
      const players = buildValidSquad();
      const lineup = assignDefaultLineup(players);
      const captain = lineup.find((s) => s.isCaptain)!;
      captain.isStarter = false;
      captain.benchOrder = 1;

      const result = validateCaptaincy(lineup);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe('CAPTAIN_NOT_STARTER');
      }
    });
  });
});

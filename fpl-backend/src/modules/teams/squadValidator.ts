import type { Position } from '@prisma/client';
import {
  BENCH_SIZE,
  BUDGET_TENTHS,
  DEFAULT_FORMATION,
  MAX_PLAYERS_PER_CLUB,
  POSITION_LIMITS,
  SQUAD_SIZE,
  STARTING_XI_SIZE,
  VALID_FORMATIONS,
} from '../../lib/constants';
import type { LineupSlot, SquadPlayerInput, ValidationResult } from './teams.types';

function fail(code: string, message: string): ValidationResult {
  return { ok: false, code, message };
}

function countByPosition(players: SquadPlayerInput[]): Record<Position, number> {
  return players.reduce(
    (acc, p) => {
      acc[p.position]++;
      return acc;
    },
    { GK: 0, DEF: 0, MID: 0, FWD: 0 } as Record<Position, number>,
  );
}

export function validateSquadComposition(players: SquadPlayerInput[]): ValidationResult {
  if (players.length !== SQUAD_SIZE) {
    return fail('INVALID_SQUAD_SIZE', `Squad must contain exactly ${SQUAD_SIZE} players`);
  }

  const ids = new Set(players.map((p) => p.playerId));
  if (ids.size !== SQUAD_SIZE) {
    return fail('DUPLICATE_PLAYERS', 'Squad cannot contain duplicate players');
  }

  const counts = countByPosition(players);
  for (const [position, limit] of Object.entries(POSITION_LIMITS) as [Position, number][]) {
    if (counts[position] !== limit) {
      return fail(
        'INVALID_POSITION_COUNTS',
        `Squad must have ${limit} ${position} players (found ${counts[position]})`,
      );
    }
  }

  for (const player of players) {
    if (!player.isAvailable) {
      return fail('PLAYER_UNAVAILABLE', `Player ${player.playerId} is not available`);
    }
  }

  return { ok: true };
}

export function validateMaxPerClub(players: SquadPlayerInput[]): ValidationResult {
  const clubCounts = new Map<string, number>();
  for (const player of players) {
    const count = (clubCounts.get(player.realTeamId) ?? 0) + 1;
    if (count > MAX_PLAYERS_PER_CLUB) {
      return fail(
        'MAX_PER_CLUB_EXCEEDED',
        `Maximum ${MAX_PLAYERS_PER_CLUB} players per club exceeded`,
      );
    }
    clubCounts.set(player.realTeamId, count);
  }
  return { ok: true };
}

export function validateBudget(players: SquadPlayerInput[]): ValidationResult {
  const total = players.reduce((sum, p) => sum + p.price, 0);
  if (total > BUDGET_TENTHS) {
    return fail(
      'BUDGET_EXCEEDED',
      `Squad cost ${total} exceeds budget of ${BUDGET_TENTHS}`,
    );
  }
  return { ok: true };
}

function validateLineupStructure(lineup: LineupSlot[]): ValidationResult {
  if (lineup.length !== SQUAD_SIZE) {
    return fail('INVALID_LINEUP_SIZE', `Lineup must contain exactly ${SQUAD_SIZE} players`);
  }

  const starters = lineup.filter((s) => s.isStarter);
  const bench = lineup.filter((s) => !s.isStarter);

  if (starters.length !== STARTING_XI_SIZE) {
    return fail(
      'INVALID_STARTER_COUNT',
      `Starting XI must have exactly ${STARTING_XI_SIZE} players`,
    );
  }

  if (bench.length !== BENCH_SIZE) {
    return fail('INVALID_BENCH_COUNT', `Bench must have exactly ${BENCH_SIZE} players`);
  }

  for (const slot of starters) {
    if (slot.benchOrder !== null) {
      return fail('STARTER_BENCH_ORDER', 'Starters must not have a bench order');
    }
  }

  for (const slot of bench) {
    if (slot.benchOrder === null) {
      return fail('BENCH_ORDER_REQUIRED', 'Bench players must have a bench order');
    }
  }

  const benchOrders = bench.map((s) => s.benchOrder!);
  const uniqueOrders = new Set(benchOrders);
  if (uniqueOrders.size !== BENCH_SIZE) {
    return fail('DUPLICATE_BENCH_ORDER', 'Bench orders must be unique values 1–4');
  }
  for (const order of benchOrders) {
    if (order < 1 || order > BENCH_SIZE) {
      return fail('INVALID_BENCH_ORDER', 'Bench order must be between 1 and 4');
    }
  }

  return { ok: true };
}

export function validateFormation(
  lineup: LineupSlot[],
  positions: Map<string, Position>,
): ValidationResult {
  const structure = validateLineupStructure(lineup);
  if (!structure.ok) {
    return structure;
  }

  const starters = lineup.filter((s) => s.isStarter);
  const starterPositions = starters.map((s) => positions.get(s.playerId));

  if (starterPositions.some((p) => p === undefined)) {
    return fail('MISSING_POSITIONS', 'All starters must have a position');
  }

  const resolved = starterPositions as Position[];
  const gkCount = resolved.filter((p) => p === 'GK').length;
  if (gkCount !== 1) {
    return fail('INVALID_GK_COUNT', 'Starting XI must have exactly 1 goalkeeper');
  }

  const def = resolved.filter((p) => p === 'DEF').length;
  const mid = resolved.filter((p) => p === 'MID').length;
  const fwd = resolved.filter((p) => p === 'FWD').length;

  const valid = VALID_FORMATIONS.some((f) => f.def === def && f.mid === mid && f.fwd === fwd);
  if (!valid) {
    return fail('INVALID_FORMATION', `Formation ${def}-${mid}-${fwd} is not valid`);
  }

  return { ok: true };
}

export function isValidStarterFormation(
  starterIds: string[],
  positions: Map<string, Position>,
): boolean {
  if (starterIds.length !== STARTING_XI_SIZE) {
    return false;
  }

  const resolved = starterIds.map((id) => positions.get(id));
  if (resolved.some((p) => p === undefined)) {
    return false;
  }

  const pos = resolved as Position[];
  const gkCount = pos.filter((p) => p === 'GK').length;
  if (gkCount !== 1) {
    return false;
  }

  const def = pos.filter((p) => p === 'DEF').length;
  const mid = pos.filter((p) => p === 'MID').length;
  const fwd = pos.filter((p) => p === 'FWD').length;

  return VALID_FORMATIONS.some((f) => f.def === def && f.mid === mid && f.fwd === fwd);
}

export function validateCaptaincy(lineup: LineupSlot[]): ValidationResult {
  const captains = lineup.filter((s) => s.isCaptain);
  const vices = lineup.filter((s) => s.isViceCaptain);

  if (captains.length !== 1) {
    return fail('INVALID_CAPTAIN_COUNT', 'Squad must have exactly one captain');
  }

  if (vices.length !== 1) {
    return fail('INVALID_VICE_COUNT', 'Squad must have exactly one vice-captain');
  }

  const captain = captains[0]!;
  const vice = vices[0]!;

  if (captain.playerId === vice.playerId) {
    return fail('SAME_CAPTAIN_VICE', 'Captain and vice-captain must be different players');
  }

  if (!captain.isStarter) {
    return fail('CAPTAIN_NOT_STARTER', 'Captain must be in the starting XI');
  }

  if (!vice.isStarter) {
    return fail('VICE_NOT_STARTER', 'Vice-captain must be in the starting XI');
  }

  return { ok: true };
}

export function assignDefaultLineup(players: SquadPlayerInput[]): LineupSlot[] {
  const byPosition = (pos: Position) =>
    players.filter((p) => p.position === pos).sort((a, b) => a.price - b.price);

  const gks = byPosition('GK');
  const defs = byPosition('DEF');
  const mids = byPosition('MID');
  const fwds = byPosition('FWD');

  const starterGk = gks[0]!;
  const benchGk = gks[1]!;

  const { def, mid, fwd } = DEFAULT_FORMATION;
  const starterDefs = defs.slice(0, def);
  const benchDefs = defs.slice(def);
  const starterMids = mids.slice(0, mid);
  const benchMids = mids.slice(mid);
  const starterFwds = fwds.slice(0, fwd);
  const benchFwds = fwds.slice(fwd);

  const starters = [starterGk, ...starterDefs, ...starterMids, ...starterFwds];
  const benchOutfield = [...benchDefs, ...benchMids, ...benchFwds];

  const outfieldStarters = starters.filter((p) => p.position !== 'GK');
  const sortedOutfield = [...outfieldStarters].sort((a, b) => b.price - a.price);
  const captainId = sortedOutfield[0]!.playerId;
  const viceCaptainId = sortedOutfield[1]!.playerId;

  const benchSlots: { playerId: string; benchOrder: number }[] = [];
  if (benchOutfield[0]) {
    benchSlots.push({ playerId: benchOutfield[0].playerId, benchOrder: 1 });
  }
  benchSlots.push({ playerId: benchGk.playerId, benchOrder: 2 });
  if (benchOutfield[1]) {
    benchSlots.push({ playerId: benchOutfield[1].playerId, benchOrder: 3 });
  }
  if (benchOutfield[2]) {
    benchSlots.push({ playerId: benchOutfield[2].playerId, benchOrder: 4 });
  }

  const starterIds = new Set(starters.map((p) => p.playerId));
  const benchOrderMap = new Map(benchSlots.map((b) => [b.playerId, b.benchOrder]));

  return players.map((p) => ({
    playerId: p.playerId,
    isStarter: starterIds.has(p.playerId),
    benchOrder: benchOrderMap.get(p.playerId) ?? null,
    isCaptain: p.playerId === captainId,
    isViceCaptain: p.playerId === viceCaptainId,
  }));
}

export function validateFullSquad(
  players: SquadPlayerInput[],
  lineup: LineupSlot[],
): ValidationResult {
  const composition = validateSquadComposition(players);
  if (!composition.ok) return composition;

  const club = validateMaxPerClub(players);
  if (!club.ok) return club;

  const budget = validateBudget(players);
  if (!budget.ok) return budget;

  const positions = new Map(players.map((p) => [p.playerId, p.position]));
  const formation = validateFormation(lineup, positions);
  if (!formation.ok) return formation;

  const captaincy = validateCaptaincy(lineup);
  if (!captaincy.ok) return captaincy;

  return { ok: true };
}

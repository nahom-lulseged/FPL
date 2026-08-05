import {
  BENCH_SIZE,
  DEFAULT_FORMATION,
  STARTING_XI_SIZE,
  SQUAD_SIZE,
  VALID_FORMATIONS,
  validateCaptaincy,
  validateFormation,
  type Formation,
  type LineupSlot,
} from '@/lib/fplRules';
import type { PlayerListItem, Position } from '@/types/player';

export type SwapResult =
  | { ok: true; lineup: LineupSlot[] }
  | { ok: false; reason: string };

function playerMap(players: PlayerListItem[]): Map<string, PlayerListItem> {
  return new Map(players.map((player) => [player.id, player]));
}

function positionsFromPlayers(players: PlayerListItem[]): Map<string, Position> {
  return new Map(players.map((player) => [player.id, player.position]));
}

function cloneLineup(lineup: LineupSlot[]): LineupSlot[] {
  return lineup.map((slot) => ({ ...slot }));
}

function sortByPointsThenPrice(a: PlayerListItem, b: PlayerListItem): number {
  return b.totalPoints - a.totalPoints || b.price - a.price || a.name.localeCompare(b.name);
}

function sortByPriceAsc(a: PlayerListItem, b: PlayerListItem): number {
  return a.price - b.price || a.totalPoints - b.totalPoints || a.name.localeCompare(b.name);
}

function starterCounts(
  lineup: LineupSlot[],
  positions: Map<string, Position>,
): Record<Position, number> {
  const counts: Record<Position, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  for (const slot of lineup) {
    if (!slot.isStarter) {
      continue;
    }
    const position = positions.get(slot.playerId);
    if (position) {
      counts[position]++;
    }
  }
  return counts;
}

function normalizeBenchOrders(lineup: LineupSlot[], positions: Map<string, Position>): LineupSlot[] {
  const next = cloneLineup(lineup);
  const bench = next.filter((slot) => !slot.isStarter);
  const gk = bench.find((slot) => positions.get(slot.playerId) === 'GK');
  const outfield = bench
    .filter((slot) => positions.get(slot.playerId) !== 'GK')
    .sort((a, b) => (a.benchOrder ?? 99) - (b.benchOrder ?? 99));

  const ordered: LineupSlot[] = [];
  if (gk) {
    ordered.push(gk);
  }
  ordered.push(...outfield);

  ordered.forEach((slot, index) => {
    slot.benchOrder = index + 1;
    slot.isStarter = false;
  });

  for (const slot of next) {
    if (slot.isStarter) {
      slot.benchOrder = null;
    }
  }

  return next;
}

function ensureCaptaincy(lineup: LineupSlot[], players: PlayerListItem[]): LineupSlot[] {
  const next = cloneLineup(lineup);
  const byId = playerMap(players);
  const starters = next.filter((slot) => slot.isStarter);
  const outfield = starters
    .filter((slot) => byId.get(slot.playerId)?.position !== 'GK')
    .sort((a, b) => {
      const pa = byId.get(a.playerId)!;
      const pb = byId.get(b.playerId)!;
      return sortByPointsThenPrice(pa, pb);
    });

  let captain = next.find((slot) => slot.isCaptain);
  let vice = next.find((slot) => slot.isViceCaptain);

  if (!captain?.isStarter || captain.playerId === vice?.playerId) {
    for (const slot of next) {
      slot.isCaptain = false;
    }
    if (outfield[0]) {
      const cap = next.find((slot) => slot.playerId === outfield[0].playerId)!;
      cap.isCaptain = true;
      captain = cap;
    }
  }

  if (!vice?.isStarter || vice.playerId === captain?.playerId) {
    for (const slot of next) {
      slot.isViceCaptain = false;
    }
    const viceCandidate = outfield.find((slot) => slot.playerId !== captain?.playerId);
    if (viceCandidate) {
      const v = next.find((slot) => slot.playerId === viceCandidate.playerId)!;
      v.isViceCaptain = true;
    }
  }

  return next;
}

function isValidLineup(lineup: LineupSlot[], players: PlayerListItem[]): boolean {
  if (lineup.length !== SQUAD_SIZE) {
    return false;
  }
  const positions = positionsFromPlayers(players);
  const formation = validateFormation(lineup, positions);
  if (!formation.ok) {
    return false;
  }
  const captaincy = validateCaptaincy(lineup);
  if (!captaincy.ok) {
    return false;
  }
  const bench = lineup.filter((slot) => !slot.isStarter);
  if (bench.length !== BENCH_SIZE) {
    return false;
  }
  const benchGk = bench.filter((slot) => positions.get(slot.playerId) === 'GK');
  if (benchGk.length !== 1) {
    return false;
  }
  return true;
}

/**
 * Swap two players between pitch/bench (or two on pitch). Enforces formation + bench GK.
 */
export function swapLineupSlots(
  lineup: LineupSlot[],
  aId: string,
  bId: string,
  players: PlayerListItem[],
  _formation: Formation,
): SwapResult {
  if (aId === bId) {
    return { ok: false, reason: 'Select a different player to swap' };
  }

  const next = cloneLineup(lineup);
  const a = next.find((slot) => slot.playerId === aId);
  const b = next.find((slot) => slot.playerId === bId);
  if (!a || !b) {
    return { ok: false, reason: 'Player not in squad' };
  }

  const aStarter = a.isStarter;
  const aBench = a.benchOrder;
  const aCap = a.isCaptain;
  const aVice = a.isViceCaptain;

  a.isStarter = b.isStarter;
  a.benchOrder = b.benchOrder;
  a.isCaptain = b.isCaptain;
  a.isViceCaptain = b.isViceCaptain;

  b.isStarter = aStarter;
  b.benchOrder = aBench;
  b.isCaptain = aCap;
  b.isViceCaptain = aVice;

  for (const slot of next) {
    if (!slot.isStarter) {
      slot.isCaptain = false;
      slot.isViceCaptain = false;
    }
  }

  const positions = positionsFromPlayers(players);
  const normalized = normalizeBenchOrders(next, positions);
  const withCaps = ensureCaptaincy(normalized, players);

  if (!isValidLineup(withCaps, players)) {
    const formationCheck = validateFormation(withCaps, positions);
    if (!formationCheck.ok) {
      return {
        ok: false,
        reason: formationCheck.message ?? 'That swap would break your formation',
      };
    }
    const benchGk = withCaps.filter(
      (slot) => !slot.isStarter && positions.get(slot.playerId) === 'GK',
    );
    if (benchGk.length !== 1) {
      return { ok: false, reason: 'Bench must keep exactly one goalkeeper' };
    }
    return { ok: false, reason: 'Invalid swap for the current formation' };
  }

  return { ok: true, lineup: withCaps };
}

export function setCaptainInPlace(lineup: LineupSlot[], playerId: string): SwapResult {
  const slot = lineup.find((s) => s.playerId === playerId);
  if (!slot?.isStarter) {
    return { ok: false, reason: 'Captain must be a starter' };
  }

  const next = cloneLineup(lineup);
  for (const entry of next) {
    if (entry.playerId === playerId) {
      entry.isCaptain = true;
      entry.isViceCaptain = false;
    } else if (entry.isCaptain) {
      entry.isCaptain = false;
    }
  }

  const vice = next.find((s) => s.isViceCaptain);
  if (!vice) {
    const other = next.find((s) => s.isStarter && s.playerId !== playerId && !s.isCaptain);
    if (other) {
      other.isViceCaptain = true;
    }
  }

  return { ok: true, lineup: next };
}

export function setViceCaptainInPlace(lineup: LineupSlot[], playerId: string): SwapResult {
  const slot = lineup.find((s) => s.playerId === playerId);
  if (!slot?.isStarter) {
    return { ok: false, reason: 'Vice-captain must be a starter' };
  }
  if (slot.isCaptain) {
    return { ok: false, reason: 'Captain and vice-captain must be different players' };
  }

  const next = cloneLineup(lineup);
  for (const entry of next) {
    entry.isViceCaptain = entry.playerId === playerId;
  }

  return { ok: true, lineup: next };
}

export function reflowForFormation(
  lineup: LineupSlot[],
  players: PlayerListItem[],
  nextFormation: Formation,
): LineupSlot[] {
  const byId = playerMap(players);
  const positions = positionsFromPlayers(players);
  let next = cloneLineup(lineup);

  const target: Record<Position, number> = {
    GK: 1,
    DEF: nextFormation.def,
    MID: nextFormation.mid,
    FWD: nextFormation.fwd,
  };

  for (const position of ['DEF', 'MID', 'FWD', 'GK'] as Position[]) {
    while (starterCounts(next, positions)[position] > target[position]) {
      const excess = next
        .filter((slot) => slot.isStarter && positions.get(slot.playerId) === position)
        .sort((a, b) => sortByPriceAsc(byId.get(a.playerId)!, byId.get(b.playerId)!));
      const demote = excess[excess.length - 1];
      if (!demote) {
        break;
      }
      demote.isStarter = false;
      demote.isCaptain = false;
      demote.isViceCaptain = false;
      demote.benchOrder = 99;
    }
  }

  for (const position of ['GK', 'DEF', 'MID', 'FWD'] as Position[]) {
    while (starterCounts(next, positions)[position] < target[position]) {
      const candidates = next
        .filter((slot) => !slot.isStarter && positions.get(slot.playerId) === position)
        .sort((a, b) => sortByPointsThenPrice(byId.get(a.playerId)!, byId.get(b.playerId)!));
      const promote = candidates[0];
      if (!promote) {
        break;
      }
      promote.isStarter = true;
      promote.benchOrder = null;
    }
  }

  next = normalizeBenchOrders(next, positions);
  return ensureCaptaincy(next, players);
}

export function autoFillLineup(
  players: PlayerListItem[],
  formation: Formation = DEFAULT_FORMATION,
): LineupSlot[] {
  if (players.length !== SQUAD_SIZE) {
    throw new Error(`autoFillLineup requires ${SQUAD_SIZE} players`);
  }

  const byPosition: Record<Position, PlayerListItem[]> = {
    GK: [],
    DEF: [],
    MID: [],
    FWD: [],
  };
  for (const player of players) {
    byPosition[player.position].push(player);
  }
  for (const position of Object.keys(byPosition) as Position[]) {
    byPosition[position].sort(sortByPointsThenPrice);
  }

  const starters: PlayerListItem[] = [
    ...byPosition.GK.slice(0, 1),
    ...byPosition.DEF.slice(0, formation.def),
    ...byPosition.MID.slice(0, formation.mid),
    ...byPosition.FWD.slice(0, formation.fwd),
  ];
  const starterIds = new Set(starters.map((player) => player.id));
  const benchPlayers = players.filter((player) => !starterIds.has(player.id));
  const benchGk = benchPlayers.filter((player) => player.position === 'GK');
  const benchOut = benchPlayers
    .filter((player) => player.position !== 'GK')
    .sort(sortByPointsThenPrice);
  const benchOrdered = [...benchGk, ...benchOut].slice(0, BENCH_SIZE);

  const outfieldStarters = starters
    .filter((player) => player.position !== 'GK')
    .sort(sortByPointsThenPrice);
  const captainId = outfieldStarters[0]?.id ?? starters[0]!.id;
  const viceId =
    outfieldStarters.find((player) => player.id !== captainId)?.id ??
    starters.find((player) => player.id !== captainId)!.id;

  return players.map((player) => {
    const isStarter = starterIds.has(player.id);
    const benchIndex = benchOrdered.findIndex((entry) => entry.id === player.id);
    return {
      playerId: player.id,
      isStarter,
      benchOrder: isStarter ? null : benchIndex + 1,
      isCaptain: player.id === captainId,
      isViceCaptain: player.id === viceId,
    };
  });
}

export function reorderBench(
  lineup: LineupSlot[],
  players: PlayerListItem[],
  playerId: string,
  direction: 'up' | 'down',
): SwapResult {
  const positions = positionsFromPlayers(players);
  const next = normalizeBenchOrders(cloneLineup(lineup), positions);
  const bench = next
    .filter((slot) => !slot.isStarter)
    .sort((a, b) => (a.benchOrder ?? 0) - (b.benchOrder ?? 0));

  const index = bench.findIndex((slot) => slot.playerId === playerId);
  if (index < 0) {
    return { ok: false, reason: 'Player is not on the bench' };
  }

  if (positions.get(playerId) === 'GK') {
    return { ok: false, reason: 'Backup goalkeeper stays in bench slot 1' };
  }

  const swapWith = direction === 'up' ? index - 1 : index + 1;
  if (swapWith < 1 || swapWith >= bench.length) {
    return { ok: false, reason: 'Cannot move further' };
  }
  if (positions.get(bench[swapWith]!.playerId) === 'GK') {
    return { ok: false, reason: 'Cannot swap with the backup goalkeeper slot' };
  }

  const orderA = bench[index]!.benchOrder;
  const orderB = bench[swapWith]!.benchOrder;
  bench[index]!.benchOrder = orderB;
  bench[swapWith]!.benchOrder = orderA;

  return { ok: true, lineup: next };
}

export function getPickTeamErrors(lineup: LineupSlot[], players: PlayerListItem[]): string[] {
  const errors: string[] = [];
  const positions = positionsFromPlayers(players);

  if (lineup.length !== SQUAD_SIZE) {
    errors.push(`Squad must contain exactly ${SQUAD_SIZE} players`);
    return errors;
  }

  const starters = lineup.filter((slot) => slot.isStarter);
  const bench = lineup.filter((slot) => !slot.isStarter);
  if (starters.length !== STARTING_XI_SIZE) {
    errors.push(`Starting XI must have exactly ${STARTING_XI_SIZE} players`);
  }
  if (bench.length !== BENCH_SIZE) {
    errors.push(`Bench must have exactly ${BENCH_SIZE} players`);
  }

  const formation = validateFormation(lineup, positions);
  if (!formation.ok && formation.message) {
    errors.push(formation.message);
  }

  const captaincy = validateCaptaincy(lineup);
  if (!captaincy.ok && captaincy.message) {
    errors.push(captaincy.message);
  }

  const benchGk = bench.filter((slot) => positions.get(slot.playerId) === 'GK');
  if (benchGk.length !== 1) {
    errors.push('Bench must include exactly one goalkeeper');
  }

  return errors;
}

export function detectFormationFromLineup(
  lineup: LineupSlot[],
  players: PlayerListItem[],
): Formation {
  const positions = positionsFromPlayers(players);
  const counts = starterCounts(lineup, positions);
  const match = VALID_FORMATIONS.find(
    (formation) =>
      formation.def === counts.DEF && formation.mid === counts.MID && formation.fwd === counts.FWD,
  );
  return match ?? DEFAULT_FORMATION;
}

export function lineupFromSquadEntries(
  entries: Array<{
    playerId: string;
    isStarter: boolean;
    benchOrder: number | null;
    isCaptain: boolean;
    isViceCaptain: boolean;
  }>,
): LineupSlot[] {
  return entries.map((entry) => ({
    playerId: entry.playerId,
    isStarter: entry.isStarter,
    benchOrder: entry.benchOrder,
    isCaptain: entry.isCaptain,
    isViceCaptain: entry.isViceCaptain,
  }));
}

export function isLineupDirty(draft: LineupSlot[], saved: LineupSlot[]): boolean {
  if (draft.length !== saved.length) {
    return true;
  }
  const savedMap = new Map(saved.map((slot) => [slot.playerId, slot]));
  return draft.some((slot) => {
    const other = savedMap.get(slot.playerId);
    if (!other) {
      return true;
    }
    return (
      slot.isStarter !== other.isStarter ||
      slot.benchOrder !== other.benchOrder ||
      slot.isCaptain !== other.isCaptain ||
      slot.isViceCaptain !== other.isViceCaptain
    );
  });
}

import type { PlayerListItem, Position } from '@/types/player';

export const SQUAD_SIZE = 15;
export const STARTING_XI_SIZE = 11;
export const BENCH_SIZE = 4;
export const BUDGET_TENTHS = 1000;
export const MAX_PLAYERS_PER_CLUB = 3;

export const POSITION_LIMITS: Record<Position, number> = {
  GK: 2,
  DEF: 5,
  MID: 5,
  FWD: 3,
};

export interface Formation {
  def: number;
  mid: number;
  fwd: number;
}

export const VALID_FORMATIONS: Formation[] = [
  { def: 3, mid: 4, fwd: 3 },
  { def: 3, mid: 5, fwd: 2 },
  { def: 4, mid: 3, fwd: 3 },
  { def: 4, mid: 4, fwd: 2 },
  { def: 4, mid: 5, fwd: 1 },
  { def: 5, mid: 3, fwd: 2 },
  { def: 5, mid: 4, fwd: 1 },
  { def: 5, mid: 2, fwd: 3 },
];

export const DEFAULT_FORMATION: Formation = { def: 4, mid: 4, fwd: 2 };

export interface SquadPlayerInput {
  playerId: string;
  position: Position;
  price: number;
  realTeamId: string;
  isAvailable: boolean;
}

export interface LineupSlot {
  playerId: string;
  isStarter: boolean;
  benchOrder: number | null;
  isCaptain: boolean;
  isViceCaptain: boolean;
}

export interface ValidationResult {
  ok: boolean;
  code?: string;
  message?: string;
}

function fail(code: string, message: string): ValidationResult {
  return { ok: false, code, message };
}

function toSquadPlayerInput(player: PlayerListItem): SquadPlayerInput {
  return {
    playerId: player.id,
    position: player.position,
    price: player.price,
    realTeamId: player.realTeam.id,
    isAvailable: player.isAvailable,
  };
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

export function getSquadSpend(players: PlayerListItem[]): number {
  return players.reduce((sum, p) => sum + p.price, 0);
}

export function getRemainingBudget(players: PlayerListItem[]): number {
  return BUDGET_TENTHS - getSquadSpend(players);
}

export function getClubCounts(players: PlayerListItem[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const player of players) {
    const id = player.realTeam.id;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

export function getPositionCounts(players: PlayerListItem[]): Record<Position, number> {
  return countByPosition(players.map(toSquadPlayerInput));
}

export function formationLabel(formation: Formation): string {
  return `${formation.def}-${formation.mid}-${formation.fwd}`;
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
    return fail('BUDGET_EXCEEDED', `Squad cost exceeds budget of £${BUDGET_TENTHS / 10}m`);
  }
  return { ok: true };
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

export function validateFormation(
  lineup: LineupSlot[],
  positions: Map<string, Position>,
): ValidationResult {
  const starters = lineup.filter((s) => s.isStarter);
  if (starters.length !== STARTING_XI_SIZE) {
    return fail('INVALID_STARTER_COUNT', `Starting XI must have exactly ${STARTING_XI_SIZE} players`);
  }

  const resolved = starters.map((s) => positions.get(s.playerId));
  if (resolved.some((p) => p === undefined)) {
    return fail('MISSING_POSITIONS', 'All starters must have a position');
  }

  const pos = resolved as Position[];
  const gkCount = pos.filter((p) => p === 'GK').length;
  if (gkCount !== 1) {
    return fail('INVALID_GK_COUNT', 'Starting XI must have exactly 1 goalkeeper');
  }

  const def = pos.filter((p) => p === 'DEF').length;
  const mid = pos.filter((p) => p === 'MID').length;
  const fwd = pos.filter((p) => p === 'FWD').length;

  const valid = VALID_FORMATIONS.some((f) => f.def === def && f.mid === mid && f.fwd === fwd);
  if (!valid) {
    return fail('INVALID_FORMATION', `Formation ${def}-${mid}-${fwd} is not valid`);
  }

  return { ok: true };
}

export function assignLineupForFormation(
  players: PlayerListItem[],
  formation: Formation,
  captainId?: string | null,
  viceCaptainId?: string | null,
): LineupSlot[] {
  const squadPlayers = players.map(toSquadPlayerInput);

  // Premiums start; cheapest fill the bench.
  const byPosition = (pos: Position) =>
    squadPlayers.filter((p) => p.position === pos).sort((a, b) => b.price - a.price);

  const gks = byPosition('GK');
  const defs = byPosition('DEF');
  const mids = byPosition('MID');
  const fwds = byPosition('FWD');

  const starterGk = gks[0]!;
  const benchGk = gks[1]!;

  const { def, mid, fwd } = formation;
  const starterDefs = defs.slice(0, def);
  const benchDefs = defs.slice(def);
  const starterMids = mids.slice(0, mid);
  const benchMids = mids.slice(mid);
  const starterFwds = fwds.slice(0, fwd);
  const benchFwds = fwds.slice(fwd);

  const starters = [starterGk, ...starterDefs, ...starterMids, ...starterFwds];
  const benchOutfield = [...benchDefs, ...benchMids, ...benchFwds].sort(
    (a, b) => b.price - a.price,
  );

  const outfieldStarters = starters.filter((p) => p.position !== 'GK');
  const sortedOutfield = [...outfieldStarters].sort((a, b) => b.price - a.price);
  const resolvedCaptainId = captainId ?? sortedOutfield[0]!.playerId;
  const resolvedViceId =
    viceCaptainId ??
    (sortedOutfield.find((p) => p.playerId !== resolvedCaptainId)?.playerId ??
      sortedOutfield[1]!.playerId);

  // Slot 12 = backup GK, then highest-value remaining outfielders.
  const benchSlots: { playerId: string; benchOrder: number }[] = [
    { playerId: benchGk.playerId, benchOrder: 1 },
  ];
  if (benchOutfield[0]) {
    benchSlots.push({ playerId: benchOutfield[0].playerId, benchOrder: 2 });
  }
  if (benchOutfield[1]) {
    benchSlots.push({ playerId: benchOutfield[1].playerId, benchOrder: 3 });
  }
  if (benchOutfield[2]) {
    benchSlots.push({ playerId: benchOutfield[2].playerId, benchOrder: 4 });
  }

  const starterIds = new Set(starters.map((p) => p.playerId));
  const benchOrderMap = new Map(benchSlots.map((b) => [b.playerId, b.benchOrder]));

  return squadPlayers.map((p) => ({
    playerId: p.playerId,
    isStarter: starterIds.has(p.playerId),
    benchOrder: benchOrderMap.get(p.playerId) ?? null,
    isCaptain: p.playerId === resolvedCaptainId,
    isViceCaptain: p.playerId === resolvedViceId,
  }));
}

export function validateFullSquad(
  players: PlayerListItem[],
  lineup: LineupSlot[],
): ValidationResult {
  const squadPlayers = players.map(toSquadPlayerInput);

  const composition = validateSquadComposition(squadPlayers);
  if (!composition.ok) return composition;

  const club = validateMaxPerClub(squadPlayers);
  if (!club.ok) return club;

  const budget = validateBudget(squadPlayers);
  if (!budget.ok) return budget;

  const positions = new Map(squadPlayers.map((p) => [p.playerId, p.position]));
  const formation = validateFormation(lineup, positions);
  if (!formation.ok) return formation;

  const captaincy = validateCaptaincy(lineup);
  if (!captaincy.ok) return captaincy;

  return { ok: true };
}

const POSITION_PLURAL: Record<Position, string> = {
  GK: 'goalkeepers',
  DEF: 'defenders',
  MID: 'midfielders',
  FWD: 'forwards',
};

export function canAddPlayer(
  selected: PlayerListItem[],
  player: PlayerListItem,
  activePosition?: Position | null,
): { ok: boolean; reason?: string } {
  if (!player.isAvailable) {
    return { ok: false, reason: 'Player unavailable' };
  }

  if (selected.some((p) => p.id === player.id)) {
    return { ok: false, reason: 'Already in squad' };
  }

  if (selected.length >= SQUAD_SIZE) {
    return { ok: false, reason: 'Squad is full' };
  }

  if (activePosition && player.position !== activePosition) {
    return { ok: false, reason: `Select a ${activePosition} player` };
  }

  const positionCounts = getPositionCounts(selected);
  const positionLimit = POSITION_LIMITS[player.position];
  if (positionCounts[player.position] >= positionLimit) {
    return {
      ok: false,
      reason: `You already have ${positionLimit} ${POSITION_PLURAL[player.position]}.`,
    };
  }

  const clubCounts = getClubCounts(selected);
  const clubCount = clubCounts.get(player.realTeam.id) ?? 0;
  if (clubCount >= MAX_PLAYERS_PER_CLUB) {
    return { ok: false, reason: 'Maximum 3 players per club.' };
  }

  const remaining = getRemainingBudget(selected);
  if (player.price > remaining) {
    const shortfall = player.price - remaining;
    return {
      ok: false,
      reason: `You need £${(shortfall / 10).toFixed(1)}m more`,
    };
  }

  return { ok: true };
}

export function getValidationErrors(
  players: PlayerListItem[],
  lineup: LineupSlot[],
): string[] {
  const errors: string[] = [];
  const squadPlayers = players.map(toSquadPlayerInput);

  if (players.length < SQUAD_SIZE) {
    errors.push(`Select ${SQUAD_SIZE - players.length} more player(s)`);
    return errors;
  }

  for (const validator of [validateSquadComposition, validateMaxPerClub, validateBudget]) {
    const result = validator(squadPlayers);
    if (!result.ok && result.message) {
      errors.push(result.message);
    }
  }

  const positions = new Map(squadPlayers.map((p) => [p.playerId, p.position]));
  const formation = validateFormation(lineup, positions);
  if (!formation.ok && formation.message) {
    errors.push(formation.message);
  }

  const captaincy = validateCaptaincy(lineup);
  if (!captaincy.ok && captaincy.message) {
    errors.push(captaincy.message);
  }

  return errors;
}

export const MAX_FREE_TRANSFERS = 2;
export const TRANSFER_HIT_POINTS = 4;

export { isUnlimitedTransferChip, WILDCARD_SECOND_HALF_START_GW } from '@/lib/chipMeta';

export function calculateTransferHit(
  transferCount: number,
  freeTransfersAvailable: number,
  isWildcardActive = false,
): number {
  if (isWildcardActive) {
    return 0;
  }
  const paidTransfers = Math.max(0, transferCount - freeTransfersAvailable);
  return paidTransfers * TRANSFER_HIT_POINTS;
}

export function deductFreeTransfers(
  current: number,
  transferCount: number,
  isWildcardActive = false,
): number {
  if (isWildcardActive) {
    return current;
  }
  return Math.max(0, current - transferCount);
}

export interface TransferSquadEntry {
  playerId: string;
  position: Position;
  price: number;
  realTeamId: string;
  isAvailable: boolean;
  isCaptain: boolean;
  isViceCaptain: boolean;
}

export function squadEntryToTransferInput(entry: {
  playerId: string;
  position: Position;
  player: { price: number; realTeam: { id: string } };
  isCaptain: boolean;
  isViceCaptain: boolean;
}): TransferSquadEntry {
  return {
    playerId: entry.playerId,
    position: entry.position,
    price: entry.player.price,
    realTeamId: entry.player.realTeam.id,
    isAvailable: true,
    isCaptain: entry.isCaptain,
    isViceCaptain: entry.isViceCaptain,
  };
}

export function canTransferOut(entry: {
  isCaptain: boolean;
  isViceCaptain: boolean;
}): { ok: boolean; reason?: string } {
  if (entry.isCaptain) {
    return { ok: false, reason: 'Change captain on My Team before transferring out' };
  }
  if (entry.isViceCaptain) {
    return { ok: false, reason: 'Change vice-captain on My Team before transferring out' };
  }
  return { ok: true };
}

export function applyPendingTransfers(
  squad: TransferSquadEntry[],
  pending: Array<{ playerOutId: string; playerIn: PlayerListItem }>,
): TransferSquadEntry[] {
  let result = [...squad];
  for (const transfer of pending) {
    const outIndex = result.findIndex((p) => p.playerId === transfer.playerOutId);
    if (outIndex === -1) {
      continue;
    }
    const out = result[outIndex]!;
    result[outIndex] = {
      playerId: transfer.playerIn.id,
      position: transfer.playerIn.position,
      price: transfer.playerIn.price,
      realTeamId: transfer.playerIn.realTeam.id,
      isAvailable: transfer.playerIn.isAvailable,
      isCaptain: out.isCaptain,
      isViceCaptain: out.isViceCaptain,
    };
  }
  return result;
}

export function canTransferIn(
  squad: TransferSquadEntry[],
  pending: Array<{ playerOutId: string; playerIn: PlayerListItem }>,
  playerIn: PlayerListItem,
  playerOut: TransferSquadEntry,
): { ok: boolean; reason?: string } {
  if (!playerIn.isAvailable) {
    return { ok: false, reason: 'Player unavailable' };
  }

  if (playerIn.position !== playerOut.position) {
    return { ok: false, reason: `Must transfer in a ${playerOut.position}` };
  }

  const projected = applyPendingTransfers(squad, [
    ...pending.filter((t) => t.playerOutId !== playerOut.playerId),
    { playerOutId: playerOut.playerId, playerIn },
  ]);

  if (projected.filter((p) => p.playerId === playerIn.id).length > 1) {
    return { ok: false, reason: 'Player already in squad' };
  }

  const squadPlayers: SquadPlayerInput[] = projected.map((p) => ({
    playerId: p.playerId,
    position: p.position,
    price: p.price,
    realTeamId: p.realTeamId,
    isAvailable: p.isAvailable,
  }));

  const composition = validateSquadComposition(squadPlayers);
  if (!composition.ok) {
    return { ok: false, reason: composition.message };
  }

  const club = validateMaxPerClub(squadPlayers);
  if (!club.ok) {
    return { ok: false, reason: club.message };
  }

  const budget = validateBudget(squadPlayers);
  if (!budget.ok) {
    return { ok: false, reason: budget.message };
  }

  return { ok: true };
}

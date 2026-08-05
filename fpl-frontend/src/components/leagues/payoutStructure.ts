export interface PayoutSplitConfig {
  ranks: Array<{ place: number; percentBps: number }>;
  platformPercentBps: number;
  termsVersion?: string;
}

/** Rank percentBps are of the pot after platform fee; convert to % of full pot for display. */
export function potSharePercents(config: PayoutSplitConfig): {
  ranks: Array<{ place: number; potPct: number }>;
  platformPct: number;
} {
  const platformPct = (config.platformPercentBps ?? 0) / 100;
  const remainderPct = 100 - platformPct;

  const ranks = config.ranks.map((r) => ({
    place: r.place,
    potPct: Math.round((r.percentBps / 10_000) * remainderPct),
  }));

  return { ranks, platformPct: Math.round(platformPct) };
}

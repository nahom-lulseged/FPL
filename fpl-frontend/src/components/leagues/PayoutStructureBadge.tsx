import { potSharePercents, type PayoutSplitConfig } from './payoutStructure';

type PayoutStructureBadgeProps = {
  config: PayoutSplitConfig | null;
};

export function PayoutStructureBadge({ config }: PayoutStructureBadgeProps) {
  if (!config?.ranks?.length) {
    return null;
  }

  const { ranks, platformPct } = potSharePercents(config);

  const parts = ranks.map(
    (r) => `${r.place}${ordinal(r.place)}: ${r.potPct}%`,
  );

  return (
    <span className="inline-flex flex-wrap items-center gap-1 rounded-full border border-fpl-gold/40 bg-fpl-gold/10 px-3 py-1 text-xs text-fpl-gold">
      {parts.join(' · ')} · Platform: {platformPct}%
    </span>
  );
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] ?? s[v] ?? s[0];
}

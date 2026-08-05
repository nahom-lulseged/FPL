import { Link } from 'react-router-dom';
import { FEATURE_CARDS, type FeatureCardItem } from '@/data/homeContent';

function CardGraphic({ variant }: { variant: FeatureCardItem['variant'] }) {
  if (variant === 'squad') {
    return (
      <div className="relative flex h-40 items-end justify-center gap-3 overflow-hidden bg-gradient-to-br from-fpl-purple-700 to-fpl-dark px-4 pb-4 sm:h-44">
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            background:
              'repeating-linear-gradient(-12deg, transparent, transparent 18px, rgba(4,245,255,0.12) 18px, rgba(4,245,255,0.12) 20px)',
          }}
        />
        <div className="relative z-10 flex w-16 flex-col items-center rounded-lg bg-fpl-purple/80 pb-2 pt-3 shadow-lg ring-1 ring-white/10">
          <div className="mb-2 h-8 w-8 rounded-full bg-red-600/80" />
          <span className="text-[10px] font-bold text-white">Gabriel</span>
        </div>
        <div className="relative z-10 flex w-16 -translate-y-2 flex-col items-center rounded-lg bg-fpl-purple/80 pb-2 pt-3 shadow-lg ring-1 ring-white/10">
          <div className="mb-2 h-8 w-8 rounded-full bg-sky-400/80" />
          <span className="text-[10px] font-bold text-white">Aït-Nouri</span>
        </div>
      </div>
    );
  }

  if (variant === 'leagues') {
    return (
      <div className="relative flex h-40 items-center justify-center overflow-hidden bg-gradient-to-br from-[#2a0050] to-fpl-dark sm:h-44">
        <div className="h-28 w-16 rounded-2xl border-2 border-white/20 bg-fpl-purple shadow-xl sm:h-32 sm:w-20">
          <div className="m-1.5 space-y-1 rounded-xl bg-fpl-dark/80 p-2">
            <div className="h-1.5 w-8 rounded bg-fpl-cyan/60" />
            <div className="h-1 w-full rounded bg-white/20" />
            <div className="h-1 w-full rounded bg-white/15" />
            <div className="h-1 w-3/4 rounded bg-white/10" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-40 items-center justify-center gap-3 overflow-hidden bg-gradient-to-br from-[#1a0040] to-fpl-dark px-4 sm:h-44">
      <div className="w-36 rounded-xl border border-white/10 bg-fpl-purple/90 p-3 shadow-lg">
        <div className="mb-2 flex items-center justify-between text-[10px]">
          <span className="text-white/70">Alisson Wonderland</span>
          <span className="font-bold text-fpl-green">▲ 92</span>
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-white/70">In it to McGinn it</span>
          <span className="font-bold text-fpl-pink">▼ 680</span>
        </div>
      </div>
    </div>
  );
}

export function FeatureCards() {
  return (
    <section aria-label="Get started" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {FEATURE_CARDS.map((card) => (
        <Link
          key={card.id}
          to={card.to}
          className="group overflow-hidden rounded-2xl bg-fpl-purple/60 ring-1 ring-white/10 transition hover:ring-fpl-cyan/40"
        >
          <CardGraphic variant={card.variant} />
          <div className="space-y-2 p-4 sm:p-5">
            <h2 className="text-lg font-bold text-white group-hover:text-fpl-cyan sm:text-xl">
              {card.title}
            </h2>
            <p className="text-sm leading-relaxed text-white/70">{card.description}</p>
          </div>
        </Link>
      ))}
    </section>
  );
}

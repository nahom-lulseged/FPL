import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { SCOUT_ITEMS } from '@/data/homeContent';

export function ScoutCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  const updateProgress = useCallback(() => {
    const el = trackRef.current;
    if (!el) {
      return;
    }
    const max = el.scrollWidth - el.clientWidth;
    setProgress(max <= 0 ? 1 : el.scrollLeft / max);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) {
      return;
    }
    updateProgress();
    el.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    return () => {
      el.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
    };
  }, [updateProgress]);

  const scrollByCard = (direction: -1 | 1) => {
    const el = trackRef.current;
    if (!el) {
      return;
    }
    const card = el.querySelector<HTMLElement>('[data-scout-card]');
    const amount = card ? card.offsetWidth + 16 : 280;
    el.scrollBy({ left: direction * amount, behavior: 'smooth' });
  };

  return (
    <section aria-label="Latest from The Scout" className="space-y-4">
      <h2 className="text-xl font-bold text-white sm:text-2xl">Latest from The Scout</h2>

      <div className="relative">
        <div
          ref={trackRef}
          data-lenis-prevent
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 scrollbar-none"
        >
          {SCOUT_ITEMS.map((item) => (
            <article
              key={item.id}
              data-scout-card
              className="w-[min(78vw,280px)] shrink-0 snap-start sm:w-[300px]"
            >
              <div
                className={clsx(
                  'flex h-36 flex-col justify-end rounded-2xl bg-gradient-to-br p-4 sm:h-40',
                  item.accent,
                )}
              >
                <h3 className="text-sm font-extrabold uppercase tracking-wide text-white sm:text-base">
                  {item.title}
                </h3>
              </div>
              <p className="mt-2 text-xs text-white/60 sm:text-sm">{item.subtitle}</p>
            </article>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-3">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-white transition-[width] duration-150"
              style={{ width: `${Math.max(8, progress * 100)}%` }}
            />
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => scrollByCard(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 hover:bg-white/10"
              aria-label="Previous scout articles"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => scrollByCard(1)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 hover:bg-white/10"
              aria-label="Next scout articles"
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

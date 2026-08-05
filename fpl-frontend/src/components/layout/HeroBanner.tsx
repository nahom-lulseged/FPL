import { Link } from 'react-router-dom';

/** CSS-only FPL-style hero (no licensed crest / player photos). */
export function HeroBanner() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-[#04f5ff] from-55% via-[#6b5cff] to-[#7b1fa2]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 50% 120% at 92% 45%, rgba(233,0,82,0.35), transparent 50%)',
        }}
      />
      <div className="relative mx-auto flex h-12 max-w-[1400px] items-center gap-2 px-3 sm:h-28 sm:gap-4 sm:px-4 lg:h-32 lg:px-5">
        {/* CSS-only lion silhouette (not licensed PL crest) */}
        <div className="relative z-10 hidden h-10 w-10 shrink-0 sm:block sm:h-12 sm:w-12 lg:h-14 lg:w-14" aria-hidden>
          <div className="absolute inset-[18%] rounded-full bg-[#37003c]" />
          <div className="absolute -left-[8%] top-[22%] h-[18%] w-[28%] rotate-[-35deg] rounded-full bg-[#37003c]" />
          <div className="absolute -right-[8%] top-[22%] h-[18%] w-[28%] rotate-[35deg] rounded-full bg-[#37003c]" />
          <div className="absolute -left-[2%] top-[8%] h-[16%] w-[22%] rotate-[-55deg] rounded-full bg-[#37003c]" />
          <div className="absolute -right-[2%] top-[8%] h-[16%] w-[22%] rotate-[55deg] rounded-full bg-[#37003c]" />
          <div className="absolute left-[18%] top-[2%] h-[14%] w-[18%] rotate-[-20deg] rounded-full bg-[#37003c]" />
          <div className="absolute right-[18%] top-[2%] h-[14%] w-[18%] rotate-[20deg] rounded-full bg-[#37003c]" />
        </div>

        <Link
          to="/home"
          className="z-10 text-xl font-extrabold tracking-tight text-[#37003c] sm:text-4xl lg:text-5xl"
        >
          Fantasy
        </Link>

        {/* Silhouette collage approximating official player cutouts */}
        <div
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-[50%] sm:block"
          aria-hidden
        >
          <div className="absolute bottom-0 right-[38%] h-[90%] w-16 -skew-x-3 rounded-t-2xl bg-[#e90052]/90 shadow-lg sm:w-20 lg:w-24">
            <div className="mx-auto mt-3 h-8 w-8 rounded-full bg-white/25 sm:h-10 sm:w-10" />
            <div className="mx-auto mt-2 h-1/2 w-[70%] rounded-t bg-white/10" />
          </div>
          <div className="absolute bottom-0 right-[24%] h-[95%] w-16 skew-x-2 rounded-t-2xl bg-[#6cabdd] shadow-xl sm:w-20 lg:w-24">
            <div className="mx-auto mt-3 h-8 w-8 rounded-full bg-white/30 sm:h-10 sm:w-10" />
            <div className="mx-auto mt-2 h-1/2 w-[70%] rounded-t bg-white/15" />
          </div>
          <div className="absolute bottom-0 right-[10%] h-full w-16 -skew-x-2 rounded-t-2xl bg-[#c8102e] shadow-2xl sm:w-20 lg:w-24">
            <div className="mx-auto mt-3 h-8 w-8 rounded-full bg-white/25 sm:h-10 sm:w-10" />
            <div className="mx-auto mt-2 h-1/2 w-[70%] rounded-t bg-white/10" />
          </div>
          <div className="absolute bottom-0 right-0 h-[85%] w-14 skew-x-3 rounded-t-2xl bg-[#132f4c] shadow-lg sm:w-16 lg:w-20">
            <div className="mx-auto mt-3 h-7 w-7 rounded-full bg-white/20 sm:h-9 sm:w-9" />
            <div className="mx-auto mt-2 h-1/2 w-[70%] rounded-t bg-white/10" />
          </div>
        </div>
      </div>
    </div>
  );
}

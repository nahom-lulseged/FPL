import { Link } from 'react-router-dom';
import { PartnersGrid } from '@/components/home/PartnersGrid';
import {
  FOOTER_LINK_COLUMNS,
  FOOTER_UTILITY_LINKS,
} from '@/data/homeContent';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-white/10 bg-[#1a0024]">
      <div className="mx-auto max-w-[1400px] space-y-8 px-3 py-10 sm:px-4 lg:px-5">
        <PartnersGrid compact />

        <nav
          aria-label="Footer"
          className="grid gap-6 sm:grid-cols-3 sm:gap-8"
        >
          {FOOTER_LINK_COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="mb-3 text-sm font-extrabold text-white">{column.title}</h3>
              <ul className="space-y-2">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-sm text-white/55 transition hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className="border-t border-white/10 bg-fpl-purple/80">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-4 lg:px-5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-white/50 sm:text-xs">
            © Fantasy PL {year}
          </p>
          <ul className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-white/45 sm:justify-center sm:text-xs">
            {FOOTER_UTILITY_LINKS.map((label, index) => (
              <li key={label} className="flex items-center gap-2">
                {index > 0 ? <span aria-hidden="true">·</span> : null}
                <span>{label}</span>
              </li>
            ))}
          </ul>
          <div className="hidden h-6 w-6 shrink-0 rounded-full bg-white/20 sm:block" aria-hidden />
        </div>
      </div>
    </footer>
  );
}

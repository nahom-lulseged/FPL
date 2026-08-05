import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { ClubCrest } from '@/components/pitch/ClubCrest';
import type { FplCatalogTeam } from '@/types/fplCatalog';

interface ClubRailProps {
  teams: FplCatalogTeam[];
  selected?: string | null;
  onSelect?: (shortName: string | null) => void;
  viewAllLink?: string;
}

export function ClubRail({ teams, selected, onSelect, viewAllLink }: ClubRailProps) {
  return (
    <section className="club-rail" aria-labelledby="premier-league-clubs-title">
      <div className="section-heading">
        <div>
          <small className="club-rail__eyebrow">OFFICIAL FPL DATA</small>
          <h2 id="premier-league-clubs-title">Premier League clubs</h2>
        </div>
        {viewAllLink ? <Link to={viewAllLink}>Live data</Link> : null}
      </div>
      <div className="club-rail__scroller" role={onSelect ? 'listbox' : 'list'} aria-label="Premier League clubs">
        {onSelect ? (
          <button
            type="button"
            role="option"
            className={clsx('club-rail__item club-rail__all', !selected && 'is-active')}
            aria-selected={!selected}
            onClick={() => onSelect(null)}
          >
            <span>20</span>
            <small>All</small>
          </button>
        ) : null}
        {teams.map((team) => {
          const content = <><ClubCrest shortName={team.shortName} /><small>{team.shortName}</small></>;
          return onSelect ? (
            <button
              type="button"
              role="option"
              aria-selected={selected === team.shortName}
              className={clsx('club-rail__item', selected === team.shortName && 'is-active')}
              onClick={() => onSelect(team.shortName)}
              key={team.id}
              title={team.name}
            >
              {content}
            </button>
          ) : (
            <Link className="club-rail__item" to={`/fixtures?club=${team.shortName}`} key={team.id} title={team.name}>
              {content}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

import { BarChart3, CalendarDays, ChevronRight, Sparkles, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';

const moreLinks = [
  { label: 'Fixtures', to: '/match-center', icon: CalendarDays },
  { label: 'Fixture Difficulty Rating', to: '/fixtures', icon: BarChart3 },
  { label: 'Player Statistics', to: '/leaderboard', icon: Trophy },
  { label: 'Set Piece Takers', to: '/stats/dream-team', icon: Sparkles },
] as const;

export function MorePage() {
  return (
    <div className="fpl-more-page page-stack">
      <section className="fpl-link-panel" aria-label="Fantasy resources">
        {moreLinks.map(({ label, to, icon: Icon }) => (
          <Link key={label} to={to}><span><Icon size={19} />{label}</span><ChevronRight size={21} /></Link>
        ))}
      </section>
    </div>
  );
}

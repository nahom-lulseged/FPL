import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, CalendarDays,
  CircleDollarSign, Clock3, Plus, RefreshCw, ShieldCheck, Sparkles,
  Trophy, UsersRound, X,
} from 'lucide-react';
import { useDashboardOverview } from '@/hooks/useDashboardOverview';
import { getErrorMessage } from '@/types/api';
import type { DashboardFixture, DashboardOverview } from '@/types/dashboard';

const numberFormatter = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
function useAnimatedNumber(target: number, duration = 650) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setValue(target); return; }
    const start = performance.now();
    let frame = 0;
    const tick = (time: number) => {
      const progress = Math.min((time - start) / duration, 1);
      setValue(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration, target]);
  return value;
}

function Trend({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs font-semibold text-slate-500">New period</span>;
  const positive = value >= 0;
  return <span className={positive ? 'inline-flex items-center gap-1 text-xs font-bold text-emerald-400' : 'inline-flex items-center gap-1 text-xs font-bold text-rose-400'}>{positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}{Math.abs(value).toFixed(1)}%</span>;
}

function MiniSpark({ data, color }: { data: number[]; color: string }) {
  const points = data.length ? data : [0, 0];
  return <ResponsiveContainer width="100%" height={42}><AreaChart data={points.map((value, index) => ({ index, value }))}><defs><linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.35} /><stop offset="100%" stopColor={color} stopOpacity={0} /></linearGradient></defs><Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#spark-${color.replace('#', '')})`} dot={false} isAnimationActive /></AreaChart></ResponsiveContainer>;
}

function KpiCard({ label, value, change, icon: Icon, color, spark, suffix }: { label: string; value: number; change: number | null; icon: typeof UsersRound; color: string; spark: number[]; suffix?: string }) {
  const animated = useAnimatedNumber(value);
  return (
    <article className="glass-card glass-card-hover overflow-hidden p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-2 text-2xl font-extrabold tracking-[-.04em] text-[var(--text)] sm:text-[28px]">{suffix}{numberFormatter.format(animated)}</p></div>
        <div className="grid h-10 w-10 place-items-center rounded-xl" style={{ color, background: `${color}16`, border: `1px solid ${color}28` }}><Icon className="h-[19px] w-[19px]" strokeWidth={1.8} /></div>
      </div>
      <div className="mt-3 flex items-end gap-3"><div className="min-w-0 flex-1"><MiniSpark data={spark} color={color} /></div><div className="pb-1 text-right"><Trend value={change} /><p className="mt-0.5 text-[10px] text-slate-500">vs previous</p></div></div>
    </article>
  );
}

function TeamBadge({ name, shortName, crestUrl, size = 'md' }: { name: string; shortName: string; crestUrl: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const dimensions = size === 'lg' ? 'h-16 w-16 sm:h-20 sm:w-20' : size === 'sm' ? 'h-8 w-8' : 'h-11 w-11';
  return crestUrl ? <img src={crestUrl} alt={`${name} crest`} className={`${dimensions} object-contain`} /> : <div className={`${dimensions} grid shrink-0 place-items-center rounded-full border border-[var(--line)] bg-white/[0.04] text-xs font-black text-slate-400`}>{shortName.slice(0, 3)}</div>;
}

function FixtureBanner({ fixture }: { fixture: DashboardFixture | null }) {
  if (!fixture) return <section className="glass-card flex min-h-56 flex-col items-center justify-center p-8 text-center"><CalendarDays className="mb-3 h-8 w-8 text-slate-600" /><h2 className="section-title">No fixture scheduled</h2><p className="mt-1 text-sm text-slate-500">Fixtures will appear here after the next data sync.</p></section>;
  const live = fixture.started && !fixture.finished;
  return (
    <section className="glass-card relative overflow-hidden p-5 sm:p-7">
      <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="relative flex items-center justify-between gap-4"><div><p className="eyebrow">Featured match</p><p className="mt-1 text-xs text-slate-500">Gameweek {fixture.gameweek.number} · {new Date(fixture.kickoffTime).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })}</p></div><span className={live ? 'inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-[10px] font-extrabold tracking-widest text-rose-400' : 'data-pill'}>{live ? <><span className="live-dot" />LIVE {fixture.minutes ?? 0}'</> : fixture.finished ? 'FULL TIME' : 'UP NEXT'}</span></div>
      <div className="relative mx-auto mt-7 grid max-w-3xl grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-10">
        <div className="flex flex-col items-center text-center"><TeamBadge {...fixture.homeTeam} size="lg" /><p className="mt-3 text-sm font-bold text-[var(--text)] sm:text-lg">{fixture.homeTeam.name}</p><p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Home</p></div>
        <div className="text-center">{fixture.started || fixture.finished ? <><p className="text-4xl font-black tracking-[-.06em] text-[var(--text)] sm:text-5xl">{fixture.homeScore ?? 0}<span className="mx-2 text-slate-600">:</span>{fixture.awayScore ?? 0}</p><p className="mt-2 text-[10px] font-bold uppercase tracking-[.2em] text-slate-500">Score</p></> : <><div className="grid h-16 w-16 place-items-center rounded-full border border-emerald-400/20 bg-emerald-400/[.07] text-sm font-black text-emerald-400">VS</div><p className="mt-2 text-xs text-slate-500">Kickoff soon</p></>}</div>
        <div className="flex flex-col items-center text-center"><TeamBadge {...fixture.awayTeam} size="lg" /><p className="mt-3 text-sm font-bold text-[var(--text)] sm:text-lg">{fixture.awayTeam.name}</p><p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Away</p></div>
      </div>
      <div className="relative mt-7 flex items-center justify-center"><Link to="/content/fixtures" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--line)] bg-white/[.035] px-4 text-xs font-bold text-[var(--text)] transition hover:border-emerald-400/30 hover:text-emerald-400">Manage fixture <ArrowRight className="h-4 w-4" /></Link></div>
    </section>
  );
}

function CardHeader({ title, eyebrow, to, linkLabel = 'View all' }: { title: string; eyebrow?: string; to?: string; linkLabel?: string }) {
  return <div className="mb-4 flex items-start justify-between gap-4"><div>{eyebrow ? <p className="eyebrow mb-1">{eyebrow}</p> : null}<h2 className="section-title">{title}</h2></div>{to ? <Link to={to} className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300">{linkLabel}<ArrowRight className="h-3.5 w-3.5" /></Link> : null}</div>;
}

function PlayerTable({ players }: { players: DashboardOverview['topPlayers'] }) {
  return <section className="glass-card overflow-hidden"><div className="p-5 pb-3"><CardHeader eyebrow="Player management" title="League leaders" to="/content/players" /></div>{players.length === 0 ? <Empty label="No player records available" /> : <><div className="hidden overflow-x-auto sm:block"><table className="w-full text-left text-xs"><thead className="border-y border-[var(--line)] bg-white/[.025] text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Player</th><th className="px-3 py-3">Pos</th><th className="px-3 py-3">Price</th><th className="px-3 py-3">Ownership</th><th className="px-3 py-3">Points</th><th className="px-5 py-3 text-right">Status</th></tr></thead><tbody>{players.slice(0, 6).map((player) => <tr key={player.id} className="border-b border-[var(--line)] transition hover:bg-white/[.025]"><td className="px-5 py-3"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-emerald-400/20 to-cyan-400/10 text-[11px] font-black text-emerald-300">{player.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</div><div className="min-w-0"><p className="truncate font-bold text-[var(--text)]">{player.name}</p><p className="text-[10px] text-slate-500">{player.realTeam.shortName}</p></div></div></td><td className="px-3 py-3"><span className="data-pill">{player.position}</span></td><td className="px-3 py-3 font-semibold text-[var(--text)]">£{(player.price / 10).toFixed(1)}</td><td className="px-3 py-3 text-slate-400">{player.selectedByPercent.toFixed(1)}%</td><td className="px-3 py-3 font-extrabold text-emerald-400">{player.totalPoints}</td><td className="px-5 py-3 text-right"><span className={player.isAvailable ? 'text-emerald-400' : 'text-rose-400'}>{player.isAvailable ? 'Available' : 'Unavailable'}</span></td></tr>)}</tbody></table></div><div className="space-y-2 px-4 pb-4 sm:hidden">{players.slice(0, 5).map((player) => <div key={player.id} className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-white/[.025] p-3"><div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-400/10 text-xs font-black text-emerald-300">{player.name.slice(0, 2).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-[var(--text)]">{player.name}</p><p className="text-[10px] text-slate-500">{player.realTeam.shortName} · {player.position} · £{(player.price / 10).toFixed(1)}</p></div><p className="text-lg font-black text-emerald-400">{player.totalPoints}</p></div>)}</div></>}</section>;
}

function FixtureCards({ fixtures }: { fixtures: DashboardFixture[] }) {
  return <section className="glass-card p-5"><CardHeader eyebrow="Fixture management" title="Match centre" to="/content/fixtures" />{fixtures.length === 0 ? <Empty label="No fixtures available" /> : <div className="flex snap-x gap-3 overflow-x-auto pb-1">{fixtures.slice(0, 4).map((fixture) => <article key={fixture.id} className="min-w-[220px] flex-1 snap-start rounded-2xl border border-[var(--line)] bg-white/[.025] p-4"><div className="flex items-center justify-between"><span className="data-pill">GW {fixture.gameweek.number}</span><span className={fixture.started && !fixture.finished ? 'text-[10px] font-extrabold text-rose-400' : 'text-[10px] font-bold text-slate-500'}>{fixture.finished ? 'FT' : fixture.started ? `LIVE ${fixture.minutes ?? 0}'` : new Date(fixture.kickoffTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span></div><div className="mt-5 flex items-center justify-between gap-3"><div className="flex flex-col items-center gap-2"><TeamBadge {...fixture.homeTeam} /><span className="text-xs font-bold text-[var(--text)]">{fixture.homeTeam.shortName}</span></div><div className="text-center"><p className="text-xl font-black text-[var(--text)]">{fixture.started || fixture.finished ? `${fixture.homeScore ?? 0} : ${fixture.awayScore ?? 0}` : 'VS'}</p><p className="mt-1 text-[9px] uppercase tracking-widest text-slate-500">{new Date(fixture.kickoffTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</p></div><div className="flex flex-col items-center gap-2"><TeamBadge {...fixture.awayTeam} /><span className="text-xs font-bold text-[var(--text)]">{fixture.awayTeam.shortName}</span></div></div></article>)}</div>}</section>;
}

function OverviewChart({ data }: { data: DashboardOverview['trend'] }) {
  const chartData = data.map((row) => ({ ...row, label: new Date(row.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) }));
  return <section className="glass-card p-5"><CardHeader eyebrow="Platform statistics" title="30-day activity" to="/analytics" />{chartData.every((row) => row.registrations + row.teamsCreated + row.transfers === 0) ? <Empty label="No activity recorded in this period" /> : <ResponsiveContainer width="100%" height={280}><AreaChart data={chartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}><defs><linearGradient id="activityEmerald" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#00e676" stopOpacity={.32}/><stop offset="100%" stopColor="#00e676" stopOpacity={0}/></linearGradient><linearGradient id="activityCyan" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#00d9ff" stopOpacity={.22}/><stop offset="100%" stopColor="#00d9ff" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="rgba(148,163,184,.1)" vertical={false}/><XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} interval={5}/><YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false}/><Tooltip contentStyle={{ background: '#111a2a', border: '1px solid rgba(148,163,184,.16)', borderRadius: 12, color: '#fff', fontSize: 12 }}/><Area type="monotone" dataKey="transfers" name="Transfers" stroke="#00e676" strokeWidth={2} fill="url(#activityEmerald)"/><Area type="monotone" dataKey="registrations" name="Registrations" stroke="#00d9ff" strokeWidth={2} fill="url(#activityCyan)"/><Area type="monotone" dataKey="teamsCreated" name="Teams" stroke="#ff9800" strokeWidth={2} fill="transparent"/></AreaChart></ResponsiveContainer>}</section>;
}

function InsightCharts({ data }: { data: DashboardOverview }) {
  const colors = ['#00e676', '#00d9ff', '#ff9800', '#a78bfa', '#ff5252'];
  return <section className="glass-card p-5"><CardHeader eyebrow="Squad intelligence" title="Captain & formation picks" /><div className="grid gap-5 sm:grid-cols-2"><div><p className="mb-2 text-xs font-semibold text-slate-500">Top captains</p>{data.captainPicks.length ? <ResponsiveContainer width="100%" height={190}><PieChart><Pie data={data.captainPicks} dataKey="count" nameKey="playerName" innerRadius={45} outerRadius={72} paddingAngle={3}>{data.captainPicks.map((row, index) => <Cell key={row.playerId} fill={colors[index % colors.length]} />)}</Pie><Tooltip contentStyle={{ background: '#111a2a', border: '1px solid rgba(148,163,184,.16)', borderRadius: 12, color: '#fff', fontSize: 11 }}/></PieChart></ResponsiveContainer> : <Empty label="No captain selections" compact />}</div><div><p className="mb-2 text-xs font-semibold text-slate-500">Formation distribution</p>{data.formationDistribution.length ? <ResponsiveContainer width="100%" height={190}><BarChart data={data.formationDistribution} layout="vertical" margin={{ left: -12, right: 4 }}><XAxis type="number" hide/><YAxis type="category" dataKey="formation" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} width={50}/><Tooltip cursor={{ fill: 'rgba(148,163,184,.05)' }} contentStyle={{ background: '#111a2a', border: '1px solid rgba(148,163,184,.16)', borderRadius: 12, color: '#fff', fontSize: 11 }}/><Bar dataKey="count" fill="#00d9ff" radius={[0, 5, 5, 0]}/></BarChart></ResponsiveContainer> : <Empty label="No formation data" compact />}</div></div></section>;
}

function SideWidgets({ data }: { data: DashboardOverview }) {
  return <div className="space-y-4"><section className="glass-card p-5"><CardHeader title="Top scorers" to="/content/players" />{data.topPlayers.length ? <div className="space-y-1">{data.topPlayers.slice(0, 6).map((player, index) => <div key={player.id} className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-white/[.035]"><span className="w-4 text-[10px] font-black text-slate-600">{String(index + 1).padStart(2, '0')}</span><div className="grid h-8 w-8 place-items-center rounded-full bg-emerald-400/10 text-[10px] font-black text-emerald-300">{player.name.slice(0, 2).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-[var(--text)]">{player.name}</p><p className="text-[10px] text-slate-500">{player.realTeam.shortName} · {player.position}</p></div><div className="text-right"><p className="text-sm font-black text-[var(--text)]">{player.totalPoints}</p><p className="text-[9px] text-emerald-400">+{player.eventPoints} GW</p></div></div>)}</div> : <Empty label="No player data" compact />}</section><section className="glass-card p-5"><CardHeader title="Recent transfers" to="/analytics" />{data.recentTransfers.length ? <div className="space-y-4">{data.recentTransfers.slice(0, 5).map((transfer) => <div key={transfer.id} className="relative flex gap-3 pl-1 before:absolute before:left-[7px] before:top-6 before:h-[calc(100%+8px)] before:w-px before:bg-[var(--line)] last:before:hidden"><span className="relative mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-4 border-[var(--panel-solid)] bg-emerald-400" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-[var(--text)]"><span className="text-emerald-400">{transfer.playerIn.name}</span> in</p><p className="truncate text-[10px] text-slate-500">{transfer.team.user.displayName} · {transfer.team.name}</p><p className="mt-1 text-[9px] text-slate-600">{relativeTime(transfer.createdAt)}</p></div></div>)}</div> : <Empty label="No recent transfers" compact />}</section><section className="glass-card p-5"><CardHeader title="Activity feed" to="/system/audit" />{data.recentActivity.length ? <div className="space-y-3">{data.recentActivity.slice(0, 5).map((item) => <div key={item.id} className="flex gap-3"><div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-cyan-400/10 text-cyan-400"><Activity className="h-3.5 w-3.5" /></div><div className="min-w-0"><p className="truncate text-xs font-semibold text-[var(--text)]">{humanize(item.action)}</p><p className="truncate text-[10px] text-slate-500">{item.admin.displayName} · {item.targetType}</p><p className="mt-0.5 text-[9px] text-slate-600">{relativeTime(item.createdAt)}</p></div></div>)}</div> : <Empty label="No admin activity" compact />}</section></div>;
}

function TeamPerformance({ teams }: { teams: DashboardOverview['clubPerformance'] }) {
  return <section><div className="mb-4 flex items-end justify-between"><div><p className="eyebrow mb-1">Premier League</p><h2 className="text-lg font-extrabold tracking-tight text-[var(--text)]">Team performance</h2></div><Link to="/content/teams" className="text-xs font-bold text-emerald-400">Manage teams</Link></div>{teams.length === 0 ? <div className="glass-card"><Empty label="Completed fixtures are required for team performance" /></div> : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">{teams.map((team) => <article key={team.id} className="glass-card glass-card-hover p-4"><div className="flex items-center justify-between"><TeamBadge {...team} /><div className="text-right"><p className="text-2xl font-black text-[var(--text)]">{team.points}</p><p className="text-[9px] uppercase tracking-widest text-slate-500">points</p></div></div><p className="mt-3 truncate text-sm font-bold text-[var(--text)]">{team.name}</p><div className="mt-3 grid grid-cols-3 gap-1 border-y border-[var(--line)] py-2 text-center"><div><p className="text-xs font-black text-emerald-400">{team.wins}</p><p className="text-[8px] text-slate-600">WINS</p></div><div><p className="text-xs font-black text-amber-400">{team.draws}</p><p className="text-[8px] text-slate-600">DRAWS</p></div><div><p className="text-xs font-black text-rose-400">{team.losses}</p><p className="text-[8px] text-slate-600">LOSSES</p></div></div><div className="mt-3 flex items-center justify-between"><p className="text-[10px] text-slate-500">GF {team.goalsFor} · GA {team.goalsAgainst}</p><div className="flex gap-1">{team.form.map((result, index) => <span key={`${result}-${index}`} className={`grid h-5 w-5 place-items-center rounded text-[8px] font-black ${result === 'W' ? 'bg-emerald-400/15 text-emerald-400' : result === 'D' ? 'bg-amber-400/15 text-amber-400' : 'bg-rose-400/15 text-rose-400'}`}>{result}</span>)}</div></div></article>)}</div>}</section>;
}

function Empty({ label, compact = false }: { label: string; compact?: boolean }) { return <div className={`flex items-center justify-center text-center text-xs text-slate-500 ${compact ? 'min-h-24' : 'min-h-40 p-6'}`}>{label}</div>; }
function humanize(value: string) { return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function relativeTime(value: string) { const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000)); if (seconds < 60) return 'Just now'; if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`; if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`; return `${Math.floor(seconds / 86400)}d ago`; }

function DashboardSkeleton() { return <div className="space-y-5"><div className="skeleton h-16 rounded-2xl"/><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1,2,3,4].map((key) => <div key={key} className="skeleton h-40 rounded-[18px]"/>)}</div><div className="skeleton h-72 rounded-[18px]"/><div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]"><div className="skeleton h-96 rounded-[18px]"/><div className="skeleton h-96 rounded-[18px]"/></div></div>; }

export function DashboardHomePage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useDashboardOverview();
  const [fabOpen, setFabOpen] = useState(false);
  if (isLoading && !data) return <DashboardSkeleton />;
  if (isError || !data) return <div className="glass-card mx-auto mt-16 max-w-lg p-8 text-center"><ShieldCheck className="mx-auto h-9 w-9 text-rose-400"/><h1 className="mt-4 text-lg font-extrabold text-[var(--text)]">Dashboard unavailable</h1><p className="mt-2 text-sm text-slate-500">{getErrorMessage(error, 'The overview could not be loaded.')}</p><button type="button" onClick={() => void refetch()} className="quick-add mt-5"><RefreshCw className="h-4 w-4"/>Retry</button></div>;

  const gameweek = data.currentGameweek ?? data.nextGameweek;
  const kpiSpark = {
    users: data.trend.map((row) => row.registrations),
    teams: data.trend.map((row) => row.teamsCreated),
    transfers: data.trend.map((row) => row.transfers),
    revenue: data.trend.map((row) => row.revenueMinor),
  };
  const quickLinks = [{ label: 'Manage player', to: '/content/players' }, { label: 'Manage fixture', to: '/content/fixtures' }, { label: 'Update gameweek', to: '/content/gameweeks' }, { label: 'Manage league', to: '/leagues' }, { label: 'Sync data', to: '/ingestion' }];

  return <div className="space-y-5 pb-20">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><div className="mb-2 flex items-center gap-2"><Sparkles className="h-4 w-4 text-emerald-400"/><p className="eyebrow">Performance overview</p></div><h1 className="text-2xl font-black tracking-[-.045em] text-[var(--text)] sm:text-3xl">Good day, Admin</h1><p className="mt-1 text-sm text-slate-500">Your FPL command centre is synced and ready.</p></div><div className="flex items-center gap-2"><span className="data-pill"><span className={`status-dot mr-2 ${data.system.dbOk && data.system.redisOk ? 'bg-emerald-400' : 'bg-amber-400'}`}/>{data.system.dbOk && data.system.redisOk ? 'Systems operational' : 'System attention'}</span>{isFetching ? <RefreshCw className="h-4 w-4 animate-spin text-slate-500"/> : null}</div></div>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><KpiCard label="Total users" value={data.kpis.totalUsers.value} change={data.kpis.totalUsers.change} icon={UsersRound} color="#00e676" spark={kpiSpark.users}/><KpiCard label={data.kpis.activeTeams.season ? `Teams · ${data.kpis.activeTeams.season}` : 'Current-season teams'} value={data.kpis.activeTeams.value} change={data.kpis.activeTeams.change} icon={ShieldCheck} color="#00d9ff" spark={kpiSpark.teams}/><KpiCard label="Transfers · 24 hours" value={data.kpis.transfers24h.value} change={data.kpis.transfers24h.change} icon={Activity} color="#ff9800" spark={kpiSpark.transfers}/><KpiCard label="Commission revenue · ETB" value={Math.round(data.kpis.revenue.valueMinor / 100)} change={data.kpis.revenue.change} icon={CircleDollarSign} color="#a78bfa" spark={kpiSpark.revenue}/></div>

    {gameweek ? <div className="glass-card flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3"><div className="flex items-center gap-2"><Trophy className="h-4 w-4 text-emerald-400"/><span className="text-xs font-bold text-[var(--text)]">Gameweek {gameweek.number}</span></div><div className="flex items-center gap-2 text-xs text-slate-500"><Clock3 className="h-3.5 w-3.5"/>Deadline {new Date(gameweek.deadline).toLocaleString()}</div><span className="ml-auto data-pill">{gameweek.status}</span></div> : null}
    <FixtureBanner fixture={data.featuredFixture}/>

    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,2.15fr)_minmax(300px,.85fr)]"><div className="min-w-0 space-y-5"><OverviewChart data={data.trend}/><PlayerTable players={data.topPlayers}/><FixtureCards fixtures={data.recentFixtures}/><InsightCharts data={data}/></div><SideWidgets data={data}/></div>
    <TeamPerformance teams={data.clubPerformance}/>

    <div className="fixed bottom-[86px] right-[22px] z-40">{fabOpen ? <div className="menu-panel bottom-0 right-0 w-52"><p className="menu-label">Quick create</p>{quickLinks.map((item) => <Link key={item.to} className="menu-row" to={item.to} onClick={() => setFabOpen(false)}>{item.label}</Link>)}</div> : null}</div>
    <button type="button" className="fab" onClick={() => setFabOpen((value) => !value)} aria-label="Open quick actions" aria-expanded={fabOpen}>{fabOpen ? <X className="h-5 w-5"/> : <Plus className="h-5 w-5"/>}</button>
  </div>;
}

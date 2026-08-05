import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { formatMinor } from '@/lib/money';
import type { LedgerEntry } from '@/types/wallet';

export function WalletTrendChart({ entries, currentBalanceMinor }: { entries: LedgerEntry[]; currentBalanceMinor: number }) {
  let running = currentBalanceMinor;
  const points = [...entries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((entry) => {
    const point = { date: new Date(entry.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), balance: running };
    running += entry.direction === 'CREDIT' ? -entry.amountMinor : entry.amountMinor;
    return point;
  }).reverse();
  const data = points.length > 1 ? points : [{ date: 'Start', balance: 0 }, { date: 'Today', balance: currentBalanceMinor }];
  return <div className="wallet-chart" aria-label="Wallet balance trend"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}><defs><linearGradient id="walletGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#04F5FF" stopOpacity={0.36} /><stop offset="100%" stopColor="#7C3AED" stopOpacity={0} /></linearGradient></defs><XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#C1AECA', fontSize: 9 }} /><Tooltip contentStyle={{ background: '#300035', border: '1px solid rgba(255,255,255,.14)', borderRadius: 12, fontSize: 11 }} formatter={(value) => [formatMinor(Number(value)), 'Balance']} /><Area type="monotone" dataKey="balance" stroke="#04F5FF" strokeWidth={2.5} fill="url(#walletGradient)" /></AreaChart></ResponsiveContainer></div>;
}

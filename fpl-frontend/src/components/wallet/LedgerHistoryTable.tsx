import { ArrowDownLeft, ArrowUpRight, Trophy } from 'lucide-react';
import { formatMinor } from '@/lib/money';
import type { LedgerEntry } from '@/types/wallet';

const ENTRY_LABELS: Record<string, string> = { DEPOSIT: 'Telebirr deposit', STAKE_HOLD: 'League entry', STAKE_RELEASE: 'Stake released', PAYOUT: 'Prize winnings', COMMISSION: 'Platform fee', REFUND: 'Refund', WITHDRAWAL: 'Telebirr withdrawal' };
export function LedgerHistoryTable({ entries }: { entries: LedgerEntry[] }) {
  if (!entries.length) return <div className="wallet-empty-ledger"><Trophy size={24} /><p>No transactions yet. Your deposits, league entries, and prizes will appear here.</p></div>;
  return <div className="wallet-ledger-list">{entries.map((entry) => <div className="wallet-ledger-row" key={entry.id}><span className={entry.direction === 'CREDIT' ? 'is-credit' : ''}>{entry.direction === 'CREDIT' ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}</span><div><strong>{ENTRY_LABELS[entry.entryType] ?? entry.entryType.replaceAll('_', ' ')}</strong><small>{new Date(entry.createdAt).toLocaleString()}</small></div><b className={entry.direction === 'CREDIT' ? 'is-credit' : ''}>{entry.direction === 'CREDIT' ? '+' : '-'}{formatMinor(entry.amountMinor)}</b></div>)}</div>;
}

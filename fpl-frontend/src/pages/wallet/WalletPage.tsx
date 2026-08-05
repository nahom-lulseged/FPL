import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowUpRight, ChevronRight, Landmark, ShieldCheck } from 'lucide-react';
import { BalanceCard } from '@/components/wallet/BalanceCard';
import { DepositModal } from '@/components/wallet/DepositModal';
import { WithdrawModal } from '@/components/wallet/WithdrawModal';
import { LedgerHistoryTable } from '@/components/wallet/LedgerHistoryTable';
import { WalletTrendChart } from '@/components/wallet/WalletTrendChart';
import { PremiumCard } from '@/components/common/PremiumCard';
import { StatCard } from '@/components/common/PremiumUi';
import { QueryErrorState } from '@/components/common/QueryErrorState';
import { FullPageSpinner } from '@/components/common/Spinner';
import { useWallet } from '@/hooks/useWallet';
import { useLedgerHistory } from '@/hooks/useLedgerHistory';
import { getComplianceStatus } from '@/api/payments.api';
import { formatMinor } from '@/lib/money';
import { useToast } from '@/store/toastStore';

export function WalletPage() {
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [filter, setFilter] = useState<'all' | 'income' | 'expenses'>('all');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data: wallet, isLoading, isError, error, refetch } = useWallet();
  const { data: ledger } = useLedgerHistory();
  const { data: compliance } = useQuery({ queryKey: ['compliance'], queryFn: getComplianceStatus });

  useEffect(() => {
    if (searchParams.get('deposit') === 'open') setDepositOpen(true);
    if (searchParams.get('withdraw') === 'open') setWithdrawOpen(true);
  }, [searchParams]);

  useEffect(() => {
    const depositStatus = searchParams.get('deposit');
    if (!depositStatus || depositStatus === 'open') return;
    const reason = searchParams.get('reason');
    if (depositStatus === 'success') { toast.success('Telebirr payment received'); void queryClient.invalidateQueries({ queryKey: ['wallet'] }); }
    else if (depositStatus === 'pending') { toast.success('Deposit submitted for verification'); void queryClient.invalidateQueries({ queryKey: ['wallet'] }); }
    else if (depositStatus === 'failed') toast.error(reason ? `Deposit failed: ${reason}` : 'Deposit failed');
    navigate('/wallet', { replace: true });
  }, [searchParams, toast, queryClient, navigate]);

  const entries = useMemo(() => ledger?.data ?? [], [ledger?.data]);
  const income = entries.filter((entry) => entry.direction === 'CREDIT').reduce((sum, entry) => sum + entry.amountMinor, 0);
  const expenses = entries.filter((entry) => entry.direction === 'DEBIT').reduce((sum, entry) => sum + entry.amountMinor, 0);
  const filteredEntries = useMemo(() => entries.filter((entry) => filter === 'all' || (filter === 'income' ? entry.direction === 'CREDIT' : entry.direction === 'DEBIT')), [entries, filter]);

  if (isLoading) return <FullPageSpinner />;
  if (isError || !wallet) return <QueryErrorState error={error} message="Failed to load wallet" onRetry={() => void refetch()} />;

  return <div className="page-stack wallet-page">
    <header className="page-intro"><div><p className="eyebrow">SECURE ETB WALLET</p><h1>Wallet</h1><p>Deposit with Telebirr, track prizes, and withdraw securely.</p></div><span className="data-status"><ShieldCheck size={14} /> Protected</span></header>
    <BalanceCard wallet={wallet} hidden={!balanceVisible} onToggle={() => setBalanceVisible(!balanceVisible)} />
    <div className="wallet-actions"><button className="neo-button" onClick={() => setDepositOpen(true)}><ArrowDownLeft size={18} /> Deposit</button><button className="neo-button neo-button--secondary" onClick={() => setWithdrawOpen(true)}><ArrowUpRight size={18} /> Withdraw</button></div>
    <div className="wallet-summary-grid"><StatCard icon={ArrowDownLeft} label="Money in" value={formatMinor(income)} tone="green" detail="Last 30 days" /><StatCard icon={ArrowUpRight} label="Money out" value={formatMinor(expenses)} tone="purple" detail="Last 30 days" /></div>
    <section><div className="section-heading"><h2>Balance activity</h2><span className="provider-chip">Last 30 days</span></div><PremiumCard className="wallet-chart-card"><WalletTrendChart entries={entries} currentBalanceMinor={wallet.balanceMinor} /></PremiumCard></section>
    {!compliance?.canWithdraw ? <Link to="/profile/verification"><PremiumCard className="wallet-verification-banner"><span><Landmark size={20} /></span><div><strong>Unlock withdrawals</strong><p>Complete identity verification before requesting a payout.</p></div><ChevronRight size={17} /></PremiumCard></Link> : null}
    <section><div className="section-heading"><h2>Transactions</h2></div><div className="segmented-control wallet-filter"><button className={filter === 'all' ? 'is-active' : ''} onClick={() => setFilter('all')}>All</button><button className={filter === 'income' ? 'is-active' : ''} onClick={() => setFilter('income')}>Income</button><button className={filter === 'expenses' ? 'is-active' : ''} onClick={() => setFilter('expenses')}>Expenses</button></div><PremiumCard className="wallet-ledger-card"><LedgerHistoryTable entries={filteredEntries} /></PremiumCard></section>
    <DepositModal open={depositOpen} onClose={() => { setDepositOpen(false); navigate('/wallet', { replace: true }); }} />
    <WithdrawModal open={withdrawOpen} onClose={() => { setWithdrawOpen(false); navigate('/wallet', { replace: true }); }} maxAmountMinor={wallet.balanceMinor} canWithdraw={compliance?.canWithdraw ?? false} />
  </div>;
}

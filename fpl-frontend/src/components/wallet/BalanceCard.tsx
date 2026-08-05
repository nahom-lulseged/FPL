import { CreditCard, Eye, EyeOff, Radio } from 'lucide-react';
import { formatMinor } from '@/lib/money';
import type { WalletSummary } from '@/types/wallet';

interface BalanceCardProps {
  wallet: WalletSummary;
  hidden?: boolean;
  onToggle?: () => void;
}

export function BalanceCard({ wallet, hidden = false, onToggle }: BalanceCardProps) {
  return (
    <div className="wallet-balance-card">
      <div className="wallet-balance-card__top"><span><CreditCard size={18} /> FPL WALLET</span><button onClick={onToggle} aria-label={hidden ? 'Show balance' : 'Hide balance'}>{hidden ? <Eye size={18} /> : <EyeOff size={18} />}</button></div>
      <p>Available balance</p>
      <strong>{hidden ? 'ETB ••••••' : wallet.balanceDisplay ?? formatMinor(wallet.balanceMinor, wallet.currency)}</strong>
      <div className="wallet-balance-card__bottom"><span><Radio size={12} /> ACTIVE</span><small>{wallet.id.slice(0, 5).toUpperCase()} ···· {wallet.id.slice(-4).toUpperCase()}</small></div>
    </div>
  );
}

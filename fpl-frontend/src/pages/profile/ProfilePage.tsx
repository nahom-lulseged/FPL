import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bell, ChevronRight, CircleHelp, Copy, Gift, Globe2, LogOut, Medal, MessageCircle,
  Phone, ShieldCheck, SlidersHorizontal, Sparkles, Trophy, UserRound, WalletCards,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { PremiumCard } from '@/components/common/PremiumCard';
import { StatCard } from '@/components/common/PremiumUi';
import { getProfile, getProfileStatistics } from '@/api/experience.api';
import { formatMinor } from '@/lib/money';
import { useAuthStore } from '@/store/authStore';
import { useTelegram } from '@/lib/telegram';
import { useToast } from '@/store/toastStore';

export function ProfilePage() {
  const fallbackUser = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const toast = useToast();
  const telegram = useTelegram();
  const profile = useQuery({ queryKey: ['profile'], queryFn: getProfile, retry: false });
  const stats = useQuery({ queryKey: ['profile', 'statistics'], queryFn: getProfileStatistics, retry: false });
  const displayName = profile.data?.displayName ?? telegram.user?.first_name ?? fallbackUser?.displayName ?? 'Fantasy Manager';
  const username = profile.data?.telegramUsername ?? telegram.user?.username;
  const referralCode = profile.data?.referralCode ?? `FPL${fallbackUser?.id.slice(-6).toUpperCase() ?? 'PLAY26'}`;
  const [copied, setCopied] = useState(false);

  const verification = useMemo(() => [
    { label: 'Telegram linked', status: telegram.isTelegram || Boolean(profile.data?.telegramUsername) ? 'verified' : 'pending' },
    { label: 'Phone verified', status: profile.data?.phoneE164 ? 'verified' : 'pending' },
    { label: 'KYC approved', status: 'missing' },
  ], [profile.data?.phoneE164, profile.data?.telegramUsername, telegram.isTelegram]);

  async function copyReferral() {
    await navigator.clipboard.writeText(referralCode);
    setCopied(true); toast.success('Referral code copied');
    window.setTimeout(() => setCopied(false), 1500);
  }

  async function handleLogout() {
    await logout(); navigate('/telegram-auth', { replace: true });
  }

  return (
    <div className="page-stack profile-page">
      <PremiumCard className="profile-identity premium-card--glow">
        <div className="profile-avatar">{telegram.user?.photo_url ? <img src={telegram.user.photo_url} alt="" /> : displayName.slice(0, 1).toUpperCase()}<span /></div>
        <div><p className="eyebrow">FANTASY MANAGER</p><h1>{displayName}</h1><p>{username ? `@${username}` : fallbackUser?.email ?? 'Telegram player'}</p></div>
        <Link to="/profile/badge" className="profile-badge-button" aria-label="Edit team badge"><ShieldCheck size={24} /><Sparkles size={12} /></Link>
      </PremiumCard>

      <div className="profile-stat-grid">
        <ProfileStat icon={Sparkles} label="Total points" value={String(stats.data?.totalPoints ?? 0)} />
        <ProfileStat icon={Trophy} label="Best rank" value={stats.data?.bestRank ? `#${stats.data.bestRank}` : '—'} />
        <ProfileStat icon={Medal} label="Leagues won" value={String(stats.data?.leaguesWon ?? 0)} />
        <ProfileStat icon={WalletCards} label="Prize earnings" value={formatMinor(stats.data?.prizeEarningsMinor ?? 0)} />
      </div>

      <PremiumCard className="referral-card">
        <span className="referral-card__icon"><Gift size={22} /></span><div><small>INVITE FRIENDS</small><strong>{referralCode}</strong><p>Share your code and grow your private league.</p></div><button onClick={() => void copyReferral()}><Copy size={17} /> {copied ? 'Copied' : 'Copy'}</button>
      </PremiumCard>

      <section><div className="section-heading"><h2>Verification</h2><Link to="/profile/verification">Manage <ChevronRight size={14} /></Link></div><PremiumCard className="verification-card">{verification.map((item) => <div key={item.label}><span className={`is-${item.status}`}>{item.status === 'verified' ? <ShieldCheck size={16} /> : <span />}</span><strong>{item.label}</strong><small>{item.status === 'verified' ? 'Verified' : item.status === 'pending' ? 'Pending' : 'Missing'}</small></div>)}</PremiumCard></section>

      <section><div className="section-heading"><h2>Account</h2></div><PremiumCard className="settings-list">
        <SettingsLink to="/notifications" icon={Bell} title="Notifications" detail="Deadlines, leagues and wallet" />
        <SettingsLink to="/profile/badge" icon={ShieldCheck} title="Team badge" detail="Customize your club identity" />
        <SettingsLink to="/profile/verification" icon={Phone} title="Phone & verification" detail={profile.data?.phoneE164 ?? 'Complete your verification'} />
        <SettingsLink to="#" icon={Globe2} title="Language" detail="English" />
        <SettingsLink to="#" icon={SlidersHorizontal} title="Preferences" detail="Theme and match alerts" />
        <SettingsLink to="#" icon={CircleHelp} title="Help & support" detail="FAQs and contact" />
      </PremiumCard></section>
      <button className="logout-button" onClick={() => void handleLogout()}><LogOut size={18} /> Sign out</button>
      <p className="profile-version">Fantasy Ethiopia · v0.2.0</p>
    </div>
  );
}

function ProfileStat({ icon: Icon, label, value }: { icon: typeof UserRound; label: string; value: string }) {
  return <StatCard icon={Icon} label={label} value={value} tone="green" />;
}
function SettingsLink({ to, icon: Icon, title, detail }: { to: string; icon: typeof MessageCircle; title: string; detail: string }) {
  return <Link to={to}><span><Icon size={18} /></span><div><strong>{title}</strong><small>{detail}</small></div><ChevronRight size={16} /></Link>;
}

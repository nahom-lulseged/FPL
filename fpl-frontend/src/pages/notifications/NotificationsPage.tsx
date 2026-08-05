import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, CircleDollarSign, Clock3, Megaphone, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PremiumCard } from '@/components/common/PremiumCard';
import { getNotifications, markNotificationRead } from '@/api/experience.api';
import type { AppNotification } from '@/types/experience';

const iconMap = { DEADLINE: Clock3, WALLET: CircleDollarSign, LEAGUE: Trophy, WINNER: Trophy, SYSTEM: Megaphone } as const;
export function NotificationsPage() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['notifications'], queryFn: getNotifications, retry: false });
  const read = useMutation({ mutationFn: markNotificationRead, onSuccess: () => client.invalidateQueries({ queryKey: ['notifications'] }) });
  const rows = query.data?.data ?? [];
  return <div className="page-stack notifications-page"><header className="page-intro"><div><p className="eyebrow">YOUR INBOX</p><h1>Notifications</h1><p>Wallet updates, gameweek reminders, and league results.</p></div><span className="data-status"><Bell size={14} /> {query.data?.unreadCount ?? 0} unread</span></header><div className="notification-list">{rows.map((item) => <NotificationRow key={item.id} item={item} onRead={() => read.mutate(item.id)} />)}{!query.isLoading && !rows.length ? <PremiumCard className="notification-empty"><CheckCheck size={32} /><h2>You are all caught up</h2><p>Important gameweek and wallet updates will appear here.</p></PremiumCard> : null}</div></div>;
}
function NotificationRow({ item, onRead }: { item: AppNotification; onRead: () => void }) { const Icon = iconMap[item.type]; const content = <PremiumCard className={`notification-row ${!item.readAt ? 'is-unread' : ''}`} onClick={!item.readAt ? onRead : undefined}><span><Icon size={19} /></span><div><strong>{item.title}</strong><p>{item.message}</p><small>{new Date(item.createdAt).toLocaleString()}</small></div>{!item.readAt ? <i /> : null}</PremiumCard>; return item.actionUrl ? <Link to={item.actionUrl}>{content}</Link> : content; }

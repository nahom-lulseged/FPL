import { Ellipsis, Home, Shield, Trophy, UserRound, WalletCards, type LucideIcon } from 'lucide-react';

export type NavigationItemConfig = {
  to: string;
  label: string;
  icon: LucideIcon;
};

export const desktopNavigation = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/team', label: 'Team', icon: Shield },
  { to: '/leagues', label: 'Leagues', icon: Trophy },
  { to: '/wallet', label: 'Wallet', icon: WalletCards },
  { to: '/profile', label: 'Profile', icon: UserRound },
] satisfies NavigationItemConfig[];

export const mobileNavigation = [
  ...desktopNavigation,
  { to: '/more', label: 'More', icon: Ellipsis },
] satisfies NavigationItemConfig[];

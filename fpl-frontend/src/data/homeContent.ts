export interface ScoutItem {
  id: string;
  title: string;
  subtitle: string;
  accent: string;
}

export interface PartnerItem {
  id: string;
  name: string;
  role: string;
}

export interface FeatureCardItem {
  id: string;
  title: string;
  description: string;
  to: string;
  variant: 'squad' | 'leagues' | 'compete';
}

export const FEATURE_CARDS: FeatureCardItem[] = [
  {
    id: 'pick-squad',
    title: 'Pick Your Squad',
    description: 'Use your budget of £100m to pick a squad of 15 players from the Premier League.',
    to: '/squad-selection',
    variant: 'squad',
  },
  {
    id: 'leagues',
    title: 'Create and Join Leagues',
    description:
      'Play against friends and family, colleagues or a web community in invitational leagues and cups.',
    to: '/leagues',
    variant: 'leagues',
  },
  {
    id: 'compete',
    title: 'Compete Against Friends',
    description:
      'Play against friends and family, colleagues or a web community in invitational leagues and cups.',
    to: '/leagues',
    variant: 'compete',
  },
];

export const SCOUT_ITEMS: ScoutItem[] = [
  {
    id: 'prices',
    title: 'PLAYER PRICE CHANGES',
    subtitle: 'FPL player price changes for the latest gameweek',
    accent: 'from-[#1a5c4a] to-[#0a3d32]',
  },
  {
    id: 'injury',
    title: 'INJURY UPDATE',
    subtitle: 'Fantasy Ethiopia — latest fitness news',
    accent: 'from-[#3d195b] to-[#1a0030]',
  },
  {
    id: 'differentials',
    title: 'DIFFERENTIAL PICKS',
    subtitle: 'Low-owned players worth considering this week',
    accent: 'from-[#004d6b] to-[#002a3d]',
  },
  {
    id: 'captain',
    title: 'CAPTAINCY PICKS',
    subtitle: 'Who to armband for the upcoming fixtures',
    accent: 'from-[#5b1940] to-[#2a0018]',
  },
  {
    id: 'fixtures',
    title: 'FIXTURE TICKER',
    subtitle: 'Best and worst runs over the next five gameweeks',
    accent: 'from-[#1a3d5b] to-[#001828]',
  },
];

export const PARTNERS: PartnerItem[] = [
  { id: 'ea', name: 'EA Sports', role: 'Lead Partner' },
  { id: 'adobe', name: 'Adobe', role: 'Official Creativity Partner' },
  { id: 'barclays', name: 'Barclays', role: 'Official Bank' },
  { id: 'coke', name: 'Coca-Cola', role: 'Official Soft Drink' },
  { id: 'guinness', name: 'Guinness', role: 'Official Beer' },
  { id: 'ms', name: 'Microsoft', role: 'Official Cloud Partner' },
  { id: 'puma', name: 'Puma', role: 'Official Licensee' },
  { id: 'avery', name: 'Avery Dennison', role: 'Official Licensee' },
  { id: 'fm', name: 'Football Manager', role: 'Official Licensee' },
  { id: 'rezzil', name: 'Rezzil', role: 'Official Licensee' },
  { id: 'sorare', name: 'Sorare', role: 'Official Licensee' },
  { id: 'topps', name: 'Topps', role: 'Official Licensee' },
];

export const FOOTER_LINK_COLUMNS = [
  {
    title: 'Premier League',
    links: [
      { label: 'Fantasy', to: '/home' },
      { label: 'Matches', to: '/fixtures' },
    ],
  },
  {
    title: 'Table',
    links: [
      { label: 'Statistics', to: '/fixtures' },
      { label: 'Latest News', to: '/home' },
    ],
  },
  {
    title: 'Latest Video',
    links: [
      { label: 'Clubs', to: '/home' },
      { label: 'Players', to: '/squad-selection' },
    ],
  },
] as const;

export const FOOTER_UTILITY_LINKS = [
  'Modern Slavery Statement',
  'Equality, Diversity and Inclusion',
  'Terms of Use',
  'Policies',
  'Cookie Policy',
  'Manage Cookies',
  'Contact Us',
] as const;

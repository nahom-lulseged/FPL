export type TelegramUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
};

export type TelegramThemeParams = {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
  header_bg_color?: string;
  bottom_bar_bg_color?: string;
};

export type TelegramMainButton = {
  setText: (text: string) => void;
  show: () => void;
  hide: () => void;
  enable: () => void;
  disable: () => void;
  showProgress: (leaveActive?: boolean) => void;
  hideProgress: () => void;
  onClick: (callback: () => void) => void;
  offClick: (callback: () => void) => void;
};

export type TelegramWebApp = {
  initData: string;
  initDataUnsafe?: { user?: TelegramUser };
  themeParams?: TelegramThemeParams;
  colorScheme?: 'light' | 'dark';
  platform?: string;
  version?: string;
  ready: () => void;
  expand: () => void;
  requestFullscreen?: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  openLink?: (url: string) => void;
  requestContact?: (callback?: (shared: boolean) => void) => void;
  requestWriteAccess?: (callback?: (granted: boolean) => void) => void;
  MainButton?: TelegramMainButton;
  BackButton?: { show: () => void; hide: () => void; onClick: (callback: () => void) => void; offClick: (callback: () => void) => void };
  HapticFeedback?: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
};

declare global {
  interface Window { Telegram?: { WebApp?: TelegramWebApp } }
}

export const TELEGRAM_PURPLE_THEME = { header: '#26002C', background: '#1F0024' } as const;

export function getTelegramWebApp(): TelegramWebApp | null {
  return typeof window === 'undefined' ? null : window.Telegram?.WebApp ?? null;
}

export function isTelegramWebApp(): boolean {
  return Boolean(getTelegramWebApp());
}

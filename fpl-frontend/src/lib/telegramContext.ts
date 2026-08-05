import { createContext } from 'react';
import type { TelegramThemeParams, TelegramUser, TelegramWebApp } from './telegramCore';

export type TelegramContextValue = {
  webApp: TelegramWebApp | null;
  initData: string;
  user: TelegramUser | null;
  themeParams: TelegramThemeParams;
  isTelegram: boolean;
  haptic: (style?: 'light' | 'medium' | 'heavy') => void;
  openExternalLink: (url: string) => void;
  requestContact: () => Promise<boolean>;
  requestWriteAccess: () => Promise<boolean>;
};

export const TelegramContext = createContext<TelegramContextValue | null>(null);

import { useEffect, useMemo, type ReactNode } from 'react';
import { TelegramContext, type TelegramContextValue } from './telegramContext';
import {
  getTelegramWebApp,
  TELEGRAM_PURPLE_THEME,
  type TelegramWebApp,
} from './telegramCore';

const initializedApps = new WeakSet<object>();

function applyTelegramTheme(webApp: TelegramWebApp): void {
  const theme = webApp.themeParams ?? {};
  const root = document.documentElement;
  root.dataset.telegramTheme = webApp.colorScheme ?? 'dark';
  const variables: Array<[string, string | undefined]> = [
    ['--tg-theme-bg-color', theme.bg_color], ['--tg-theme-text-color', theme.text_color],
    ['--tg-theme-hint-color', theme.hint_color], ['--tg-theme-link-color', theme.link_color],
    ['--tg-theme-button-color', theme.button_color], ['--tg-theme-button-text-color', theme.button_text_color],
    ['--tg-theme-secondary-bg-color', theme.secondary_bg_color],
  ];
  for (const [name, value] of variables) {
    if (value) root.style.setProperty(name, value);
    else root.style.removeProperty(name);
  }
  webApp.setHeaderColor?.(theme.header_bg_color ?? theme.bg_color ?? TELEGRAM_PURPLE_THEME.header);
  webApp.setBackgroundColor?.(theme.bg_color ?? TELEGRAM_PURPLE_THEME.background);
}

export function TelegramProvider({ children }: { children: ReactNode }) {
  const webApp = getTelegramWebApp();

  useEffect(() => {
    if (!webApp) return;
    applyTelegramTheme(webApp);
    if (!initializedApps.has(webApp)) {
      initializedApps.add(webApp);
      webApp.expand();
      webApp.ready();
    }
  }, [webApp]);

  const value = useMemo<TelegramContextValue>(() => ({
    webApp,
    initData: webApp?.initData ?? '',
    user: webApp?.initDataUnsafe?.user ?? null,
    themeParams: webApp?.themeParams ?? {},
    isTelegram: Boolean(webApp?.initData),
    haptic(style = 'light') { webApp?.HapticFeedback?.impactOccurred(style); },
    openExternalLink(url) {
      if (webApp?.openLink) webApp.openLink(url);
      else window.open(url, '_blank', 'noopener,noreferrer');
    },
    requestContact: () => new Promise((resolve) => webApp?.requestContact ? webApp.requestContact(resolve) : resolve(false)),
    requestWriteAccess: () => new Promise((resolve) => webApp?.requestWriteAccess ? webApp.requestWriteAccess(resolve) : resolve(false)),
  }), [webApp]);

  return <TelegramContext.Provider value={value}>{children}</TelegramContext.Provider>;
}

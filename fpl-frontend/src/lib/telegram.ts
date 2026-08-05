import { useContext, useEffect } from 'react';
import { TelegramProvider } from './TelegramProvider';
import { TelegramContext } from './telegramContext';

export { TelegramProvider };
export type {
  TelegramMainButton,
  TelegramThemeParams,
  TelegramUser,
  TelegramWebApp,
} from './telegramCore';

export function useTelegram() {
  const value = useContext(TelegramContext);
  if (!value) throw new Error('useTelegram must be used inside TelegramProvider');
  return value;
}

export function useTelegramMainButton(options: {
  text: string;
  visible: boolean;
  enabled: boolean;
  loading?: boolean;
  onClick: () => void;
}): void {
  const { webApp, isTelegram } = useTelegram();
  const { text, visible, enabled, loading = false, onClick } = options;

  useEffect(() => {
    const button = webApp?.MainButton;
    if (!isTelegram || !button) return;
    button.setText(text);
    if (enabled) button.enable(); else button.disable();
    if (loading) button.showProgress(false); else button.hideProgress();
    if (visible) button.show(); else button.hide();
    button.onClick(onClick);
    return () => {
      button.offClick(onClick);
      button.hideProgress();
      button.hide();
    };
  }, [enabled, isTelegram, loading, onClick, text, visible, webApp]);
}

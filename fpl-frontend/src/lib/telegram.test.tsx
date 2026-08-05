import { StrictMode } from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TelegramProvider, useTelegram, useTelegramMainButton } from './telegram';
import { isTelegramWebApp, type TelegramWebApp } from './telegramCore';

afterEach(() => {
  cleanup();
  delete window.Telegram;
  document.documentElement.removeAttribute('data-telegram-theme');
  document.documentElement.removeAttribute('style');
});

function Probe() {
  const telegram = useTelegram();
  return <span>{telegram.isTelegram ? telegram.user?.first_name : 'browser'}</span>;
}

describe('TelegramProvider', () => {
  it('is a safe no-op in a normal browser', () => {
    expect(isTelegramWebApp()).toBe(false);
    expect(render(<TelegramProvider><Probe /></TelegramProvider>).getByText('browser')).toBeInTheDocument();
  });

  it('initializes once in Strict Mode and applies theme variables', () => {
    const ready = vi.fn();
    const expand = vi.fn();
    window.Telegram = { WebApp: {
      initData: 'signed', initDataUnsafe: { user: { id: 1, first_name: 'Ada' } },
      colorScheme: 'light', themeParams: { bg_color: '#ffffff', text_color: '#111111' },
      ready, expand,
    } };
    const view = render(<StrictMode><TelegramProvider><Probe /></TelegramProvider></StrictMode>);
    expect(view.getByText('Ada')).toBeInTheDocument();
    expect(ready).toHaveBeenCalledTimes(1);
    expect(expand).toHaveBeenCalledTimes(1);
    expect(document.documentElement.style.getPropertyValue('--tg-theme-bg-color')).toBe('#ffffff');
    expect(document.documentElement.dataset.telegramTheme).toBe('light');
  });
});

describe('useTelegramMainButton', () => {
  it('synchronizes and cleans up the native button', () => {
    const button = Object.fromEntries(['setText', 'show', 'hide', 'enable', 'disable', 'showProgress', 'hideProgress', 'onClick', 'offClick'].map((name) => [name, vi.fn()]));
    window.Telegram = { WebApp: { initData: 'signed', ready: vi.fn(), expand: vi.fn(), MainButton: button } as unknown as TelegramWebApp };
    const handler = vi.fn();
    function ButtonProbe() {
      useTelegramMainButton({ text: 'Confirm Squad', visible: true, enabled: true, onClick: handler });
      return null;
    }
    const view = render(<TelegramProvider><ButtonProbe /></TelegramProvider>);
    expect(button.setText).toHaveBeenCalledWith('Confirm Squad');
    expect(button.show).toHaveBeenCalled();
    expect(button.enable).toHaveBeenCalled();
    expect(button.onClick).toHaveBeenCalledWith(handler);
    view.unmount();
    expect(button.offClick).toHaveBeenCalledWith(handler);
    expect(button.hide).toHaveBeenCalled();
  });
});

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, ShieldCheck } from 'lucide-react';
import { startTelegramAuth } from '@/api/auth.api';
import { useTelegram } from '@/lib/telegram';
import { useAuthStore } from '@/store/authStore';
import { getErrorMessage, isApiError } from '@/types/api';

const BOT_URL = 'https://t.me/FantasyEtBot';

function messageForError(error: unknown): string {
  if (isApiError(error)) {
    if (error.code === 'CONTACT_REQUIRED') {
      return 'Open @FantasyEtBot and share your phone number first, then launch the Mini App again.';
    }
    if (error.code === 'SUPPORT_CLAIM_PENDING') {
      return 'Support is reviewing your account link. Your existing team is safe, and sign-in will unlock after the review.';
    }
    if (error.code === 'INVALID_TELEGRAM_LAUNCH') {
      return 'This Telegram launch expired or could not be verified. Close the Mini App and open it again from @FantasyEtBot.';
    }
  }
  return getErrorMessage(error, 'Telegram sign-in failed');
}

export function TelegramAuthPage() {
  const { isTelegram, initData } = useTelegram();
  const setTokens = useAuthStore((state) => state.setTokens);
  const navigate = useNavigate();
  const started = useRef(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isTelegram || !initData || started.current) return;
    started.current = true;
    void startTelegramAuth(initData)
      .then((result) => {
        setTokens(result.accessToken, result.refreshToken, result.user);
        navigate(result.nextPath ?? '/home', { replace: true });
      })
      .catch((caught) => setError(messageForError(caught)));
  }, [initData, isTelegram, navigate, setTokens]);

  if (!isTelegram) {
    return (
      <main className="telegram-auth-screen">
        <section className="telegram-auth-card">
          <div className="auth-stage-icon"><MessageCircle size={34} /></div>
          <h1>Open from Telegram</h1>
          <p>Fantasy Ethiopia accounts now start in Telegram. Open @FantasyEtBot, share your contact, then launch the Mini App.</p>
          <a className="neo-button" href={BOT_URL}>Open @FantasyEtBot</a>
        </section>
      </main>
    );
  }

  return (
    <main className="telegram-auth-screen" aria-busy={!error}>
      <div className="auth-brand"><span><ShieldCheck size={28} /></span><strong>Fantasy</strong><small>ETHIOPIA</small></div>
      <section className="telegram-auth-card">
        <div className="auth-stage-icon"><MessageCircle size={34} /></div>
        <p className="eyebrow">TELEGRAM MINI APP</p>
        <h1>{error ? 'Could not sign you in' : 'Connecting your account…'}</h1>
        <p>{error || 'Verifying your Telegram identity. This should only take a moment.'}</p>
        {error ? (
          <div className="auth-action-row">
            <a className="neo-button" href={BOT_URL}>Open bot</a>
            <button className="neo-button neo-button--secondary" onClick={() => window.location.reload()}>Try again</button>
          </div>
        ) : <div className="splash-loader"><span /></div>}
      </section>
    </main>
  );
}

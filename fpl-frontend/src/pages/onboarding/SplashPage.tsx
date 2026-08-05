import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { TeamLogo } from '@/components/common/TeamLogo';
import { useAuthStore } from '@/store/authStore';
import { useTelegram } from '@/lib/telegram';

export function SplashPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const { isTelegram } = useTelegram();

  useEffect(() => {
    if (!isHydrated) return;
    const timer = window.setTimeout(() => {
      if (isAuthenticated) navigate('/home', { replace: true });
      else if (isTelegram) navigate('/telegram-auth', { replace: true });
      else navigate('/telegram-auth', { replace: true });
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [isAuthenticated, isHydrated, isTelegram, navigate]);

  return (
    <main className="splash-screen">
      <motion.div initial={{ scale: 0.82, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 150 }} className="splash-logo">
        <TeamLogo alt="Fantasy Ethiopia" eager className="splash-logo__image" />
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <strong className="splash-brand-title">Fantasy Ethiopia</strong>
      </motion.div>
      <div className="splash-loader"><span /></div>
    </main>
  );
}

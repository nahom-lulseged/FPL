import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, ShieldCheck, Trophy, WalletCards } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const slides = [
  { icon: ShieldCheck, eyebrow: 'BUILD YOUR LEGACY', title: 'Your club. Your decisions.', copy: 'Build a 15-player squad, master every gameweek, and turn football knowledge into points.', accent: 'green' },
  { icon: Trophy, eyebrow: 'WEEKLY COMPETITION', title: 'Compete for real prizes.', copy: 'Join verified weekly leagues with transparent entry fees, prize pools, and standings.', accent: 'cyan' },
  { icon: WalletCards, eyebrow: 'SECURE ETB WALLET', title: 'Win. Track. Withdraw.', copy: 'Your wallet is created automatically. Deposit with Telebirr and follow every transaction.', accent: 'gold' },
];

export function OnboardingPage() {
  const [index, setIndex] = useState(0);
  const navigate = useNavigate();
  const slide = slides[index]!;

  function continueFlow() {
    if (index < slides.length - 1) setIndex(index + 1);
    else {
      localStorage.setItem('fpl:onboarding-seen', 'true');
      navigate('/telegram-auth');
    }
  }

  return (
    <main className="onboarding-screen">
      <div className="onboarding-top"><span>FANTASY</span><button onClick={() => { localStorage.setItem('fpl:onboarding-seen', 'true'); navigate('/telegram-auth'); }}>Skip</button></div>
      <AnimatePresence mode="wait">
        <motion.section key={index} initial={{ opacity: 0, x: 35 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -35 }} transition={{ duration: 0.24 }} className="onboarding-slide">
          <div className={`onboarding-visual onboarding-visual--${slide.accent} ${index === 0 ? 'onboarding-visual--photo' : ''}`}>
            {index === 0 ? <img src="/reference/fantasy-team-hero.webp" alt="Fantasy football players" /> : <><div className="onboarding-orbit" /><slide.icon size={74} strokeWidth={1.5} /></>}
            <span className="onboarding-stat"><small>GAMEWEEK</small><strong>{index + 1}</strong></span>
          </div>
          <p className="eyebrow">{slide.eyebrow}</p>
          <h1>{slide.title}</h1>
          <p>{slide.copy}</p>
        </motion.section>
      </AnimatePresence>
      <div className="onboarding-footer">
        <div className="onboarding-dots">{slides.map((_, dot) => <span key={dot} className={dot === index ? 'is-active' : ''} />)}</div>
        <button className="neo-button" onClick={continueFlow}>{index === slides.length - 1 ? 'Continue with Telegram' : 'Continue'} <ChevronRight size={18} /></button>
      </div>
    </main>
  );
}

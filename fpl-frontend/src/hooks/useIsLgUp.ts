import { useEffect, useState } from 'react';

function getIsLgUp(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(min-width: 1024px)').matches;
}

/** True when viewport is Tailwind `lg` (≥1024px). */
export function useIsLgUp(): boolean {
  const [isLgUp, setIsLgUp] = useState(getIsLgUp);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return;
    }
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setIsLgUp(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return isLgUp;
}

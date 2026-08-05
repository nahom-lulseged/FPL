import Lenis from 'lenis';
import { useEffect, useRef, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

interface SmoothScrollProviderProps {
  children: ReactNode;
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function shouldUseNativeScroll(node: HTMLElement) {
  return Boolean(node.closest('[data-lenis-prevent]'));
}

export function SmoothScrollProvider({ children }: SmoothScrollProviderProps) {
  const location = useLocation();
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const motionQuery = window.matchMedia(REDUCED_MOTION_QUERY);

    if (motionQuery.matches) {
      return;
    }

    const lenis = new Lenis({
      autoRaf: true,
      anchors: true,
      smoothWheel: true,
      syncTouch: false,
      prevent: shouldUseNativeScroll,
    });

    lenisRef.current = lenis;

    const syncBodyLock = () => {
      if (document.body.style.overflow === 'hidden') {
        lenis.stop();
        return;
      }
      lenis.start();
    };

    const bodyObserver = new MutationObserver(syncBodyLock);
    bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['style'] });
    syncBodyLock();

    return () => {
      bodyObserver.disconnect();
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  useEffect(() => {
    const lenis = lenisRef.current;

    if (lenis) {
      lenis.stop();
      lenis.scrollTo(0, { immediate: true, force: true });
      if (document.body.style.overflow !== 'hidden') {
        lenis.start();
      }
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname]);

  return children;
}

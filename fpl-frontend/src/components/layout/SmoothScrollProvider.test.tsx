import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SmoothScrollProvider } from '@/components/layout/SmoothScrollProvider';

const { MockLenis, lenisInstances } = vi.hoisted(() => {
  const instances: Array<{
    options: Record<string, unknown>;
    destroyed: boolean;
    started: number;
    stopped: number;
    scrollTo: ReturnType<typeof vi.fn>;
    start: () => void;
    stop: () => void;
    destroy: () => void;
  }> = [];

  class LenisMock {
    options: Record<string, unknown>;
    destroyed = false;
    started = 0;
    stopped = 0;
    scrollTo = vi.fn();

    constructor(options: Record<string, unknown>) {
      this.options = options;
      instances.push(this);
    }

    start() {
      this.started += 1;
    }

    stop() {
      this.stopped += 1;
    }

    destroy() {
      this.destroyed = true;
    }
  }

  return { MockLenis: LenisMock, lenisInstances: instances };
});

vi.mock('lenis', () => ({
  default: MockLenis,
}));

function setReducedMotion(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function TestRoutes() {
  return (
    <SmoothScrollProvider>
      <Routes>
        <Route
          path="/"
          element={
            <div>
              <Link to="/next">Next</Link>
              Home
            </div>
          }
        />
        <Route path="/next" element={<div>Next page</div>} />
      </Routes>
    </SmoothScrollProvider>
  );
}

describe('SmoothScrollProvider', () => {
  beforeEach(() => {
    lenisInstances.length = 0;
    setReducedMotion(false);
    document.body.removeAttribute('style');
  });

  it('keeps only one active Lenis instance under Strict Mode', () => {
    render(
      <StrictMode>
        <MemoryRouter>
          <TestRoutes />
        </MemoryRouter>
      </StrictMode>,
    );

    const activeInstances = lenisInstances.filter((instance) => !instance.destroyed);
    expect(activeInstances).toHaveLength(1);
    expect(activeInstances[0]?.options).toMatchObject({
      autoRaf: true,
      anchors: true,
      smoothWheel: true,
      syncTouch: false,
    });
  });

  it('stops inertia and restores the top immediately when the route changes', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <TestRoutes />
      </MemoryRouter>,
    );

    const lenis = lenisInstances[0];
    await user.click(screen.getByRole('link', { name: 'Next' }));

    expect(screen.getByText('Next page')).toBeInTheDocument();
    expect(lenis?.stopped).toBeGreaterThan(0);
    expect(lenis?.scrollTo).toHaveBeenCalledWith(0, { immediate: true, force: true });
  });

  it('uses native scrolling for reduced-motion users', () => {
    setReducedMotion(true);
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);

    render(
      <MemoryRouter>
        <TestRoutes />
      </MemoryRouter>,
    );

    expect(lenisInstances).toHaveLength(0);
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });
    scrollTo.mockRestore();
  });
});

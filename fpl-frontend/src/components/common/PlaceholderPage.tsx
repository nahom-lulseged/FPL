import type { ReactNode } from 'react';

interface PlaceholderPageProps {
  title: string;
  phase?: string;
  children?: ReactNode;
}

export function PlaceholderPage({ title, phase, children }: PlaceholderPageProps) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold text-white">{title}</h1>
      {phase ? <p className="mt-2 text-white/60">Coming in {phase}.</p> : null}
      {children ? <div className="mt-6">{children}</div> : null}
    </div>
  );
}

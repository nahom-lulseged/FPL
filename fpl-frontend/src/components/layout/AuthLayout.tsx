import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-fpl-dark via-fpl-purple to-fpl-dark px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-fpl-purple/40 p-8 shadow-2xl backdrop-blur">
        <div className="mb-8 text-center">
          <Link to="/" className="text-2xl font-bold text-fpl-green">
            Fantasy PL
          </Link>
          <h1 className="mt-4 text-xl font-semibold text-white">{title}</h1>
          {subtitle ? <p className="mt-2 text-sm text-white/70">{subtitle}</p> : null}
        </div>
        {children}
        {footer ? <div className="mt-6 text-center text-sm text-white/70">{footer}</div> : null}
      </div>
    </div>
  );
}

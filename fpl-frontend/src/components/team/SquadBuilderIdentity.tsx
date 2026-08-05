import { useAuthStore } from '@/store/authStore';

export function SquadBuilderIdentity() {
  const displayName = useAuthStore((s) => s.user?.displayName ?? s.user?.email ?? 'Manager');

  return (
    <div className="squad-builder-identity min-w-0 space-y-2 md:pl-[12%]">
      <p className="text-xl font-extrabold text-white">Manager&apos;s Team</p>
      <div className="flex items-center gap-2.5">
        <span
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-fpl-green text-xs font-extrabold text-fpl-purple"
          aria-hidden="true"
        >
          M
        </span>
        <span className="truncate text-lg text-[var(--premium-text-secondary)]">{displayName}</span>
      </div>
    </div>
  );
}

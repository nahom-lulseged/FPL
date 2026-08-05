interface InlineSquadBannerProps {
  playerName: string;
  action?: 'added' | 'removed';
}

export function InlineAddBanner({ playerName, action = 'added' }: InlineSquadBannerProps) {
  const message =
    action === 'removed' ? 'has been removed from your squad' : 'has been added to your squad';

  return (
    <div
      className="relative whitespace-nowrap rounded-lg bg-white px-4 py-2 text-center text-sm text-[#37003c] shadow-lg shadow-black/20"
      role="status"
    >
      <span className="font-bold">{playerName}</span> {message}
      <span
        className="absolute left-1/2 top-full -translate-x-1/2 border-x-8 border-t-8 border-x-transparent border-t-white"
        aria-hidden
      />
    </div>
  );
}

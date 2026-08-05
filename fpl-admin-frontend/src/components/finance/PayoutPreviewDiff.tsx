interface PayoutPreviewDiffProps {
  preview: {
    leagueName: string;
    potTotalMinor: number;
    platformCommissionMinor: number;
    distributableMinor: number;
    winners: Array<{ managerName: string; rank: number; amountMinor: number }>;
  };
}

export function PayoutPreviewDiff({ preview }: PayoutPreviewDiffProps) {
  return (
    <div className="space-y-2 text-sm">
      <p className="font-semibold">{preview.leagueName}</p>
      <p>Pot: {(preview.potTotalMinor / 100).toFixed(2)} ETB</p>
      <p>Commission: {(preview.platformCommissionMinor / 100).toFixed(2)} ETB</p>
      <p>Distributable: {(preview.distributableMinor / 100).toFixed(2)} ETB</p>
      <ul className="mt-2 space-y-1">
        {preview.winners.map((w) => (
          <li key={w.rank}>
            #{w.rank} {w.managerName}: {(w.amountMinor / 100).toFixed(2)} ETB
          </li>
        ))}
      </ul>
    </div>
  );
}

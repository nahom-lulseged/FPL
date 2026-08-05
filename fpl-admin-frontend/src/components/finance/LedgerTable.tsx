interface LedgerEntry {
  id: string;
  amountMinor: number;
  direction: string;
  entryType: string;
  createdAt: string;
}

interface LedgerTableProps {
  entries: LedgerEntry[];
}

export function LedgerTable({ entries }: LedgerTableProps) {
  if (entries.length === 0) {
    return <p className="text-sm text-fpl-gray-500">No ledger entries.</p>;
  }

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-fpl-gray-200 text-fpl-gray-500">
          <th className="py-2">Date</th>
          <th className="py-2">Type</th>
          <th className="py-2">Amount</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((e) => (
          <tr key={e.id} className="border-b border-fpl-gray-100">
            <td className="py-2">{new Date(e.createdAt).toLocaleString()}</td>
            <td className="py-2">{e.entryType}</td>
            <td className="py-2">
              {e.direction === 'CREDIT' ? '+' : '-'}
              {(e.amountMinor / 100).toFixed(2)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

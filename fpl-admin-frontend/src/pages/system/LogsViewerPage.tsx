import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { useSystemLogs } from '@/hooks/useSystem';

const levelColors: Record<string, string> = {
  error: 'bg-fpl-pink/10 text-fpl-pink',
  warn: 'bg-amber-100 text-amber-700',
  info: 'bg-fpl-gray-100 text-fpl-gray-700',
  debug: 'bg-fpl-gray-100 text-fpl-gray-500',
};

export function LogsViewerPage() {
  const [level, setLevel] = useState<'error' | 'warn' | 'info' | ''>('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useSystemLogs({
    level: level || undefined,
    search: debouncedSearch || undefined,
    limit: 200,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value as typeof level)}
          className="rounded-md border border-fpl-gray-200 px-3 py-2 text-sm"
        >
          <option value="">All levels</option>
          <option value="error">Error</option>
          <option value="warn">Warn</option>
          <option value="info">Info</option>
        </select>
        <input
          type="search"
          placeholder="Search messages…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[200px] flex-1 rounded-md border border-fpl-gray-200 px-3 py-2 text-sm"
        />
      </div>

      <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-fpl-gray-200 bg-white">
        {isLoading ? (
          <p className="p-4 text-sm text-fpl-gray-500">Loading logs…</p>
        ) : data?.logs.length === 0 ? (
          <p className="p-4 text-sm text-fpl-gray-500">No log entries found.</p>
        ) : (
          <ul className="divide-y divide-fpl-gray-100">
            {data?.logs.map((entry, index) => (
              <li key={`${entry.time}-${index}`} className="px-4 py-3 font-mono text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-fpl-gray-500">{entry.time}</span>
                  <span
                    className={clsx(
                      'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase',
                      levelColors[entry.level] ?? levelColors.info,
                    )}
                  >
                    {entry.level}
                  </span>
                </div>
                <p className="mt-1 text-fpl-gray-900">{entry.msg}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

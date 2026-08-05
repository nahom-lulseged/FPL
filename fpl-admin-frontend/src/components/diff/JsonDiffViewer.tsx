import { useMemo } from 'react';

interface JsonDiffViewerProps {
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  title?: string;
}

interface FlatEntry {
  path: string;
  before?: unknown;
  after?: unknown;
  type: 'added' | 'removed' | 'changed' | 'unchanged';
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function flattenObject(
  obj: Record<string, unknown>,
  prefix = '',
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (isPlainObject(value)) {
      Object.assign(result, flattenObject(value, path));
    } else {
      result[path] = value;
    }
  }

  return result;
}

function formatValue(value: unknown): string {
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (value === null || value === undefined) {
    return '—';
  }
  return String(value);
}

function buildDiffEntries(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): FlatEntry[] {
  const flatBefore = flattenObject(before);
  const flatAfter = flattenObject(after);
  const keys = new Set([...Object.keys(flatBefore), ...Object.keys(flatAfter)]);

  return [...keys]
    .sort()
    .map((path) => {
      const b = flatBefore[path];
      const a = flatAfter[path];
      const hasBefore = path in flatBefore;
      const hasAfter = path in flatAfter;

      if (hasBefore && !hasAfter) {
        return { path, before: b, type: 'removed' as const };
      }
      if (!hasBefore && hasAfter) {
        return { path, after: a, type: 'added' as const };
      }
      if (b !== a) {
        return { path, before: b, after: a, type: 'changed' as const };
      }
      return { path, before: b, after: a, type: 'unchanged' as const };
    })
    .filter((entry) => entry.type !== 'unchanged');
}

export function JsonDiffViewer({ before, after, title }: JsonDiffViewerProps) {
  const entries = useMemo(() => buildDiffEntries(before, after), [before, after]);

  if (entries.length === 0) {
    return (
      <div className="rounded-md border border-fpl-gray-200 bg-fpl-gray-50 p-3 text-sm text-fpl-gray-500">
        {title ? <p className="mb-1 font-medium text-fpl-gray-700">{title}</p> : null}
        No differences
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-fpl-gray-200">
      {title ? (
        <div className="border-b border-fpl-gray-200 bg-fpl-gray-50 px-3 py-2 text-sm font-medium text-fpl-gray-800">
          {title}
        </div>
      ) : null}
      <div className="divide-y divide-fpl-gray-100 font-mono text-xs">
        {entries.map((entry) => (
          <div key={entry.path} className="grid grid-cols-[1fr_auto_1fr] gap-2 px-3 py-2">
            <span className="col-span-3 text-[11px] text-fpl-gray-500">{entry.path}</span>
            {entry.type === 'removed' || entry.type === 'changed' ? (
              <span className="rounded bg-red-50 px-2 py-1 text-red-700 line-through">
                {formatValue(entry.before)}
              </span>
            ) : (
              <span />
            )}
            {entry.type === 'changed' ? (
              <span className="self-center text-fpl-gray-400">→</span>
            ) : (
              <span />
            )}
            {entry.type === 'added' || entry.type === 'changed' ? (
              <span className="rounded bg-green-50 px-2 py-1 text-green-700">
                {formatValue(entry.after)}
              </span>
            ) : (
              <span />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

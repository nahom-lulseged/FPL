import { getClubColor } from '@/lib/clubColors';

const jerseyCache = new Map<string, string>();

export function getJerseyDataUri(shortName: string): string {
  const code = shortName.toUpperCase();
  const cached = jerseyCache.get(code);
  if (cached) {
    return cached;
  }

  const colors = getClubColor(code);
  const label = code.slice(0, 3).replace(/[^A-Z0-9]/g, 'FPL');
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 112" role="img">
      <defs>
        <linearGradient id="body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${colors.bg}" stop-opacity="1"/>
          <stop offset="1" stop-color="${colors.bg}" stop-opacity=".78"/>
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#000" flood-opacity=".28"/>
        </filter>
      </defs>
      <g filter="url(#shadow)">
        <path d="M31 13 15 20 2 44l17 9 9-13v61h44V40l9 13 17-9-13-24-16-7c-4 6-10 9-19 9s-15-3-19-9Z" fill="url(#body)"/>
        <path d="M31 13c3 7 9 11 19 11s16-4 19-11l-10-4c-2 4-5 6-9 6s-7-2-9-6l-10 4Z" fill="${colors.text}"/>
        <path d="M40 10c2 5 5 7 10 7s8-2 10-7" fill="none" stroke="${colors.bg}" stroke-width="4" stroke-linecap="round"/>
        <path d="m2 44 17 9 4-7-17-9-4 7Zm96 0-17 9-4-7 17-9 4 7Z" fill="${colors.text}" opacity=".95"/>
        <path d="M31 13 22 17l6 23M69 13l9 4-6 23" fill="none" stroke="#fff" stroke-opacity=".15" stroke-width="2"/>
        <path d="M34 31h32" stroke="#fff" stroke-opacity=".12" stroke-width="2"/>
        <text x="50" y="61" fill="${colors.text}" font-family="Arial, sans-serif" font-size="14" font-weight="800" text-anchor="middle" dominant-baseline="middle" letter-spacing="1">${label}</text>
        <path d="M31 92h38" stroke="${colors.text}" stroke-opacity=".3" stroke-width="2"/>
      </g>
    </svg>`;
  const dataUri = `data:image/svg+xml,${encodeURIComponent(svg)}`;

  jerseyCache.set(code, dataUri);
  return dataUri;
}

const teamWorkflowPrefixes = [
  '/team',
  '/my-team',
  '/squad-selection',
  '/transfers',
  '/players',
] as const;

export function isTeamWorkflowPath(pathname: string) {
  return teamWorkflowPrefixes.some(
    (prefix) => pathname === prefix || pathname.indexOf(`${prefix}/`) === 0,
  );
}

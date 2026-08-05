import { useState } from 'react';
import { Button } from '@/components/common/Button';

interface InviteCodePanelProps {
  inviteCode: string;
}

export function InviteCodePanel({ inviteCode }: InviteCodePanelProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="rounded-lg border border-white/10 bg-fpl-purple/40 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">Invite code</h2>
      <p className="mt-1 text-sm text-white/70">
        Share this code with friends so they can join your league.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <code className="rounded-md bg-black/30 px-3 py-2 font-mono text-lg tracking-widest text-fpl-green">
          {inviteCode}
        </code>
        <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={handleCopy}>
          {copied ? 'Copied!' : 'Copy code'}
        </Button>
      </div>
    </div>
  );
}

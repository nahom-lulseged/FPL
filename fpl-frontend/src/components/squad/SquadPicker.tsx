import { SquadBuilderView } from '@/components/team/SquadBuilderView';
import { TransfersView } from '@/components/transfers/TransfersView';
import type { Gameweek } from '@/types/gameweek';
import type { TeamDetail } from '@/types/team';

type SquadPickerMode =
  | { mode: 'build' }
  | { mode: 'transfer'; team: TeamDetail };

interface SquadPickerProps {
  mode: SquadPickerMode;
  selectedGameweek?: Gameweek | null;
  onCompleted: () => void | Promise<void>;
}

export function SquadPicker({ mode, selectedGameweek, onCompleted }: SquadPickerProps) {
  if (mode.mode === 'build') {
    return (
      <SquadBuilderView
        selectedGameweek={selectedGameweek}
        onTeamCreated={() => void onCompleted()}
      />
    );
  }

  return <TransfersView team={mode.team} selectedGameweek={selectedGameweek} onUpdated={() => void onCompleted()} />;
}

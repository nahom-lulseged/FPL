import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { WorkflowSegmentedControl } from '@/components/team/TeamWorkflowUi';

function SegmentedFixture() {
  const [value, setValue] = useState<'pitch' | 'list'>('pitch');
  return (
    <WorkflowSegmentedControl
      value={value}
      label="Squad view"
      options={[
        { value: 'pitch', label: 'Pitch' },
        { value: 'list', label: 'List' },
      ]}
      onChange={setValue}
    />
  );
}

describe('WorkflowSegmentedControl', () => {
  it('exposes tab semantics and supports arrow-key selection', async () => {
    const user = userEvent.setup();
    render(<SegmentedFixture />);

    const pitch = screen.getByRole('tab', { name: 'Pitch' });
    const list = screen.getByRole('tab', { name: 'List' });
    expect(pitch).toHaveAttribute('aria-selected', 'true');
    expect(pitch).toHaveAttribute('tabindex', '0');
    expect(list).toHaveAttribute('tabindex', '-1');

    pitch.focus();
    await user.keyboard('{ArrowRight}');

    expect(list).toHaveFocus();
    expect(list).toHaveAttribute('aria-selected', 'true');
    expect(list).toHaveAttribute('tabindex', '0');
  });
});

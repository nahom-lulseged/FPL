import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from '@/components/common/Modal';

describe('Modal bottom-sheet behavior', () => {
  it('dismisses from the backdrop and Escape and restores scroll', () => {
    const onClose = vi.fn();
    const { rerender } = render(<Modal open onClose={onClose} title="Sheet" placement="bottom">Body</Modal>);
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('presentation'));
    expect(onClose).toHaveBeenCalledTimes(2);
    rerender(<Modal open={false} onClose={onClose} title="Sheet" placement="bottom">Body</Modal>);
    expect(document.body.style.overflow).toBe('');
  });

  it('dismisses after a downward handle swipe', () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Sheet" placement="bottom" swipeToDismiss>
        <div data-swipe-handle>Drag</div>
      </Modal>,
    );
    const handle = screen.getByText('Drag');
    const dialog = screen.getByRole('dialog');
    fireEvent.pointerDown(handle, { clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(dialog, { clientY: 210, pointerId: 1 });
    fireEvent.pointerUp(dialog, { clientY: 210, pointerId: 1 });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

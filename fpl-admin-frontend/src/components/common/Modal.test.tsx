import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal';

describe('Modal accessibility', () => {
  it('closes with Escape and exposes a modal dialog', () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="Review deposit"><button>Approve</button></Modal>);
    expect(screen.getByRole('dialog', { name: 'Review deposit' })).toHaveAttribute('aria-modal', 'true');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });
});

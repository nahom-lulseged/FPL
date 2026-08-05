import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DataTable } from './DataTable';

describe('DataTable responsive semantics', () => {
  it('adds field labels used by mobile summary cards', () => {
    render(<DataTable columns={[{ key: 'name', label: 'User' }, { key: 'status', label: 'Status' }]} data={[{ id: '1', name: 'Nahom', status: 'Active' }]} meta={{ page: 1, limit: 20, total: 1, totalPages: 1 }} onPageChange={vi.fn()} getRowId={(row) => row.id} />);
    expect(screen.getByText('Nahom').closest('td')).toHaveAttribute('data-label', 'User');
    expect(screen.getByText('Active').closest('td')).toHaveAttribute('data-label', 'Status');
  });
});

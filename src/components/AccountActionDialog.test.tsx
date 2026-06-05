// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AccountActionDialog from './AccountActionDialog';

afterEach(() => {
  cleanup();
});

describe('AccountActionDialog', () => {
  it('shows delete copy and confirms the action', () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();

    render(
      <AccountActionDialog
        visible
        action='delete'
        accountName='Stake-Mari'
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );

    expect(
      screen.getByText('Delete Stake-Mari permanently?')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'This permanently removes the account from the app. It only works when the account has no positions or snapshots.'
      )
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('shows close copy and cancels the action', () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();

    render(
      <AccountActionDialog
        visible
        action='close'
        accountName='Stake-Mari'
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByText('Close Stake-Mari?')).toBeInTheDocument();
    expect(
      screen.getByText(
        'This archives the account. You can reopen it later and your history will be preserved.'
      )
    ).toBeInTheDocument();

    // PrimeReact may render duplicate Cancel buttons; take the last (most recent)
    const buttons = screen.getAllByText('Cancel');
    const cancelButton = buttons[buttons.length - 1].closest('button');
    if (!cancelButton) throw new Error('Cancel button not found');
    fireEvent.click(cancelButton);
    expect(onCancel).toHaveBeenCalledOnce();
  });
});

// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AccountsBar from './AccountsBar';
import type { TradingAccount } from '@/lib/types';

afterEach(() => {
  cleanup();
});

const activeAccounts: TradingAccount[] = [
  { id: 'acc-1', name: 'Account 1', status: 'ACTIVE' },
  { id: 'acc-2', name: 'Account 2', status: 'ACTIVE' },
];

const closedAccounts: TradingAccount[] = [
  { id: 'acc-3', name: 'Old Account', status: 'CLOSED' },
];

function renderBar(overrides: Partial<Parameters<typeof AccountsBar>[0]> = {}) {
  const props = {
    activeAccounts,
    closedAccounts: [],
    selectedAccountId: 'acc-1',
    onSelectAccount: vi.fn(),
    onAddAccount: vi.fn(),
    onRenameAccount: vi.fn(),
    onCloseAccount: vi.fn(),
    onDeleteAccount: vi.fn(),
    onReopenAccount: vi.fn(),
    ...overrides,
  };
  render(<AccountsBar {...props} />);
  return props;
}

describe('AccountsBar', () => {
  it('renders a chip per active account with a single actions trigger', () => {
    renderBar();

    expect(
      screen.getByRole('button', { name: 'Account 1' })
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: /Actions for account/ })
    ).toHaveLength(2);
  });

  it('selects an account when its chip is clicked', () => {
    const props = renderBar();

    fireEvent.click(screen.getByRole('button', { name: 'Account 2' }));

    expect(props.onSelectAccount).toHaveBeenCalledWith('acc-2');
  });

  it('opens the kebab menu with Rename/Close/Delete for an active account', () => {
    const props = renderBar();

    fireEvent.click(
      screen.getByRole('button', { name: 'Actions for account Account 1' })
    );
    fireEvent.click(screen.getByText('Rename'));
    expect(props.onRenameAccount).toHaveBeenCalledWith(activeAccounts[0]);

    fireEvent.click(
      screen.getByRole('button', { name: 'Actions for account Account 1' })
    );
    fireEvent.click(screen.getByText('Close'));
    expect(props.onCloseAccount).toHaveBeenCalledWith(activeAccounts[0]);

    fireEvent.click(
      screen.getByRole('button', { name: 'Actions for account Account 1' })
    );
    fireEvent.click(screen.getByText('Delete permanently'));
    expect(props.onDeleteAccount).toHaveBeenCalledWith(activeAccounts[0]);
  });

  it('triggers onAddAccount from the add button', () => {
    const props = renderBar();

    fireEvent.click(screen.getByRole('button', { name: 'Add Account' }));

    expect(props.onAddAccount).toHaveBeenCalledOnce();
  });

  it('hides the manage-closed-accounts button when there are no closed accounts', () => {
    renderBar({ closedAccounts: [] });

    expect(
      screen.queryByRole('button', { name: 'Manage closed accounts' })
    ).not.toBeInTheDocument();
  });

  it('opens the manage-closed-accounts dialog and reopens/deletes an account', () => {
    const props = renderBar({ closedAccounts });

    fireEvent.click(
      screen.getByRole('button', { name: 'Manage closed accounts' })
    );

    expect(screen.getByText('Old Account')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reopen' }));
    expect(props.onReopenAccount).toHaveBeenCalledWith(closedAccounts[0]);

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(props.onDeleteAccount).toHaveBeenCalledWith(closedAccounts[0]);
  });
});

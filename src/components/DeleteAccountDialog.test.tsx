// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import DeleteAccountDialog from './DeleteAccountDialog';

afterEach(() => {
  cleanup();
});

function renderDialog(overrides: Partial<{ loading: boolean; error: string }>) {
  const onCancel = vi.fn();
  const onConfirm = vi.fn();

  render(
    <DeleteAccountDialog
      visible
      email='alice@example.com'
      onCancel={onCancel}
      onConfirm={onConfirm}
      {...overrides}
    />
  );

  return { onCancel, onConfirm };
}

describe('DeleteAccountDialog', () => {
  it('keeps the delete button disabled until the email and password match', () => {
    const { onConfirm } = renderDialog({});

    const deleteButton = screen.getByRole('button', {
      name: 'Delete my account',
    });
    expect(deleteButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/to confirm/i), {
      target: { value: 'alice@example.com' },
    });
    expect(deleteButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Current password'), {
      target: { value: 'hunter22' },
    });
    expect(deleteButton).toBeEnabled();

    fireEvent.click(deleteButton);
    expect(onConfirm).toHaveBeenCalledWith('hunter22');
  });

  it('rejects a mismatched email confirmation', () => {
    renderDialog({});

    fireEvent.change(screen.getByLabelText(/to confirm/i), {
      target: { value: 'someone-else@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Current password'), {
      target: { value: 'hunter22' },
    });

    expect(
      screen.getByRole('button', { name: 'Delete my account' })
    ).toBeDisabled();
  });

  it('warns that tax records may only exist in the app', () => {
    renderDialog({});

    expect(screen.getByText(/five years/i)).toBeInTheDocument();
    expect(
      screen.getByText(/30 days to change your mind/i)
    ).toBeInTheDocument();
  });

  it('surfaces a server error', () => {
    renderDialog({ error: 'Current password is incorrect' });

    expect(
      screen.getByText('Current password is incorrect')
    ).toBeInTheDocument();
  });
});

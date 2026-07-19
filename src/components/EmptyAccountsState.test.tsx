// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import EmptyAccountsState from './EmptyAccountsState';

afterEach(() => {
  cleanup();
});

describe('EmptyAccountsState', () => {
  it('renders a welcome message and CTA button', () => {
    render(<EmptyAccountsState onCreateAccount={vi.fn()} />);

    expect(screen.getByText('Welcome to Truffles')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Create your first account' })
    ).toBeInTheDocument();
  });

  it('calls onCreateAccount when the CTA is clicked', () => {
    const onCreateAccount = vi.fn();
    render(<EmptyAccountsState onCreateAccount={onCreateAccount} />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Create your first account' })
    );

    expect(onCreateAccount).toHaveBeenCalledOnce();
  });
});

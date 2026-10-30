// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  login: vi.fn(),
  restore: vi.fn(),
  push: vi.fn(),
}));
vi.mock('@/hooks/api', () => ({
  useLogin: () => ({ mutateAsync: m.login, isPending: false }),
  useRestoreAccount: () => ({ mutateAsync: m.restore, isPending: false }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: m.push }) }));

import LoginPage from './page';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('LoginPage', () => {
  it('offers restoration when the account is pending deletion', async () => {
    m.login.mockRejectedValue({
      response: {
        data: {
          code: 'accountPendingDeletion',
          purgeAfter: '2026-01-05T12:00:00Z',
        },
      },
    });
    render(<LoginPage />);
    fireEvent.change(screen.getByPlaceholderText('Enter your email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter your password'), {
      target: { value: 'password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(
      await screen.findByText('This account is scheduled for deletion')
    ).toBeInTheDocument();
    expect(
      screen.getByText(/permanently erased on 05\/01\/2026/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Restore my account' })
    ).toBeInTheDocument();
  });
});

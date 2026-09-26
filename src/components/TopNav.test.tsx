// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrivacyProvider } from '@/lib/privacy-context';

const { mockRouter, logoutMock, clearClientSessionMock } = vi.hoisted(() => ({
  mockRouter: { replace: vi.fn() },
  logoutMock: vi.fn(),
  clearClientSessionMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => mockRouter,
}));

vi.mock('@/hooks/api', () => ({
  useCurrentUser: () => ({ data: { name: 'Jane Doe' } }),
  useLogout: () => ({ mutateAsync: logoutMock }),
}));

vi.mock('@/lib/offline-write-queue', () => ({
  getQueuedWritesCount: () => 0,
  OFFLINE_WRITE_QUEUE_CHANGED_EVENT: 'truffles:offline-write-queue-changed',
  syncQueuedWritesNow: vi.fn(async () => ({ processed: 0, remaining: 0 })),
}));

vi.mock('@/lib/session', () => ({
  clearClientSession: clearClientSessionMock,
}));

vi.mock('@/lib/toast-context', () => ({
  useToast: () => ({ show: vi.fn() }),
}));

import TopNav from './TopNav';

function renderTopNav() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <PrivacyProvider initialHidden>
        <TopNav />
      </PrivacyProvider>
    </QueryClientProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  logoutMock.mockResolvedValue(undefined);
  clearClientSessionMock.mockResolvedValue(undefined);
});

describe('TopNav privacy toggle', () => {
  it('starts hidden and flips to visible on click', () => {
    renderTopNav();

    const button = screen.getByRole('button', { name: 'Show values' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button.querySelector('i')).toHaveClass('pi-eye-slash');

    fireEvent.click(button);

    const toggled = screen.getByRole('button', { name: 'Hide values' });
    expect(toggled).toHaveAttribute('aria-pressed', 'false');
    expect(toggled.querySelector('i')).toHaveClass('pi-eye');
  });

  it('hides values again on sign-out', async () => {
    renderTopNav();

    fireEvent.click(screen.getByRole('button', { name: 'Show values' }));
    expect(
      screen.getByRole('button', { name: 'Hide values' })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(
      await screen.findByRole('button', { name: 'Show values' })
    ).toBeInTheDocument();
    expect(clearClientSessionMock).toHaveBeenCalledOnce();
  });
});

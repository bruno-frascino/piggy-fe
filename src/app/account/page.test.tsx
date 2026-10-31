// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ThemeProvider } from '@/lib/theme-context';
import { THEME_STORAGE_KEY } from '@/lib/theme';

const { user, update, router } = vi.hoisted(() => ({
  user: {
    id: 'u1',
    name: 'Preview User',
    email: 'preview@example.test',
    baseCurrency: 'AUD',
  },
  update: vi.fn(),
  router: { replace: vi.fn() },
}));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/hooks/api', () => ({
  useCurrentUser: () => ({ data: user, isLoading: false }),
  useUpdateCurrentUser: () => ({ mutateAsync: update, isPending: false }),
  useDeleteCurrentUser: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('@/lib/privacy-context', () => ({
  usePrivacy: () => ({ hide: vi.fn() }),
}));
import AccountPage from './page';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  document.documentElement.style.colorScheme = '';
});

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
});

function renderAccount() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <ThemeProvider>
        <AccountPage />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

it('keeps unchanged profile saving disabled and exposes account deletion confirmation', () => {
  renderAccount();
  expect(screen.getByRole('button', { name: 'Save Profile' })).toBeDisabled();
  expect(screen.getByDisplayValue('preview@example.test')).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));
  expect(
    screen.getByRole('dialog', { name: 'Delete your account' })
  ).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'Delete my account' })
  ).toBeDisabled();
});

it('defaults appearance to System and saves profile appearance immediately without a profile mutation', () => {
  renderAccount();
  const appearance = screen.getByRole('combobox', { name: 'Appearance' });
  expect(appearance).toHaveValue('system');
  expect(appearance.closest('.p-card')).toHaveTextContent('Profile Details');
  fireEvent.change(appearance, { target: { value: 'dark' } });
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  expect(screen.getByRole('button', { name: 'Save Profile' })).toBeDisabled();
  expect(update).not.toHaveBeenCalled();
  fireEvent.change(appearance, { target: { value: 'system' } });
  expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('system');
});

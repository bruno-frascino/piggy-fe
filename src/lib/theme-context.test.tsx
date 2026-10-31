// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider, useTheme } from './theme-context';
import { themeBootstrap, THEME_STORAGE_KEY } from './theme';
import ThemePicker from '@/components/ThemePicker';

let systemDark = false;
let changeListener: (() => void) | undefined;

function State() {
  const { resolvedTheme } = useTheme();
  return <output aria-label='Resolved theme'>{resolvedTheme}</output>;
}

function renderTheme() {
  return render(
    <ThemeProvider>
      <ThemePicker />
      <State />
    </ThemeProvider>
  );
}

beforeEach(() => {
  systemDark = false;
  changeListener = undefined;
  localStorage.clear();
  const link = document.createElement('link');
  link.id = 'truffles-dark-theme';
  document.head.append(link);
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      get matches() {
        return systemDark;
      },
      addEventListener: (_event: string, listener: () => void) => {
        changeListener = listener;
      },
      removeEventListener: vi.fn(),
    }))
  );
});

afterEach(() => {
  cleanup();
  document.getElementById('truffles-dark-theme')?.remove();
  delete document.documentElement.dataset.theme;
  document.documentElement.style.colorScheme = '';
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('appearance preferences', () => {
  it('defaults to the system and follows OS changes', () => {
    renderTheme();
    expect(screen.getByLabelText('Appearance')).toHaveValue('system');
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    systemDark = true;
    act(() => changeListener?.());
    expect(screen.getByLabelText('Resolved theme')).toHaveTextContent('dark');
    expect(document.getElementById('truffles-dark-theme')).toHaveAttribute(
      'media',
      'all'
    );
  });

  it('persists an explicit selection and ignores subsequent OS changes', () => {
    renderTheme();
    fireEvent.change(screen.getByLabelText('Appearance'), {
      target: { value: 'dark' },
    });
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    act(() => changeListener?.());
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    fireEvent.change(screen.getByLabelText('Appearance'), {
      target: { value: 'light' },
    });
    expect(document.getElementById('truffles-dark-theme')).toHaveAttribute(
      'media',
      'not all'
    );
  });

  it('restores a saved preference on mount', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    renderTheme();
    expect(screen.getByLabelText('Appearance')).toHaveValue('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('uses the system for an invalid saved value and syncs changes across tabs', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'invalid');
    renderTheme();
    expect(screen.getByLabelText('Appearance')).toHaveValue('system');
    act(() =>
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: THEME_STORAGE_KEY,
          newValue: 'dark',
        })
      )
    );
    expect(screen.getByLabelText('Appearance')).toHaveValue('dark');
    act(() =>
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: THEME_STORAGE_KEY,
          newValue: null,
        })
      )
    );
    expect(screen.getByLabelText('Appearance')).toHaveValue('system');
  });

  it('keeps working in memory when storage is unavailable and reports the failure', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    renderTheme();
    fireEvent.change(screen.getByLabelText('Appearance'), {
      target: { value: 'dark' },
    });
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('sets the correct palette before React mounts', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    const script = document.createElement('script');
    script.textContent = themeBootstrap;
    document.head.append(script);
    // jsdom does not execute inserted scripts; execute the trusted app bootstrap.
    window.eval(themeBootstrap);
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(document.getElementById('truffles-dark-theme')).toHaveAttribute(
      'media',
      'all'
    );
    script.remove();
  });
});

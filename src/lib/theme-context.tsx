'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import {
  isThemePreference,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from './theme';
export type { ThemePreference } from './theme';
type ResolvedTheme = 'light' | 'dark';

const ThemeContext = createContext<{
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (value: ThemePreference) => void;
} | null>(null);

function applyTheme(preference: ThemePreference): ResolvedTheme {
  const resolved =
    preference === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : preference;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
  const darkStyles = document.getElementById('truffles-dark-theme');
  darkStyles?.setAttribute('media', resolved === 'dark' ? 'all' : 'not all');
  return resolved;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    } catch (error) {
      console.warn('Theme preference storage is unavailable.', error);
    }
    const initial = isThemePreference(stored) ? stored : 'system';
    setPreferenceState(initial);
    setResolvedTheme(applyTheme(initial));
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const updateSystem = () => {
      if (preference === 'system') {
        setResolvedTheme(applyTheme('system'));
      }
    };
    const updateStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
      const next = isThemePreference(event.newValue)
        ? event.newValue
        : 'system';
      setPreferenceState(next);
      setResolvedTheme(applyTheme(next));
    };
    media.addEventListener('change', updateSystem);
    window.addEventListener('storage', updateStorage);
    return () => {
      media.removeEventListener('change', updateSystem);
      window.removeEventListener('storage', updateStorage);
    };
  }, [preference]);

  const setPreference = (next: ThemePreference) => {
    if (typeof window === 'undefined') return;
    setPreferenceState(next);
    setResolvedTheme(applyTheme(next));
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch (error) {
      console.warn(
        'Theme preference could not be saved; using this session.',
        error
      );
    }
  };

  return (
    <ThemeContext.Provider value={{ preference, resolvedTheme, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}

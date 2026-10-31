export type ThemePreference = 'light' | 'dark' | 'system';
export const THEME_STORAGE_KEY = 'truffles-theme';

export const CHART_COLORS = {
  light: {
    line: '#2563eb',
    fill: 'rgba(37,99,235,0.1)',
    text: '#586579',
    grid: '#e2e6ed',
    surface: '#ffffff',
    success: '#087c50',
    successFill: 'rgba(8,124,80,0.12)',
    previous: '#68758a',
  },
  dark: {
    line: '#80b0ff',
    fill: 'rgba(128,176,255,0.12)',
    text: '#b1bed0',
    grid: '#334155',
    surface: '#161f2e',
    success: '#61d5a1',
    successFill: 'rgba(97,213,161,0.12)',
    previous: '#96a6bd',
  },
};

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

// Runs before the page paints; React takes over preference handling on mount.
export const themeBootstrap = `(() => {
  let preference = 'system';
  try {
    const stored = localStorage.getItem('${THEME_STORAGE_KEY}');
    if (['light', 'dark', 'system'].includes(stored)) preference = stored;
  } catch (error) { console.warn('Theme preference storage is unavailable.', error); }
  const theme = preference === 'system'
    ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : preference;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document.getElementById('truffles-dark-theme').media = theme === 'dark' ? 'all' : 'not all';
})();`;

'use client';

import { useTheme, type ThemePreference } from '@/lib/theme-context';

export default function ThemePicker() {
  const { preference, setPreference } = useTheme();
  return (
    <label className='theme-picker'>
      <span>Appearance</span>
      <select
        aria-label='Appearance'
        value={preference}
        onChange={event => {
          const value: ThemePreference =
            event.target.value === 'dark'
              ? 'dark'
              : event.target.value === 'light'
                ? 'light'
                : 'system';
          setPreference(value);
        }}
      >
        <option value='system'>System</option>
        <option value='light'>Light</option>
        <option value='dark'>Dark</option>
      </select>
    </label>
  );
}

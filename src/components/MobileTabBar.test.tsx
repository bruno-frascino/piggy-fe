// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MobileTabBar from './MobileTabBar';

const navigation = vi.hoisted(() => ({ pathname: '/' }));
vi.mock('next/navigation', () => ({ usePathname: () => navigation.pathname }));
afterEach(() => {
  cleanup();
  navigation.pathname = '/';
});

describe('MobileTabBar', () => {
  it('preserves all six primary destinations in their existing order', () => {
    render(<MobileTabBar />);
    expect(
      screen.getAllByRole('link').map(link => link.getAttribute('href'))
    ).toEqual([
      '/',
      '/history',
      '/screener',
      '/reports',
      '/statistics',
      '/account',
    ]);
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(
      screen
        .getAllByRole('link')
        .filter(link => link.hasAttribute('aria-current'))
    ).toHaveLength(1);
  });

  it('marks the reports route active without changing its destination', () => {
    navigation.pathname = '/reports';
    render(<MobileTabBar />);
    expect(screen.getByRole('link', { name: 'Reports' })).toHaveClass('active');
    expect(screen.getByRole('link', { name: 'Reports' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute(
      'aria-current'
    );
  });
});

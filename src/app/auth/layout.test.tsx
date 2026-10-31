// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import AuthLayout from './layout';

afterEach(cleanup);

it('renders authentication content without an appearance selector', () => {
  render(
    <AuthLayout>
      <h1>Sign in</h1>
    </AuthLayout>
  );
  expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  expect(
    screen.queryByRole('combobox', { name: 'Appearance' })
  ).not.toBeInTheDocument();
});

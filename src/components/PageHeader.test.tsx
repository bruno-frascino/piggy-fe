// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import PageHeader from './PageHeader';
import CoreHeader from './CoreHeader';

afterEach(cleanup);

it('renders the page title, description and primary action', () => {
  render(
    <PageHeader
      title='History'
      subtitle='Closed positions'
      action={<button>Export</button>}
    />
  );
  expect(
    screen.getByRole('heading', { level: 1, name: 'History' })
  ).toBeInTheDocument();
  expect(screen.getByText('Closed positions')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
});

it('preserves the authentication identity and description', () => {
  render(<CoreHeader description='Welcome back' />);
  expect(
    screen.getByRole('heading', { level: 1, name: 'Truffles' })
  ).toBeInTheDocument();
  expect(screen.getByText('Welcome back')).toBeInTheDocument();
});

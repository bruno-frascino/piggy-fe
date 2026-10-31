// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import QueryFeedback from './QueryFeedback';

afterEach(() => {
  cleanup();
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    value: true,
  });
});

describe('QueryFeedback', () => {
  it('offers a scoped retry on initial failure without exposing raw server errors', () => {
    const retry = vi.fn();
    render(
      <QueryFeedback label='Holdings' isError hasData={false} onRetry={retry} />
    );
    expect(
      screen.getByText('Could not load holdings. Please try again.')
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry holdings' }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it('labels retained data and disables duplicate retries while fetching', () => {
    render(
      <QueryFeedback
        label='Quotes'
        isError
        isFetching
        hasData
        onRetry={vi.fn()}
      />
    );
    expect(screen.getByText(/Showing last loaded data/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry quotes' })).toBeDisabled();
  });

  it.each([true, false])(
    'reacts to offline/online events with hasData=%s and does not offer an offline retry',
    hasData => {
      render(
        <QueryFeedback
          label='Holdings'
          isError
          hasData={hasData}
          onRetry={vi.fn()}
        />
      );
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        value: false,
      });
      fireEvent(window, new Event('offline'));
      expect(
        screen.getByText(
          hasData ? /Data may be out of date/ : /Reconnect to load it/
        )
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Retry holdings' })
      ).not.toBeInTheDocument();
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        value: true,
      });
      fireEvent(window, new Event('online'));
      expect(
        screen.getByRole('button', { name: 'Retry holdings' })
      ).toBeInTheDocument();
    }
  );
});

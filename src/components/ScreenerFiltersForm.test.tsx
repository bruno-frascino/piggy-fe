// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useSavedScreensMock,
  useCreateSavedScreenMock,
  useDeleteSavedScreenMock,
  createSavedScreenMutateAsyncMock,
  deleteSavedScreenMutateAsyncMock,
  showToastMock,
} = vi.hoisted(() => ({
  useSavedScreensMock: vi.fn(),
  useCreateSavedScreenMock: vi.fn(),
  useDeleteSavedScreenMock: vi.fn(),
  createSavedScreenMutateAsyncMock: vi.fn(),
  deleteSavedScreenMutateAsyncMock: vi.fn(),
  showToastMock: vi.fn(),
}));

vi.mock('@/hooks/api', () => ({
  useSavedScreens: useSavedScreensMock,
  useCreateSavedScreen: useCreateSavedScreenMock,
  useDeleteSavedScreen: useDeleteSavedScreenMock,
}));

vi.mock('@/lib/toast-context', () => ({
  useToast: () => ({ show: showToastMock }),
}));

import ScreenerFiltersForm from './ScreenerFiltersForm';

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.clearAllMocks();
  useSavedScreensMock.mockReturnValue({ data: [] });
  useCreateSavedScreenMock.mockReturnValue({
    mutateAsync: createSavedScreenMutateAsyncMock,
    isPending: false,
  });
  useDeleteSavedScreenMock.mockReturnValue({
    mutateAsync: deleteSavedScreenMutateAsyncMock,
  });
});

describe('ScreenerFiltersForm', () => {
  it('defaults to filter mode and submits sector/industry filters', () => {
    const onSearch = vi.fn();
    render(<ScreenerFiltersForm onSearch={onSearch} />);

    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(onSearch).toHaveBeenCalledWith(
      expect.objectContaining({ sector: undefined, industry: undefined })
    );
  });

  it('switches to symbol mode and submits a trimmed symbol query', () => {
    const onSearch = vi.fn();
    render(<ScreenerFiltersForm onSearch={onSearch} />);

    fireEvent.click(screen.getByRole('button', { name: 'By symbol' }));
    fireEvent.change(screen.getByPlaceholderText('Symbol or company name'), {
      target: { value: '  AAPL  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(onSearch).toHaveBeenCalledWith({ symbol: 'AAPL' });
  });

  it('does not submit an empty symbol query', () => {
    const onSearch = vi.fn();
    render(<ScreenerFiltersForm onSearch={onSearch} />);

    fireEvent.click(screen.getByRole('button', { name: 'By symbol' }));
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(onSearch).not.toHaveBeenCalled();
  });

  it('disables inputs and the search button when disabled', () => {
    render(<ScreenerFiltersForm onSearch={vi.fn()} disabled />);

    expect(screen.getByRole('button', { name: 'Search' })).toBeDisabled();
  });

  it('saves the current filters as a named preset', async () => {
    createSavedScreenMutateAsyncMock.mockResolvedValue({
      id: 's1',
      name: 'My Screen',
      filters: {},
    });
    render(<ScreenerFiltersForm onSearch={vi.fn()} />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Save current filters' })
    );
    fireEvent.change(screen.getByPlaceholderText('Screen name'), {
      target: { value: 'My Screen' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(createSavedScreenMutateAsyncMock).toHaveBeenCalledWith({
      name: 'My Screen',
      filters: expect.objectContaining({}),
    });
  });

  it('applies a saved screen and runs the search', () => {
    useSavedScreensMock.mockReturnValue({
      data: [{ id: 's1', name: 'Tech Div', filters: { sector: 'Technology' } }],
    });
    const onSearch = vi.fn();
    render(<ScreenerFiltersForm onSearch={onSearch} />);

    fireEvent.click(screen.getByRole('button', { name: 'Saved screens' }));
    fireEvent.click(screen.getByText('Tech Div'));

    expect(onSearch).toHaveBeenCalledWith({ sector: 'Technology' });
  });
});

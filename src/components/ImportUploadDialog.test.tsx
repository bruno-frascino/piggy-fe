// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mutateAsyncMock, pushMock, showMock } = vi.hoisted(() => ({
  mutateAsyncMock: vi.fn(),
  pushMock: vi.fn(),
  showMock: vi.fn(),
}));

vi.mock('@/hooks/api', () => ({
  useCreateImport: () => ({ mutateAsync: mutateAsyncMock, isPending: false }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));
vi.mock('@/lib/toast-context', () => ({
  useToast: () => ({ show: showMock }),
}));

import ImportUploadDialog from './ImportUploadDialog';

function csv(name: string, content: string) {
  return new File([content], name, { type: 'text/csv' });
}

function setup(onHide = vi.fn()) {
  render(
    <ImportUploadDialog
      visible
      accountId='acc-1'
      accountName='Kraken'
      onHide={onHide}
    />
  );
  return onHide;
}

function uploadFiles() {
  fireEvent.change(screen.getByLabelText('Trades CSV'), {
    target: { files: [csv('t.csv', 'a')] },
  });
  fireEvent.change(screen.getByLabelText('Ledgers CSV'), {
    target: { files: [csv('l.csv', 'b')] },
  });
  fireEvent.click(screen.getByRole('button', { name: /Upload and review/i }));
}

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(cleanup);

describe('ImportUploadDialog', () => {
  it('requires both files before the upload button is enabled', () => {
    setup();
    const upload = screen.getByRole('button', { name: /Upload and review/i });
    expect(upload).toBeDisabled();
    expect(screen.getByRole('dialog')).toHaveClass('task-dialog');
    expect(upload.closest('.p-dialog-footer')).not.toBeNull();

    fireEvent.change(screen.getByLabelText('Trades CSV'), {
      target: { files: [csv('trades.csv', 'a')] },
    });
    expect(upload).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Ledgers CSV'), {
      target: { files: [csv('ledgers.csv', 'b')] },
    });
    expect(upload).toBeEnabled();
  });

  it('uploads both files as text and opens the review page', async () => {
    mutateAsyncMock.mockResolvedValue({
      batch: { id: 'imp-9' },
      plan: {},
      duplicates: 0,
      warnings: [],
    });
    const onHide = setup();
    fireEvent.change(screen.getByLabelText('Trades CSV'), {
      target: { files: [csv('trades.csv', 'TRADES')] },
    });
    fireEvent.change(screen.getByLabelText('Ledgers CSV'), {
      target: { files: [csv('ledgers.csv', 'LEDGERS')] },
    });
    fireEvent.click(screen.getByRole('button', { name: /Upload and review/i }));

    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith('/imports/imp-9')
    );
    expect(mutateAsyncMock).toHaveBeenCalledWith({
      source: 'KRAKEN',
      accountId: 'acc-1',
      files: [
        { kind: 'trades', fileName: 'trades.csv', content: 'TRADES' },
        { kind: 'ledgers', fileName: 'ledgers.csv', content: 'LEDGERS' },
      ],
    });
    expect(onHide).toHaveBeenCalled();
  });

  it('explains duplicate uploads and links directly to the unfinished review', async () => {
    mutateAsyncMock.mockResolvedValue({
      batch: null,
      plan: null,
      duplicates: 78,
      existingBatches: [
        {
          id: 'previous',
          accountId: 'acc-1',
          accountName: 'Kraken',
          status: 'PENDING_REVIEW',
          eventCount: 78,
        },
      ],
      warnings: [],
    });
    const onHide = setup();
    uploadFiles();

    expect(
      await screen.findByText(
        /These 78 events were uploaded before.*does not mean they have been committed/
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/Awaiting review and commit/)).toBeInTheDocument();
    expect(
      screen.getByText(/Open the review, resolve any issues/)
    ).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Continue review · Kraken' });
    expect(link).toHaveAttribute('href', '/imports/previous');
    expect(
      screen.getByRole('button', { name: /Upload and review/i })
    ).toBeDisabled();
    expect(pushMock).not.toHaveBeenCalled();
    expect(showMock).not.toHaveBeenCalled();
    fireEvent.click(link);
    expect(onHide).toHaveBeenCalled();
  });

  it('distinguishes committed and partially committed imports, including other accounts', async () => {
    mutateAsyncMock.mockResolvedValue({
      batch: null,
      plan: null,
      duplicates: 48,
      existingBatches: [
        {
          id: 'done',
          accountId: 'other',
          accountName: 'Other account',
          status: 'COMMITTED',
          eventCount: 20,
        },
        {
          id: 'partial',
          accountId: 'acc-1',
          accountName: 'Kraken',
          status: 'PARTIALLY_APPLIED',
          eventCount: 28,
        },
      ],
      warnings: ['Some rows are unsupported'],
    });
    setup();
    uploadFiles();
    expect(
      await screen.findByText('Other account · Committed')
    ).toBeInTheDocument();
    expect(screen.getByText(/different trading account/)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'View import details · Other account' })
    ).toHaveAttribute('href', '/imports/done');
    expect(
      screen.getByText('Kraken · Partially committed')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Continue review · Kraken' })
    ).toHaveAttribute('href', '/imports/partial');
    expect(screen.getByText('Some rows are unsupported')).toBeInTheDocument();
  });

  it('explains empty exports without claiming they were imported and allows a different file', async () => {
    mutateAsyncMock.mockResolvedValue({
      batch: null,
      plan: null,
      duplicates: 0,
      existingBatches: [],
      warnings: [],
    });
    setup();
    uploadFiles();
    expect(
      await screen.findByText(/No importable events were found/)
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/events were uploaded before/)
    ).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Trades CSV'), {
      target: { files: [csv('new.csv', 'new')] },
    });
    expect(
      screen.queryByText(/No importable events were found/)
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Upload and review/i })
    ).toBeEnabled();
  });

  it('guides users to past imports when the server does not yet include batch links', async () => {
    mutateAsyncMock.mockResolvedValue({
      batch: null,
      plan: null,
      duplicates: 48,
      warnings: [],
    });
    setup();
    uploadFiles();
    expect(
      await screen.findByText(/Open View past imports above/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'View past imports' })
    ).toHaveAttribute('href', '/imports');
  });

  it('shows the server message for a bad export', async () => {
    mutateAsyncMock.mockRejectedValue({
      response: { data: { message: 'Unrecognised trades export format' } },
    });
    setup();
    fireEvent.change(screen.getByLabelText('Trades CSV'), {
      target: { files: [csv('t.csv', 'a')] },
    });
    fireEvent.change(screen.getByLabelText('Ledgers CSV'), {
      target: { files: [csv('l.csv', 'b')] },
    });
    fireEvent.click(screen.getByRole('button', { name: /Upload and review/i }));

    expect(
      await screen.findByText('Unrecognised trades export format')
    ).toBeInTheDocument();
  });

  it('does not upload while offline', async () => {
    const onLine = vi
      .spyOn(window.navigator, 'onLine', 'get')
      .mockReturnValue(false);
    setup();
    fireEvent.change(screen.getByLabelText('Trades CSV'), {
      target: { files: [csv('t.csv', 'a')] },
    });
    fireEvent.change(screen.getByLabelText('Ledgers CSV'), {
      target: { files: [csv('l.csv', 'b')] },
    });
    fireEvent.click(screen.getByRole('button', { name: /Upload and review/i }));

    expect(await screen.findByText(/You are offline/)).toBeInTheDocument();
    expect(mutateAsyncMock).not.toHaveBeenCalled();
    onLine.mockRestore();
  });
});

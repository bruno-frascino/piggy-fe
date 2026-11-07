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

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  online: true,
  hidden: false,
  saved: vi.fn(),
  hide: vi.fn(),
}));
vi.mock('@/hooks/api', () => ({
  useCorrectLiveImportedExecution: () => ({
    mutateAsync: mocks.mutate,
    isPending: false,
  }),
}));
vi.mock('@/hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => mocks.online,
}));
vi.mock('@/lib/privacy-context', () => ({
  usePrivacy: () => ({ hidden: mocks.hidden }),
}));
import LiveImportedExecutionCorrectionDialog from './LiveImportedExecutionCorrectionDialog';

const metadata = {
  eventId: 'event1',
  transactionId: 'tx1',
  operationId: 'op1',
  expectedRevisionId: 'r1',
  expectedSourceFingerprint: 'a'.repeat(64),
  effectiveDate: '2026-10-02',
  sequence: 3,
  price: '12.345678901234',
  fees: '0.12345678',
  currency: 'AUD',
};

function mount() {
  return render(
    <LiveImportedExecutionCorrectionDialog
      accountId='a1'
      symbol='BTC-AUD'
      correction={metadata}
      onHide={mocks.hide}
      onSaved={mocks.saved}
    />
  );
}

function prepare() {
  fireEvent.change(screen.getByLabelText('Cash sequence'), {
    target: { value: '4' },
  });
  fireEvent.change(screen.getByLabelText('Audit reason'), {
    target: { value: 'Corrected from broker statement' },
  });
  fireEvent.click(
    screen.getByLabelText(
      'I understand this changes live cash and parcel results.'
    )
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.online = true;
  mocks.hidden = false;
  mocks.mutate.mockResolvedValue({ revisionId: 'r2' });
});
afterEach(cleanup);

describe('live imported execution correction editor', () => {
  it('submits the imported event identity and exact values after acknowledgement', async () => {
    mount();
    expect(screen.getByLabelText('Exact execution price (AUD)')).toHaveValue(
      metadata.price
    );
    expect(screen.getByLabelText('Exact total fees (AUD)')).toHaveValue(
      metadata.fees
    );
    expect(
      screen.getByText(
        /quantity, currency and existing parcel allocations remain unchanged/
      )
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Record correction' }));
    expect(mocks.mutate).not.toHaveBeenCalled();
    prepare();
    fireEvent.click(screen.getByRole('button', { name: 'Record correction' }));

    await waitFor(() => expect(mocks.saved).toHaveBeenCalledOnce());
    expect(mocks.mutate).toHaveBeenCalledWith({
      accountId: 'a1',
      eventId: 'event1',
      input: {
        idempotencyKey: expect.any(String),
        expectedRevisionId: 'r1',
        expectedSourceFingerprint: metadata.expectedSourceFingerprint,
        effectiveDate: metadata.effectiveDate,
        sequence: 4,
        price: metadata.price,
        fees: metadata.fees,
        reason: 'Corrected from broker statement',
      },
    });
  });

  it('blocks offline writes and keeps stale conflicts visible', async () => {
    mocks.online = false;
    mount();
    expect(
      screen.getByRole('button', { name: 'Record correction' })
    ).toBeDisabled();
    expect(mocks.mutate).not.toHaveBeenCalled();

    cleanup();
    mocks.online = true;
    mocks.mutate.mockRejectedValue({
      isAxiosError: true,
      response: { status: 409, data: { message: 'Source drift' } },
    });
    mount();
    prepare();
    fireEvent.click(screen.getByRole('button', { name: 'Record correction' }));
    await screen.findByText(
      /Account history changed or this correction conflicts/
    );
    expect(
      screen.getByRole('button', { name: 'Record correction' })
    ).toBeDisabled();
    expect(mocks.saved).not.toHaveBeenCalled();
  });
});

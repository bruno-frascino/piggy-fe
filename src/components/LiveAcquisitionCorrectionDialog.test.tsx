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
  useCorrectLiveManualAcquisition: () => ({
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
import LiveAcquisitionCorrectionDialog from './LiveAcquisitionCorrectionDialog';

const metadata = {
  operationId: 'op1',
  transactionId: 'buy1',
  expectedRevisionId: 'r1',
  expectedSourceFingerprint: 'a'.repeat(64),
  effectiveDate: '2026-10-02',
  sequence: 3,
  quantity: '10.000000000001',
  price: '12.345678901234',
  fees: '0.12345678',
};
const mount = () =>
  render(
    <LiveAcquisitionCorrectionDialog
      accountId='a1'
      symbol='AAPL'
      correction={metadata}
      onHide={mocks.hide}
      onSaved={mocks.saved}
    />
  );
function prepare() {
  fireEvent.change(
    screen.getByLabelText('Total bought units (not remaining units)'),
    { target: { value: '12.000000000001' } }
  );
  fireEvent.change(screen.getByLabelText('Audit reason'), {
    target: { value: 'Broker statement correction' },
  });
  fireEvent.click(
    screen.getByLabelText(
      'I understand this changes live cash, cost basis and tax-report results.'
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
describe('live acquisition correction editor', () => {
  it('uses exact full acquisition values rather than rounded remaining holdings and requires acknowledgement', async () => {
    mount();
    expect(
      screen.getByLabelText('Total bought units (not remaining units)')
    ).toHaveValue(metadata.quantity);
    expect(screen.getByLabelText('Exact purchase price')).toHaveValue(
      metadata.price
    );
    fireEvent.click(screen.getByRole('button', { name: 'Record correction' }));
    expect(mocks.mutate).not.toHaveBeenCalled();
    prepare();
    fireEvent.click(screen.getByRole('button', { name: 'Record correction' }));
    await waitFor(() => expect(mocks.saved).toHaveBeenCalledOnce());
    expect(mocks.mutate).toHaveBeenCalledWith({
      accountId: 'a1',
      transactionId: 'buy1',
      input: {
        idempotencyKey: expect.any(String),
        expectedRevisionId: 'r1',
        expectedSourceFingerprint: metadata.expectedSourceFingerprint,
        effectiveDate: '2026-10-02',
        sequence: 3,
        quantity: '12.000000000001',
        price: metadata.price,
        fees: metadata.fees,
        reason: 'Broker statement correction',
      },
    });
  });
  it('retains retry identity for the same submission and changes it when the payload changes', async () => {
    mocks.mutate.mockRejectedValue(new Error('Response lost'));
    mount();
    prepare();
    fireEvent.click(screen.getByRole('button', { name: 'Record correction' }));
    await screen.findByText('Response lost');
    fireEvent.click(screen.getByRole('button', { name: 'Record correction' }));
    await waitFor(() => expect(mocks.mutate).toHaveBeenCalledTimes(2));
    expect(mocks.mutate.mock.calls[1][0].input.idempotencyKey).toBe(
      mocks.mutate.mock.calls[0][0].input.idempotencyKey
    );
    fireEvent.change(screen.getByLabelText('Exact total purchase fees'), {
      target: { value: '0.2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Record correction' }));
    await waitFor(() => expect(mocks.mutate).toHaveBeenCalledTimes(3));
    expect(mocks.mutate.mock.calls[2][0].input.idempotencyKey).not.toBe(
      mocks.mutate.mock.calls[1][0].input.idempotencyKey
    );
    expect(mocks.saved).not.toHaveBeenCalled();
  });
  it('blocks repeated stale writes and explains source/ordering conflicts', async () => {
    mocks.mutate.mockRejectedValue({
      isAxiosError: true,
      response: { status: 409, data: { message: 'Source drift' } },
    });
    mount();
    prepare();
    fireEvent.click(screen.getByRole('button', { name: 'Record correction' }));
    await screen.findByText(/Account history changed/);
    expect(
      screen.getByRole('button', { name: 'Record correction' })
    ).toBeDisabled();
    expect(mocks.saved).not.toHaveBeenCalled();
  });
  it('disables offline submissions and masks financial values in privacy mode', () => {
    mocks.online = false;
    mocks.hidden = true;
    mount();
    expect(
      screen.getByRole('button', { name: 'Record correction' })
    ).toBeDisabled();
    expect(screen.getByLabelText('Exact purchase price')).toHaveValue('');
    expect(
      screen.getByLabelText('Total bought units (not remaining units)')
    ).toHaveValue('');
    expect(mocks.mutate).not.toHaveBeenCalled();
  });
  it('displays funding failures without closing or reporting success', async () => {
    mocks.mutate.mockRejectedValue({
      isAxiosError: true,
      response: { status: 422, data: { message: 'Insufficient AUD cash' } },
    });
    mount();
    prepare();
    fireEvent.click(screen.getByRole('button', { name: 'Record correction' }));
    await screen.findByText('Insufficient AUD cash');
    expect(mocks.saved).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: 'Record correction' })
    ).not.toBeDisabled();
  });
});

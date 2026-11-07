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
  saved: vi.fn(),
  hide: vi.fn(),
  online: true,
  hidden: false,
}));
vi.mock('@/hooks/api', () => ({
  useVoidLiveManualTrade: () => ({
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
import ManualTradeVoidDialog from './ManualTradeVoidDialog';
const metadata = {
  operationId: 'op1',
  expectedRevisionId: 'r1',
  expectedSourceFingerprint: 'a'.repeat(64),
  effectiveDate: '2026-10-02',
  sequence: 1,
};
function mount(kind: 'BUY' | 'SELL' = 'SELL') {
  return render(
    <ManualTradeVoidDialog
      accountId='a1'
      transactionId='tx1'
      symbol='AAPL'
      kind={kind}
      metadata={metadata}
      onHide={mocks.hide}
      onSaved={mocks.saved}
    />
  );
}
function prepare() {
  fireEvent.change(screen.getByLabelText('Audit reason'), {
    target: { value: 'Duplicate trade' },
  });
  fireEvent.click(
    screen.getByLabelText(
      'I understand this permanently changes live inventory, cash and tax results.'
    )
  );
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.online = true;
  mocks.hidden = false;
  mocks.mutate.mockResolvedValue({ revisionId: 'v1' });
});
afterEach(cleanup);
describe('manual trade void confirmation', () => {
  it('requires an audit reason and acknowledgement before sending the reviewed identity', async () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Record void' }));
    expect(mocks.mutate).not.toHaveBeenCalled();
    prepare();
    fireEvent.click(screen.getByRole('button', { name: 'Record void' }));
    await waitFor(() => expect(mocks.saved).toHaveBeenCalledOnce());
    expect(mocks.mutate).toHaveBeenCalledWith({
      accountId: 'a1',
      transactionId: 'tx1',
      input: {
        idempotencyKey: expect.any(String),
        expectedRevisionId: 'r1',
        expectedSourceFingerprint: metadata.expectedSourceFingerprint,
        reason: 'Duplicate trade',
      },
    });
  });
  it('explains the BUY eligibility restriction and immutable retention', () => {
    mount('BUY');
    expect(
      screen.getByText(/All effective sales must be voided first/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Original trades and postings remain/)
    ).toBeInTheDocument();
  });
  it('keeps the same key after a lost response and changes it only for changed content', async () => {
    mocks.mutate.mockRejectedValue(new Error('Response lost'));
    mount();
    prepare();
    fireEvent.click(screen.getByRole('button', { name: 'Record void' }));
    await screen.findByText('Response lost');
    fireEvent.click(screen.getByRole('button', { name: 'Record void' }));
    await waitFor(() => expect(mocks.mutate).toHaveBeenCalledTimes(2));
    expect(mocks.mutate.mock.calls[1][0].input.idempotencyKey).toBe(
      mocks.mutate.mock.calls[0][0].input.idempotencyKey
    );
    fireEvent.change(screen.getByLabelText('Audit reason'), {
      target: { value: 'Corrected reason' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Record void' }));
    await waitFor(() => expect(mocks.mutate).toHaveBeenCalledTimes(3));
    expect(mocks.mutate.mock.calls[2][0].input.idempotencyKey).not.toBe(
      mocks.mutate.mock.calls[0][0].input.idempotencyKey
    );
    expect(mocks.saved).not.toHaveBeenCalled();
  });
  it('blocks stale submissions and surfaces funding failures without claiming success', async () => {
    mocks.mutate.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 422, data: { message: 'Insufficient AUD cash' } },
    });
    mount();
    prepare();
    fireEvent.click(screen.getByRole('button', { name: 'Record void' }));
    await screen.findByText('Insufficient AUD cash');
    expect(mocks.saved).not.toHaveBeenCalled();
    mocks.mutate.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 409 },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Record void' }));
    await screen.findByText(/Account history changed/);
    expect(screen.getByRole('button', { name: 'Record void' })).toBeDisabled();
  });
  it.each([
    { online: false, hidden: false },
    { online: true, hidden: true },
  ])('blocks offline/privacy submission %j', state => {
    Object.assign(mocks, state);
    mount();
    expect(screen.getByRole('button', { name: 'Record void' })).toBeDisabled();
    expect(mocks.mutate).not.toHaveBeenCalled();
  });
});

'use client';

import { useState } from 'react';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { InputNumber } from 'primereact/inputnumber';
import { Message } from 'primereact/message';
import { useReviewSplitStopLoss } from '@/hooks/api';
import AppDialog from './AppDialog';
import type { HoldingRow } from '@/hooks/useHoldingRows';
import { exchangeLabel, isCryptoExchange } from '@/lib/crypto';
import { formatDateDDMMYYYY } from '@/lib/date';
import {
  formatCurrency,
  formatNumber,
  formatPct,
  returnClass,
} from '@/lib/format';
import { usePrivacy } from '@/lib/privacy-context';

export default function PositionDetailsDialog({
  row,
  currency,
  accountName,
  hasQuote,
  onHide,
  onEdit,
  onClose,
}: {
  row: HoldingRow;
  currency: string;
  accountName?: string;
  hasQuote: boolean;
  onHide: () => void;
  onEdit: () => void;
  onClose: () => void;
}) {
  const { mask, hidden } = usePrivacy();
  const price = (value: number) =>
    formatCurrency(
      value,
      currency,
      isCryptoExchange(row.exchangeCode) ? 12 : 3
    );
  const stopLossPrice =
    typeof row.stopLoss === 'number' &&
    Number.isFinite(row.stopLoss) &&
    row.stopLoss > 0
      ? row.stopLoss
      : undefined;
  const [reviewingStopLoss, setReviewingStopLoss] = useState(false);
  const [reviewPrice, setReviewPrice] = useState<number | null>(
    stopLossPrice ?? null
  );
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const { mutateAsync: reviewStopLoss, isPending: reviewing } =
    useReviewSplitStopLoss();

  const submitStopLossReview = async () => {
    if (
      !row.id ||
      reviewPrice === null ||
      !Number.isFinite(reviewPrice) ||
      reviewPrice <= 0 ||
      !reviewConfirmed
    )
      return;
    setReviewError(null);
    try {
      await reviewStopLoss({
        id: row.id,
        input: { stopLossPrice: reviewPrice, reviewConfirmed: true },
      });
      setReviewingStopLoss(false);
      setReviewConfirmed(false);
    } catch (error: unknown) {
      setReviewError(
        error instanceof Error
          ? error.message
          : 'Stop-loss review could not be saved.'
      );
    }
  };

  return (
    <AppDialog
      header={`Position details · ${row.symbol}`}
      visible
      task
      modal
      blockScroll
      className='position-details-dialog'
      style={{ width: '640px' }}
      onHide={onHide}
      footer={
        <div className='position-details-actions flex flex-nowrap items-center justify-end gap-2'>
          <Button label='Done' text onClick={onHide} />
          <Button
            label='Edit position'
            icon='pi pi-pencil'
            outlined
            onClick={onEdit}
          />
          <Button
            label='Close position'
            icon='pi pi-minus-circle'
            severity='danger'
            onClick={onClose}
          />
        </div>
      }
    >
      <div className='space-y-5'>
        <section className='task-summary' aria-label='Position overview'>
          <strong>{row.name}</strong>
          <p className='mt-1'>
            {accountName || row.accountName}
            {row.exchangeCode ? ` · ${exchangeLabel(row.exchangeCode)}` : ''}
            {` · ${currency}`}
          </p>
          <dl>
            <div>
              <dt>Position value</dt>
              <dd>{mask(formatCurrency(row.currentPosition, currency))}</dd>
            </div>
            <div>
              <dt>Return</dt>
              <dd className={returnClass(row.currentReturnAbs, hidden)}>
                {mask(formatCurrency(row.currentReturnAbs, currency))} (
                {formatPct(row.currentReturnPct)})
              </dd>
            </div>
          </dl>
        </section>

        <section aria-label='Purchase details'>
          <h3 className='text-base font-semibold mb-3'>Purchase details</h3>
          <dl className='position-details-grid'>
            <div>
              <dt>Open date</dt>
              <dd>{formatDateDDMMYYYY(row.openDate)}</dd>
            </div>
            <div>
              <dt>Units held</dt>
              <dd>{mask(formatNumber(row.units))}</dd>
            </div>
            <div>
              <dt>Buy price</dt>
              <dd>{price(row.buyPrice)}</dd>
            </div>
            <div>
              <dt>Buy fees</dt>
              <dd>{mask(formatCurrency(row.buyFee, currency))}</dd>
            </div>
            <div>
              <dt>Open value</dt>
              <dd>{mask(formatCurrency(row.openPosition, currency))}</dd>
            </div>
            <div>
              <dt>Industry</dt>
              <dd>{row.industry || '—'}</dd>
            </div>
          </dl>
        </section>

        <section aria-label='Position performance'>
          <h3 className='text-base font-semibold mb-3'>Performance</h3>
          <dl className='position-details-grid'>
            <div>
              <dt>Current price</dt>
              <dd>{price(row.effectivePrice)}</dd>
            </div>
            <div>
              <dt>Days open</dt>
              <dd>{formatNumber(row.daysOpen)}</dd>
            </div>
            <div>
              <dt>Allocation</dt>
              <dd>{formatPct(row.allocationPct)}</dd>
            </div>
            <div>
              <dt>Max drawdown</dt>
              <dd>
                {row.priceHistoryReviewRequired
                  ? 'Unavailable'
                  : row.maxDrawdownPercent != null && row.maxDrawdownPercent > 0
                    ? `-${row.maxDrawdownPercent.toFixed(2)}%`
                    : '—'}
              </dd>
            </div>
            <div>
              <dt>Max run-up</dt>
              <dd>
                {row.priceHistoryReviewRequired
                  ? 'Unavailable'
                  : row.maxRunUpPercent != null && row.maxRunUpPercent > 0
                    ? `+${row.maxRunUpPercent.toFixed(2)}%`
                    : '—'}
              </dd>
            </div>
          </dl>
          {row.priceHistoryReviewRequired && (
            <p className='text-xs text-gray-500 mt-3'>
              Drawdown and run-up are unavailable until split-aware price
              history is supported.
            </p>
          )}
          <p className='text-xs text-gray-500 mt-3'>
            {hasQuote
              ? 'Current price uses the latest available quote.'
              : 'Live quote unavailable. Values use the stored price; returns are estimates.'}
          </p>
        </section>

        <section aria-label='Stop loss details'>
          <h3 className='text-base font-semibold mb-3'>Stop loss</h3>
          <dl className='position-details-grid'>
            <div>
              <dt>Stop loss price</dt>
              <dd>
                {stopLossPrice !== undefined ? price(stopLossPrice) : 'Not set'}
              </dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                {row.stopLossReviewRequired
                  ? 'Review required'
                  : row.stopLossTriggered
                    ? 'Triggered'
                    : stopLossPrice !== undefined
                      ? 'Not triggered'
                      : '—'}
              </dd>
            </div>
            {stopLossPrice !== undefined && !row.stopLossReviewRequired && (
              <>
                <div>
                  <dt>Value at stop loss</dt>
                  <dd>
                    {mask(formatCurrency(row.stopLossPosition, currency))}
                  </dd>
                </div>
                <div>
                  <dt>Return at stop loss</dt>
                  <dd>{formatPct(row.stopLossReturnPct)}</dd>
                </div>
              </>
            )}
          </dl>
          {row.stopLossReviewRequired && (
            <div className='mt-3 space-y-3'>
              <p className='text-sm'>
                Monitoring is paused. The saved price has not been adjusted;
                review the split and confirm a stop price for the current units.
              </p>
              {!reviewingStopLoss ? (
                <Button
                  label='Review stop loss'
                  icon='pi pi-check-circle'
                  outlined
                  onClick={() => {
                    setReviewPrice(stopLossPrice ?? null);
                    setReviewConfirmed(false);
                    setReviewError(null);
                    setReviewingStopLoss(true);
                  }}
                  disabled={!row.id}
                />
              ) : (
                <div className='space-y-3' aria-label='Stop-loss review form'>
                  <label htmlFor='reviewed-stop-loss-price'>
                    Confirmed stop-loss price
                  </label>
                  <InputNumber
                    inputId='reviewed-stop-loss-price'
                    value={reviewPrice}
                    onValueChange={event => setReviewPrice(event.value ?? null)}
                    mode='currency'
                    currency={currency}
                    min={0.000000000001}
                    maxFractionDigits={
                      isCryptoExchange(row.exchangeCode) ? 12 : 3
                    }
                  />
                  <div className='flex items-start gap-2'>
                    <Checkbox
                      inputId='confirm-stop-loss-review'
                      checked={reviewConfirmed}
                      onChange={event =>
                        setReviewConfirmed(event.checked === true)
                      }
                    />
                    <label htmlFor='confirm-stop-loss-review'>
                      I reviewed the split and confirm this stop price for the
                      current units.
                    </label>
                  </div>
                  {reviewError && (
                    <Message severity='error' text={reviewError} />
                  )}
                  <div className='flex flex-wrap gap-2'>
                    <Button
                      label='Confirm stop-loss review'
                      onClick={() => void submitStopLossReview()}
                      disabled={
                        reviewing ||
                        !reviewConfirmed ||
                        reviewPrice === null ||
                        !Number.isFinite(reviewPrice) ||
                        reviewPrice <= 0
                      }
                      loading={reviewing}
                    />
                    <Button
                      label='Cancel'
                      text
                      onClick={() => setReviewingStopLoss(false)}
                      disabled={reviewing}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <section aria-label='Buy comments'>
          <h3 className='text-base font-semibold mb-3'>Buy comments</h3>
          {row.buyComments ? (
            <div
              className='position-details-comments'
              tabIndex={0}
              role='region'
              aria-label='Buy comment text'
            >
              {row.buyComments}
            </div>
          ) : (
            <p className='text-sm text-gray-500'>No buy comments recorded.</p>
          )}
        </section>
      </div>
    </AppDialog>
  );
}

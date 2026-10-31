'use client';

import { Button } from 'primereact/button';
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
        <div className='flex flex-wrap justify-end gap-2'>
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
                {row.maxDrawdownPercent != null && row.maxDrawdownPercent > 0
                  ? `-${row.maxDrawdownPercent.toFixed(2)}%`
                  : '—'}
              </dd>
            </div>
            <div>
              <dt>Max run-up</dt>
              <dd>
                {row.maxRunUpPercent != null && row.maxRunUpPercent > 0
                  ? `+${row.maxRunUpPercent.toFixed(2)}%`
                  : '—'}
              </dd>
            </div>
          </dl>
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
                {row.stopLossTriggered
                  ? 'Triggered'
                  : stopLossPrice !== undefined
                    ? 'Not triggered'
                    : '—'}
              </dd>
            </div>
            {stopLossPrice !== undefined && (
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

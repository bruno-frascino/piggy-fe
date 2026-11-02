'use client';

import { useState } from 'react';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import AppDialog from './AppDialog';
import {
  useOpeningPreview,
  useOpeningStatements,
  useSaveOpeningStatement,
} from '@/hooks/api';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { usePrivacy } from '@/lib/privacy-context';
import { toLocalDateString, formatDateDDMMYYYY } from '@/lib/date';
import type {
  OpeningPreview,
  OpeningStatement,
  TradingAccount,
} from '@/lib/types';
import DraftCashReconciliationPanel from './DraftCashReconciliationPanel';

function previewError(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = error.response;
    if (response && typeof response === 'object' && 'status' in response) {
      if (typeof response.status === 'number' && response.status >= 500)
        return 'Opening preview is temporarily unavailable. Please try again.';
      if (
        'data' in response &&
        response.data &&
        typeof response.data === 'object'
      ) {
        if (
          'message' in response.data &&
          typeof response.data.message === 'string'
        )
          return response.data.message;
        if ('details' in response.data)
          return 'Check the opening date and currency balances, then try again.';
      }
    }
  }
  return error instanceof Error
    ? error.message
    : 'Could not load the opening preview.';
}

export default function OpeningPreviewDialog({
  account,
  onHide,
}: {
  account: TradingAccount;
  onHide: () => void;
}) {
  const preview = useOpeningPreview();
  const saveDraft = useSaveOpeningStatement();
  const [beforeVersion, setBeforeVersion] = useState<number>();
  const statements = useOpeningStatements(account.id, beforeVersion);
  const online = useNetworkStatus();
  const { mask, hidden } = usePrivacy();
  const [date, setDate] = useState<Date | null>(null);
  const [balances, setBalances] = useState([{ currency: 'AUD', amount: '' }]);
  const [result, setResult] = useState<OpeningPreview | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<OpeningStatement | null>(null);
  const [loaded, setLoaded] = useState<OpeningStatement | null>(null);
  const [reconciliationStatementId, setReconciliationStatementId] =
    useState('');
  const busy = preview.isPending || saveDraft.isPending;
  const sydneyToday = new Date(
    `${new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Australia/Sydney',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())}T00:00:00`
  );
  const change = (
    index: number,
    field: 'currency' | 'amount',
    value: string
  ) => {
    setResult(null);
    setSaved(null);
    setError('');
    setBalances(rows =>
      rows.map((row, i) =>
        i === index
          ? {
              ...row,
              [field]: field === 'currency' ? value.toUpperCase() : value,
            }
          : row
      )
    );
  };
  const submit = async () => {
    setResult(null);
    setError('');
    setSaved(null);
    if (
      !date ||
      balances.some(row => !row.amount || !/^[A-Z]{3}$/.test(row.currency))
    ) {
      setError(
        'Choose an opening date and enter actual cash for every currency, including zero where applicable.'
      );
      return;
    }
    try {
      setResult(
        await preview.mutateAsync({
          accountId: account.id,
          input: {
            openingDate: toLocalDateString(date),
            cashBalances: balances,
          },
        })
      );
    } catch (failure: unknown) {
      setError(previewError(failure));
    }
  };
  const save = async () => {
    if (!result) return;
    setError('');
    try {
      const response = await saveDraft.mutateAsync({
        accountId: account.id,
        input: {
          openingDate: result.openingDate,
          cashBalances: result.cashBalances.map(balance => ({
            currency: balance.currency,
            amount: balance.openingAmount,
          })),
          sourceFingerprint: result.sourceFingerprint,
        },
      });
      setSaved(response.statement);
      setBeforeVersion(undefined);
    } catch (failure: unknown) {
      setError(previewError(failure));
    }
  };
  const load = (statement: OpeningStatement) => {
    setDate(new Date(`${statement.openingDate}T00:00:00`));
    setBalances(statement.cashBalances.map(balance => ({ ...balance })));
    setLoaded(statement);
    setSaved(null);
    setResult(null);
    setError('');
  };

  return (
    <AppDialog
      header={`Opening-balance preview - ${account.name}`}
      visible
      task
      modal
      blockScroll
      onHide={onHide}
      closable={!busy}
      closeOnEscape={!busy}
      footer={
        <div className='flex justify-end gap-2'>
          <Button label='Close' outlined onClick={onHide} disabled={busy} />
          <Button
            label='Save inactive draft'
            outlined
            disabled={
              !online ||
              busy ||
              !result ||
              Boolean(saved) ||
              account.status === 'CLOSED' ||
              account.isDemo
            }
            loading={saveDraft.isPending}
            onClick={() => void save()}
          />
          <Button
            label='Preview balances'
            loading={preview.isPending}
            disabled={!online || busy}
            onClick={() => void submit()}
          />
        </div>
      }
    >
      <div className='space-y-4'>
        <Message
          severity='info'
          text='Preview is read-only. Save inactive draft explicitly stores an opening statement revision, but creates no deposits and does not enable accounting.'
        />
        <p className='text-sm' style={{ color: 'var(--tr-text-2)' }}>
          Choose an end-of-day date in Australia/Sydney. Trades on that date are
          included in opening holdings and are not charged to opening cash
          again. Enter actual cash from your account statement, not invested
          capital.
        </p>
        {!online && (
          <Message
            severity='warn'
            text='Reconnect to preview opening balances. Offline requests are not queued.'
          />
        )}
        {error && <Message severity='error' text={error} />}
        {saved && (
          <div className='flex flex-wrap items-center gap-2'>
            <Message
              severity='success'
              text={`Opening draft v${saved.version} saved. It is inactive; cash and trading behavior have not changed.`}
            />
            <Button
              label='Review cash reconciliation'
              outlined
              disabled={!online}
              onClick={() => setReconciliationStatementId(saved.id)}
            />
          </div>
        )}
        <section className='space-y-2' aria-label='Saved opening drafts'>
          <h3>Saved inactive drafts</h3>
          {statements.isLoading && (
            <p role='status'>Loading opening drafts...</p>
          )}
          {statements.isError && (
            <div className='space-y-2'>
              <Message severity='error' text={previewError(statements.error)} />
              <Button
                label='Retry loading drafts'
                outlined
                disabled={!online}
                onClick={() => void statements.refetch()}
              />
            </div>
          )}
          {statements.data && (
            <>
              {statements.data.statements.length === 0 && (
                <p>No saved drafts on this page.</p>
              )}
              {statements.data.statements.map(statement => (
                <div
                  key={statement.id}
                  className='flex flex-wrap items-center gap-2'
                >
                  <span>
                    v{statement.version} -{' '}
                    {formatDateDDMMYYYY(statement.openingDate)} -{' '}
                    {statement.parcelCount} parcels - DRAFT
                  </span>
                  <Button
                    label={`Load draft v${statement.version}`}
                    outlined
                    disabled={busy}
                    onClick={() => {
                      setReconciliationStatementId('');
                      load(statement);
                    }}
                  />
                  <Button
                    label={`Review reconciliation v${statement.version}`}
                    outlined
                    disabled={busy || !online}
                    onClick={() => setReconciliationStatementId(statement.id)}
                  />
                </div>
              ))}
              {statements.data.nextBeforeVersion !== null && (
                <Button
                  label='Earlier drafts'
                  outlined
                  disabled={busy || !online}
                  onClick={() =>
                    setBeforeVersion(
                      statements.data?.nextBeforeVersion ?? undefined
                    )
                  }
                />
              )}
            </>
          )}
          {beforeVersion !== undefined && (
            <Button
              label='Latest drafts'
              outlined
              disabled={busy || !online}
              onClick={() => setBeforeVersion(undefined)}
            />
          )}
        </section>
        {loaded && (
          <Message
            severity='info'
            text={`Draft v${loaded.version} loaded as inputs only. Preview again to reconcile against current records.`}
          />
        )}
        {loaded &&
          result &&
          loaded.sourceFingerprint !== result.sourceFingerprint && (
            <Message
              severity='warn'
              text='This saved draft differs from the current preview. Records, inputs or the valuation day have changed; saving creates a new inactive revision.'
            />
          )}
        {reconciliationStatementId && (
          <DraftCashReconciliationPanel
            accountId={account.id}
            statementId={reconciliationStatementId}
            onClose={() => setReconciliationStatementId('')}
          />
        )}
        <div className='space-y-2'>
          <label htmlFor='opening-preview-date'>Opening date</label>
          <Calendar
            inputId='opening-preview-date'
            value={date}
            dateFormat='dd/mm/yy'
            showIcon
            maxDate={sydneyToday}
            disabled={busy}
            onChange={event => {
              setDate(event.value instanceof Date ? event.value : null);
              setResult(null);
              setSaved(null);
              setError('');
            }}
          />
        </div>
        <fieldset className='space-y-3' disabled={busy}>
          <legend>Actual opening cash by currency</legend>
          {balances.map((row, index) => (
            <div key={index} className='flex flex-wrap items-end gap-2'>
              <div>
                <label htmlFor={`opening-currency-${index}`}>
                  Currency {index + 1}
                </label>
                <InputText
                  id={`opening-currency-${index}`}
                  value={row.currency}
                  maxLength={3}
                  className='block w-24'
                  onChange={event =>
                    change(index, 'currency', event.target.value)
                  }
                />
              </div>
              <div>
                <label htmlFor={`opening-cash-${index}`}>
                  Cash balance {index + 1}
                </label>
                <InputText
                  id={`opening-cash-${index}`}
                  value={row.amount}
                  inputMode='decimal'
                  placeholder='Actual balance (enter 0 if zero)'
                  className='block'
                  type={hidden ? 'password' : 'text'}
                  onChange={event =>
                    change(index, 'amount', event.target.value)
                  }
                />
              </div>
              <Button
                label={`Remove currency ${index + 1}`}
                icon='pi pi-trash'
                outlined
                severity='secondary'
                disabled={balances.length === 1}
                onClick={() => {
                  setBalances(rows => rows.filter((_, i) => i !== index));
                  setResult(null);
                  setSaved(null);
                  setError('');
                }}
              />
            </div>
          ))}
          <Button
            label='Add currency'
            icon='pi pi-plus'
            outlined
            disabled={balances.length >= 20}
            onClick={() => {
              setBalances(rows => [...rows, { currency: '', amount: '' }]);
              setResult(null);
              setSaved(null);
              setError('');
            }}
          />
        </fieldset>
        {result && (
          <section className='space-y-3' aria-label='Opening preview results'>
            <h3>Preview as of {formatDateDDMMYYYY(result.asOfDate)}</h3>
            <p>
              {result.counts.parcels} parcels;{' '}
              {result.counts.postBoundaryTrades} subsequent trades;{' '}
              {result.counts.blockingIssues} blocking issues detected.
            </p>
            <p className='text-sm'>
              These are trade-only projections, not verified account balances.
              No confirmation or performance metrics are available yet.
            </p>
            {result.issues.map((issue, index) => (
              <Message
                key={`${issue.code}-${index}`}
                severity={issue.severity === 'BLOCKING' ? 'error' : 'warn'}
                text={`${issue.code}: ${issue.message}`}
              />
            ))}
            <div className='overflow-x-auto'>
              <table className='w-full text-sm'>
                <caption>Trade-only cash projection</caption>
                <thead>
                  <tr>
                    <th>Currency</th>
                    <th>Opening cash</th>
                    <th>Ending cash</th>
                    <th>Minimum cash</th>
                  </tr>
                </thead>
                <tbody>
                  {result.cashBalances.map(row => (
                    <tr key={row.currency}>
                      <td>{row.currency}</td>
                      <td>{mask(row.openingAmount)}</td>
                      <td>{mask(row.tradeOnlyEndingAmount)}</td>
                      <td>{mask(row.minimumTradeOnlyAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className='overflow-x-auto'>
              <table className='w-full text-sm'>
                <caption>Parcel reconciliation</caption>
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Opening units</th>
                    <th>Expected current units</th>
                    <th>Recorded current units</th>
                  </tr>
                </thead>
                <tbody>
                  {result.parcels.map(row => (
                    <tr key={row.positionId}>
                      <td>{row.symbol}</td>
                      <td>{mask(row.openingQuantity)}</td>
                      <td>{mask(row.expectedCurrentQuantity)}</td>
                      <td>{mask(row.recordedCurrentQuantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </AppDialog>
  );
}

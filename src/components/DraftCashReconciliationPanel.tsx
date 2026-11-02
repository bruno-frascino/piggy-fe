'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Checkbox } from 'primereact/checkbox';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import {
  useDraftOpeningReconciliation,
  usePreviewDraftCashEvidence,
  useRecordDraftCashEvidence,
  useSaveDraftReconciliationCashOperation,
} from '@/hooks/api';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { formatDateDDMMYYYY, toLocalDateString } from '@/lib/date';
import { usePrivacy } from '@/lib/privacy-context';
import type {
  DraftCashEvidenceInput,
  DraftCashEvidenceReason,
  DraftCashFlowInput,
} from '@/lib/types';

const reasons: { label: string; value: DraftCashEvidenceReason }[] = [
  { label: 'Unrecorded operation', value: 'UNRECORDED_OPERATION' },
  { label: 'Timing difference', value: 'TIMING_DIFFERENCE' },
  { label: 'Source correction required', value: 'SOURCE_CORRECTION_REQUIRED' },
  { label: 'Other', value: 'OTHER' },
];

function errorText(error: unknown): string {
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    'status' in error.response
  ) {
    const response = error.response;
    if (typeof response.status === 'number' && response.status >= 500)
      return 'Reconciliation is temporarily unavailable. Please try again.';
    if (
      'data' in response &&
      response.data &&
      typeof response.data === 'object' &&
      'message' in response.data &&
      typeof response.data.message === 'string'
    )
      return response.data.message;
  }
  return error instanceof Error
    ? error.message
    : 'The request could not be completed.';
}

function newIdempotencyKey(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `draft-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

function dateValue(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

function dayAfter(value: string): Date {
  const date = dateValue(value);
  date.setDate(date.getDate() + 1);
  return date;
}

export default function DraftCashReconciliationPanel({
  accountId,
  statementId,
  onClose,
}: {
  accountId: string;
  statementId: string;
  onClose: () => void;
}) {
  const online = useNetworkStatus();
  const { mask, hidden } = usePrivacy();
  const reportQuery = useDraftOpeningReconciliation(accountId, statementId);
  const previewMutation = usePreviewDraftCashEvidence();
  const recordMutation = useRecordDraftCashEvidence();
  const operationMutation = useSaveDraftReconciliationCashOperation();
  const report = reportQuery.data;
  const [evidenceDate, setEvidenceDate] = useState<Date | null>(null);
  const [evidenceSource, setEvidenceSource] = useState('');
  const [evidenceReference, setEvidenceReference] = useState('');
  const [statementBalances, setStatementBalances] = useState<
    { currency: string; amount: string }[]
  >([]);
  const [evidenceKey, setEvidenceKey] = useState(newIdempotencyKey);
  const [preview, setPreview] = useState<Awaited<
    ReturnType<typeof previewMutation.mutateAsync>
  > | null>(null);
  const [decisions, setDecisions] = useState<
    Record<string, { reason: DraftCashEvidenceReason | ''; note: string }>
  >({});
  const [attested, setAttested] = useState(false);
  const [cashDate, setCashDate] = useState<Date | null>(null);
  const [cashSequence, setCashSequence] = useState('1');
  const [cashKind, setCashKind] = useState<'DEPOSIT' | 'WITHDRAWAL'>('DEPOSIT');
  const [cashCurrency, setCashCurrency] = useState('');
  const [cashAmount, setCashAmount] = useState('');
  const [cashSourceReference, setCashSourceReference] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const invalidateEvidencePreview = () => {
    setPreview(null);
    setDecisions({});
    setEvidenceKey(newIdempotencyKey());
  };

  const today = useMemo(() => {
    const sydneyDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Australia/Sydney',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    return dateValue(sydneyDate);
  }, []);

  useEffect(() => {
    if (!report || statementBalances.length) return;
    const initial = report.cash.balances.map(balance => ({
      currency: balance.currency,
      amount: balance.endingAmount,
    }));
    setStatementBalances(initial);
    setCashCurrency(initial[0]?.currency ?? '');
  }, [report, statementBalances.length]);

  const evidenceCurrencies = useMemo(
    () => report?.cash.balances.map(balance => balance.currency) ?? [],
    [report]
  );
  const activityByIdempotencyKey = useMemo(
    () =>
      new Map(
        report?.cash.activity.map(activity => [
          activity.idempotencyKey,
          activity,
        ]) ?? []
      ),
    [report]
  );
  const varianceCurrencies =
    preview?.comparison.variances.map(row => row.currency) ?? [];
  const decisionsComplete = varianceCurrencies.every(currency => {
    const decision = decisions[currency];
    return Boolean(decision?.reason && decision.note.trim());
  });
  const evidenceBusy = previewMutation.isPending || recordMutation.isPending;
  const busy = evidenceBusy || operationMutation.isPending;

  const updateStatementBalance = (
    index: number,
    field: 'currency' | 'amount',
    value: string
  ) => {
    setStatementBalances(rows =>
      rows.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              [field]: field === 'currency' ? value.toUpperCase() : value,
            }
          : row
      )
    );
    invalidateEvidencePreview();
    setError('');
  };

  const evidenceInput = (withDecisions: boolean): DraftCashEvidenceInput => ({
    idempotencyKey: evidenceKey,
    asOfDate: evidenceDate ? toLocalDateString(evidenceDate) : '',
    source: evidenceSource.trim(),
    reference: evidenceReference.trim(),
    attested: true,
    cashBalances: statementBalances,
    decisions: withDecisions
      ? varianceCurrencies.map(currency => ({
          currency,
          reason: decisions[currency].reason as DraftCashEvidenceReason,
          note: decisions[currency].note.trim(),
        }))
      : [],
  });

  const previewEvidence = async () => {
    setError('');
    setSuccess('');
    setPreview(null);
    if (
      !evidenceDate ||
      !evidenceSource.trim() ||
      !evidenceReference.trim() ||
      !attested ||
      statementBalances.length !== evidenceCurrencies.length ||
      evidenceBalancesInvalid()
    ) {
      setError(
        'Enter every currency balance, identify the statement, and confirm the attestation before previewing.'
      );
      return;
    }
    try {
      const result = await previewMutation.mutateAsync({
        accountId,
        statementId,
        input: evidenceInput(false),
      });
      setPreview(result);
      setDecisions({});
    } catch (failure: unknown) {
      setError(errorText(failure));
    }
  };

  const saveEvidence = async () => {
    if (!preview || !decisionsComplete || !attested) return;
    setError('');
    setSuccess('');
    try {
      const result = await recordMutation.mutateAsync({
        accountId,
        statementId,
        input: evidenceInput(true),
      });
      setPreview(null);
      setAttested(false);
      setEvidenceKey(newIdempotencyKey());
      setSuccess(
        result.comparison.matchesReplay
          ? 'Statement evidence recorded. It remains user-attested and unverified.'
          : 'Statement evidence and variance decisions recorded. The variance remains unresolved until dated replay matches.'
      );
    } catch (failure: unknown) {
      setError(errorText(failure));
    }
  };

  function evidenceBalancesInvalid(): boolean {
    return statementBalances.some(
      row =>
        !/^[A-Z]{3}$/.test(row.currency) ||
        row.currency !== row.currency.trim() ||
        !row.amount.trim()
    );
  }

  const saveCashOperation = async () => {
    setError('');
    setSuccess('');
    const sequence = Number(cashSequence);
    if (
      !cashDate ||
      !Number.isSafeInteger(sequence) ||
      sequence < 1 ||
      !cashCurrency ||
      !cashAmount.trim() ||
      !cashSourceReference.trim()
    ) {
      setError(
        'Enter a date, stable sequence, currency, amount, and actual source reference.'
      );
      return;
    }
    const input: DraftCashFlowInput = {
      idempotencyKey: newIdempotencyKey(),
      effectiveDate: toLocalDateString(cashDate),
      sequence,
      kind: cashKind,
      currency: cashCurrency,
      amount: cashAmount.trim(),
      sourceReference: cashSourceReference.trim(),
    };
    try {
      await operationMutation.mutateAsync({ accountId, statementId, input });
      setCashAmount('');
      setCashSourceReference('');
      setSuccess(
        'Dated operation staged in the inactive draft. Cash replay has been refreshed.'
      );
    } catch (failure: unknown) {
      setError(errorText(failure));
    }
  };

  const availableSequence = (date: Date | null) => {
    if (!report || !date) return '1';
    const effectiveDate = toLocalDateString(date);
    return String(
      report.cash.activity
        .filter(activity => activity.effectiveDate === effectiveDate)
        .reduce(
          (maximum, activity) => Math.max(maximum, activity.sequence),
          0
        ) + 1
    );
  };

  if (reportQuery.isLoading)
    return (
      <section aria-label='Opening reconciliation' className='space-y-3'>
        <p role='status'>Loading reconciliation...</p>
        <Button label='Close reconciliation' outlined onClick={onClose} />
      </section>
    );

  if (reportQuery.isError || !report)
    return (
      <section aria-label='Opening reconciliation' className='space-y-3'>
        <Message severity='error' text={errorText(reportQuery.error)} />
        <Button
          label='Retry reconciliation'
          outlined
          disabled={!online}
          onClick={() => void reportQuery.refetch()}
        />
        <Button label='Close reconciliation' outlined onClick={onClose} />
      </section>
    );

  return (
    <section
      aria-label='Opening reconciliation'
      className='space-y-4 border-t pt-4'
    >
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <h3>Reconciliation review</h3>
        <Button label='Close reconciliation' outlined onClick={onClose} />
      </div>
      <Message
        severity='warn'
        text='Cash evidence is user-attested, not externally verified. Cash remains UNVERIFIED and accounting remains inactive; this review cannot activate the account.'
      />
      {!online && (
        <Message
          severity='warn'
          text='Reconnect to preview or record changes. Offline changes are not queued.'
        />
      )}
      {report.source.changed && (
        <Message
          severity='warn'
          text='The source records have changed since this opening draft was reviewed.'
        />
      )}
      {!report.cash.funded && (
        <Message
          severity='error'
          text='The dated cash replay contains a funding gap. The draft does not create implicit funding.'
        />
      )}
      {error && <Message severity='error' text={error} />}
      {success && <Message severity='success' text={success} />}

      <section className='space-y-2' aria-label='Cash replay'>
        <h4>Cash replay through {formatDateDDMMYYYY(report.asOfDate)}</h4>
        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <caption>Inactive cash balances by currency</caption>
            <thead>
              <tr>
                <th>Currency</th>
                <th>Opening</th>
                <th>Current replay</th>
                <th>Minimum</th>
                <th>External contributions</th>
              </tr>
            </thead>
            <tbody>
              {report.cash.balances.map(balance => (
                <tr key={balance.currency}>
                  <td>{balance.currency}</td>
                  <td>{mask(balance.openingAmount)}</td>
                  <td>{mask(balance.endingAmount)}</td>
                  <td>{mask(balance.minimumAmount)}</td>
                  <td>{mask(balance.netExternalContribution)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {report.cash.fundingIssues.map((issue, index) => (
          <Message
            key={`${issue.idempotencyKey}-${index}`}
            severity='error'
            text={`${issue.currency} funding issue on ${formatDateDDMMYYYY(issue.effectiveDate)} at sequence ${issue.sequence}: ${mask(issue.balance)}`}
          />
        ))}
      </section>

      <section className='space-y-2' aria-label='Inventory reconciliation'>
        <h4>Inventory comparison</h4>
        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <caption>Opening parcel and current quantity differences</caption>
            <thead>
              <tr>
                <th>Position</th>
                <th>Opening difference</th>
                <th>Projected remaining</th>
                <th>Live expected</th>
                <th>Live recorded</th>
                <th>Scenario difference</th>
              </tr>
            </thead>
            <tbody>
              {report.inventory.map(row => (
                <tr key={row.positionId}>
                  <td>{row.positionId}</td>
                  <td>
                    {row.openingDifference === null
                      ? 'Not comparable'
                      : mask(row.openingDifference)}
                  </td>
                  <td>
                    {row.proposedRemaining === null
                      ? '—'
                      : mask(row.proposedRemaining)}
                  </td>
                  <td>
                    {row.liveExpectedRemaining === null
                      ? '—'
                      : mask(row.liveExpectedRemaining)}
                  </td>
                  <td>
                    {row.liveRecordedRemaining === null
                      ? '—'
                      : mask(row.liveRecordedRemaining)}
                  </td>
                  <td>
                    {row.scenarioDifference === null
                      ? 'Not comparable'
                      : mask(row.scenarioDifference)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {report.proposedParcels.map(parcel => (
          <p key={parcel.parcelKey} className='text-sm'>
            Proposed parcel {parcel.symbol ?? parcel.parcelKey}:{' '}
            {mask(parcel.remaining)} {parcel.currency} units remaining.
          </p>
        ))}
      </section>

      <section className='space-y-2' aria-label='Trade source review'>
        <h4>Trade source links and overlap review</h4>
        {report.tradeSources.length === 0 && (
          <p>No post-boundary trade sources in the review period.</p>
        )}
        {report.tradeSources.map(source => (
          <p key={source.transactionId} className='text-sm'>
            {source.kind} {source.transactionId} on{' '}
            {formatDateDDMMYYYY(source.effectiveDate)}: {source.linkage}
            {source.operationId ? ` (${source.operationId})` : ''}
            {source.potentialOverlapOperationIds.length
              ? `; possible overlap with ${source.potentialOverlapOperationIds.join(', ')}`
              : ''}
          </p>
        ))}
        {report.excludedLinkedSources.map(source => (
          <Message
            key={`${source.transactionId}-${source.operationId}`}
            severity='warn'
            text={`Linked source ${source.transactionId} excluded: ${source.reason} (${source.operationId}).`}
          />
        ))}
        {report.previewIssues.map((issue, index) => (
          <Message
            key={`${issue.code}-${index}`}
            severity={issue.severity === 'BLOCKING' ? 'error' : 'warn'}
            text={`${issue.code}: ${issue.message}`}
          />
        ))}
        {report.reviewReasons.map((reason, index) => (
          <Message key={`${reason}-${index}`} severity='warn' text={reason} />
        ))}
      </section>

      <section className='space-y-3' aria-label='Statement cash evidence'>
        <h4>Statement-date cash evidence</h4>
        <p className='text-sm'>
          Enter the balances shown by an actual statement. A variance decision
          records what you reviewed; it does not adjust cash or resolve the
          difference.
        </p>
        {report.cashEvidence.map(evidence => (
          <div key={evidence.id} className='rounded border p-3'>
            <p>
              {formatDateDDMMYYYY(evidence.asOfDate)} · {evidence.source} ·{' '}
              {evidence.reference}
              {' · '}User attested / unverified
            </p>
            <p className='text-sm'>
              Recorded {formatDateDDMMYYYY(evidence.recordedAt)} ·{' '}
              {evidence.fundedAtEvidenceDate
                ? 'funded at evidence date'
                : 'funding gap at evidence date'}
            </p>
            <ul>
              {evidence.statementBalances.map(balance => {
                const variance = evidence.currentComparison.variances.find(
                  row => row.currency === balance.currency
                );
                return (
                  <li key={balance.currency}>
                    {balance.currency}: statement {mask(balance.amount)}
                    {variance
                      ? `; replay ${mask(variance.expectedAmount)}; difference ${mask(variance.difference)}`
                      : '; replay matches'}
                  </li>
                );
              })}
            </ul>
            {evidence.decisions.length > 0 && (
              <ul>
                {evidence.decisions.map(decision => (
                  <li key={decision.currency}>
                    {decision.currency}: {decision.reason} — {decision.note}
                  </li>
                ))}
              </ul>
            )}
            {!evidence.currentComparison.matchesReplay && (
              <Message
                severity='warn'
                text='Variance remains unresolved until exact dated replay matches the statement.'
              />
            )}
          </div>
        ))}

        <div className='grid gap-3 md:grid-cols-2'>
          <div className='space-y-2'>
            <label htmlFor='cash-evidence-date'>Statement date</label>
            <Calendar
              inputId='cash-evidence-date'
              value={evidenceDate}
              dateFormat='dd/mm/yy'
              minDate={dayAfter(report.openingDate)}
              maxDate={today}
              showIcon
              disabled={busy}
              onChange={event => {
                setEvidenceDate(
                  event.value instanceof Date ? event.value : null
                );
                invalidateEvidencePreview();
              }}
            />
            <label htmlFor='cash-evidence-source'>Statement source</label>
            <InputText
              id='cash-evidence-source'
              value={evidenceSource}
              maxLength={120}
              disabled={evidenceBusy}
              onChange={event => {
                setEvidenceSource(event.target.value);
                invalidateEvidencePreview();
              }}
            />
            <label htmlFor='cash-evidence-reference'>Statement reference</label>
            <InputText
              id='cash-evidence-reference'
              value={evidenceReference}
              maxLength={200}
              disabled={evidenceBusy}
              onChange={event => {
                setEvidenceReference(event.target.value);
                invalidateEvidencePreview();
              }}
            />
            {statementBalances.map((balance, index) => (
              <div key={balance.currency} className='flex gap-2'>
                <label htmlFor={`statement-cash-${balance.currency}`}>
                  {balance.currency} statement balance
                </label>
                <InputText
                  id={`statement-cash-${balance.currency}`}
                  value={balance.amount}
                  inputMode='decimal'
                  type={hidden ? 'password' : 'text'}
                  disabled={evidenceBusy}
                  onChange={event =>
                    updateStatementBalance(index, 'amount', event.target.value)
                  }
                />
              </div>
            ))}
            <div className='flex items-center gap-2'>
              <Checkbox
                inputId='cash-evidence-attested'
                checked={attested}
                disabled={evidenceBusy}
                onChange={event => {
                  setAttested(event.checked === true);
                  invalidateEvidencePreview();
                }}
              />
              <label htmlFor='cash-evidence-attested'>
                I attest these balances match the statement I reviewed.
              </label>
            </div>
            <Button
              label='Preview exact variances'
              outlined
              disabled={!online || busy}
              loading={previewMutation.isPending}
              onClick={() => void previewEvidence()}
            />
          </div>

          {preview && (
            <div className='space-y-3' aria-label='Statement variance preview'>
              <h5>
                Exact comparison as of {formatDateDDMMYYYY(preview.asOfDate)}
              </h5>
              {preview.comparison.variances.length === 0 ? (
                <Message
                  severity='success'
                  text='Statement cash matches exact dated replay. It remains unverified.'
                />
              ) : (
                preview.comparison.variances.map(variance => (
                  <div
                    key={variance.currency}
                    className='space-y-2 border-b pb-3'
                  >
                    <p>
                      {variance.currency}: statement{' '}
                      {mask(variance.statementAmount)}, replay{' '}
                      {mask(variance.expectedAmount)}, difference{' '}
                      {mask(variance.difference)}
                    </p>
                    <label htmlFor={`variance-reason-${variance.currency}`}>
                      Review reason
                    </label>
                    <Dropdown
                      inputId={`variance-reason-${variance.currency}`}
                      value={decisions[variance.currency]?.reason ?? ''}
                      options={reasons}
                      optionLabel='label'
                      optionValue='value'
                      placeholder='Choose a reason'
                      disabled={busy}
                      onChange={event =>
                        setDecisions(current => ({
                          ...current,
                          [variance.currency]: {
                            reason: event.value as DraftCashEvidenceReason,
                            note: current[variance.currency]?.note ?? '',
                          },
                        }))
                      }
                    />
                    <label htmlFor={`variance-note-${variance.currency}`}>
                      Review note
                    </label>
                    <InputText
                      id={`variance-note-${variance.currency}`}
                      maxLength={1000}
                      value={decisions[variance.currency]?.note ?? ''}
                      disabled={busy}
                      onChange={event =>
                        setDecisions(current => ({
                          ...current,
                          [variance.currency]: {
                            reason: current[variance.currency]?.reason ?? '',
                            note: event.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                ))
              )}
              <Button
                label='Record immutable evidence'
                disabled={!online || busy || !attested || !decisionsComplete}
                loading={recordMutation.isPending}
                onClick={() => void saveEvidence()}
              />
            </div>
          )}
        </div>
      </section>

      <section className='space-y-3' aria-label='Dated manual cash operations'>
        <h4>Stage an actual dated deposit or withdrawal</h4>
        <Message
          severity='info'
          text='Only an actual, sourced cash movement can be entered here. This is not a balancing adjustment; replay and funding checks remain in force.'
        />
        <div className='grid gap-3 md:grid-cols-2'>
          <div className='space-y-2'>
            <label htmlFor='cash-operation-date'>Effective date</label>
            <Calendar
              inputId='cash-operation-date'
              value={cashDate}
              dateFormat='dd/mm/yy'
              minDate={dayAfter(report.openingDate)}
              maxDate={today}
              showIcon
              disabled={busy}
              onChange={event => {
                const next = event.value instanceof Date ? event.value : null;
                setCashDate(next);
                setCashSequence(availableSequence(next));
              }}
            />
            <label htmlFor='cash-operation-sequence'>
              Stable sequence for this date
            </label>
            <InputText
              id='cash-operation-sequence'
              value={cashSequence}
              inputMode='numeric'
              disabled={busy}
              onChange={event => setCashSequence(event.target.value)}
            />
            <label htmlFor='cash-operation-kind'>Operation</label>
            <Dropdown
              inputId='cash-operation-kind'
              value={cashKind}
              options={[
                { label: 'Deposit', value: 'DEPOSIT' },
                { label: 'Withdrawal', value: 'WITHDRAWAL' },
              ]}
              optionLabel='label'
              optionValue='value'
              disabled={busy}
              onChange={event =>
                setCashKind(event.value as 'DEPOSIT' | 'WITHDRAWAL')
              }
            />
          </div>
          <div className='space-y-2'>
            <label htmlFor='cash-operation-currency'>Currency</label>
            <Dropdown
              inputId='cash-operation-currency'
              value={cashCurrency}
              options={evidenceCurrencies.map(currency => ({
                label: currency,
                value: currency,
              }))}
              optionLabel='label'
              optionValue='value'
              disabled={busy}
              onChange={event => setCashCurrency(event.value as string)}
            />
            <label htmlFor='cash-operation-amount'>Amount</label>
            <InputText
              id='cash-operation-amount'
              value={cashAmount}
              inputMode='decimal'
              type={hidden ? 'password' : 'text'}
              disabled={busy}
              onChange={event => setCashAmount(event.target.value)}
            />
            <label htmlFor='cash-operation-reference'>
              Actual source reference
            </label>
            <InputText
              id='cash-operation-reference'
              value={cashSourceReference}
              maxLength={200}
              disabled={busy}
              onChange={event => setCashSourceReference(event.target.value)}
            />
          </div>
        </div>
        <Button
          label='Stage dated operation'
          disabled={!online || busy}
          loading={operationMutation.isPending}
          onClick={() => void saveCashOperation()}
        />
        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <caption>Recorded inactive cash activity</caption>
            <thead>
              <tr>
                <th>Date</th>
                <th>Sequence</th>
                <th>Operation</th>
                <th>Source reference</th>
                <th>Amounts and balances after</th>
              </tr>
            </thead>
            <tbody>
              {report.cashOperations.map(operation => {
                const activity = activityByIdempotencyKey.get(
                  operation.idempotencyKey
                );
                return (
                  <tr key={operation.operationId}>
                    <td>{formatDateDDMMYYYY(operation.effectiveDate)}</td>
                    <td>{operation.sequence}</td>
                    <td>
                      {operation.kind} · {operation.status}
                    </td>
                    <td>
                      {operation.sourceOrigin} · {operation.sourceReference}
                    </td>
                    <td>
                      {activity
                        ? activity.changes
                            .map(
                              change =>
                                `${change.currency}: ${mask(change.amount)} → ${mask(change.balanceAfter)}`
                            )
                            .join('; ')
                        : 'No current cash effect (reversed).'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

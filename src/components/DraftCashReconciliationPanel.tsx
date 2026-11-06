'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Checkbox } from 'primereact/checkbox';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import DraftCashCorrectionForm from './DraftCashCorrectionForm';
import DraftExecutionCorrectionForm from './DraftExecutionCorrectionForm';
import {
  useDraftOpeningReconciliation,
  usePreviewDraftCashEvidence,
  useRecordDraftCashEvidence,
  useSaveDraftReconciliationCashOperation,
  useStageDraftImportedExecutionCash,
  useStageDraftManualExecutionCash,
} from '@/hooks/api';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { formatDateDDMMYYYY, toLocalDateString } from '@/lib/date';
import { usePrivacy } from '@/lib/privacy-context';
import type {
  DraftCashEvidenceInput,
  DraftCashEvidenceReason,
  DraftCashFlowInput,
  DraftOpeningReconciliation,
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
  const importedOperationMutation = useStageDraftImportedExecutionCash();
  const manualOperationMutation = useStageDraftManualExecutionCash();
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
  const [importSequences, setImportSequences] = useState<
    Record<string, string>
  >({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [correction, setCorrection] = useState<{
    accountId: string;
    statementId: string;
    operation: DraftOpeningReconciliation['cashOperations'][number];
  } | null>(null);
  const [saleCorrection, setSaleCorrection] = useState<{
    accountId: string;
    statementId: string;
    fingerprint: string;
    operation: DraftOpeningReconciliation['cashOperations'][number];
    execution: DraftOpeningReconciliation['cashManualExecutions'][number];
  } | null>(null);
  const activeSaleCorrection =
    saleCorrection?.accountId === accountId &&
    saleCorrection.statementId === statementId
      ? saleCorrection
      : null;
  const activeCorrection =
    correction?.accountId === accountId &&
    correction.statementId === statementId
      ? correction
      : null;
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
  const busy =
    evidenceBusy ||
    operationMutation.isPending ||
    importedOperationMutation.isPending ||
    manualOperationMutation.isPending ||
    Boolean(activeCorrection);

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

  const sequenceForImportedEvent = (eventId: string) =>
    importSequences[JSON.stringify([accountId, statementId, eventId])] ?? '';

  const stageImportedExecution = async (eventId: string) => {
    setError('');
    setSuccess('');
    const sequenceText = sequenceForImportedEvent(eventId);
    const sequence = Number(sequenceText);
    if (!/^[1-9]\d*$/.test(sequenceText) || !Number.isSafeInteger(sequence)) {
      setError(
        'Enter an explicit positive stable sequence for this imported execution date.'
      );
      return;
    }
    try {
      await importedOperationMutation.mutateAsync({
        accountId,
        statementId,
        eventId,
        input: { sequence },
      });
      setSuccess(
        'Imported execution cash staged from its persisted Kraken record. Cash replay has been refreshed.'
      );
    } catch (failure: unknown) {
      setError(errorText(failure));
    }
  };

  const stageManualExecution = async (transactionId: string) => {
    setError('');
    setSuccess('');
    const text = sequenceForImportedEvent(`manual:${transactionId}`);
    const sequence = Number(text);
    if (!/^[1-9]\d*$/.test(text) || !Number.isSafeInteger(sequence)) {
      setError(
        'Enter an explicit positive stable sequence for this manual execution date.'
      );
      return;
    }
    try {
      await manualOperationMutation.mutateAsync({
        accountId,
        statementId,
        transactionId,
        input: { sequence },
      });
      setSuccess(
        'Manual execution cash staged from its persisted transaction. Cash replay has been refreshed.'
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
      {report.source.correctionCount > 0 && (
        <Message
          severity='info'
          text={`This draft continues from ${report.source.correctionCount} audited live sale correction(s). The original opening snapshot remains unchanged; source checks use the retained correction chain.`}
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
                <th>Corrections</th>
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
                    <td>
                      {operation.revisions.map(revision => (
                        <p key={revision.revisionId}>
                          {revision.replacement ? 'Correction' : 'Reversal'}:{' '}
                          {revision.reason}
                          {revision.executionAudit && (
                            <>
                              {` · Live ${revision.executionAudit.kind === 'BUY' ? 'acquisition' : 'sale'} audit #`}
                              {revision.executionAudit.number}
                              {' · '}
                              {formatDateDDMMYYYY(
                                revision.executionAudit.before.date
                              )}
                              {' → '}
                              {formatDateDDMMYYYY(
                                revision.executionAudit.after.date
                              )}
                              {' · Price '}
                              {mask(revision.executionAudit.before.price)}
                              {' → '}
                              {mask(revision.executionAudit.after.price)}
                              {' · Fees '}
                              {mask(revision.executionAudit.before.fees)}
                              {' → '}
                              {mask(revision.executionAudit.after.fees)}
                              {' · Gross '}
                              {mask(revision.executionAudit.before.totalValue)}
                              {' → '}
                              {mask(revision.executionAudit.after.totalValue)}
                              {revision.executionAudit.kind === 'BUY' && (
                                <>
                                  {' · Quantity '}
                                  {mask(
                                    revision.executionAudit.before.quantity
                                  )}
                                  {' → '}
                                  {mask(revision.executionAudit.after.quantity)}
                                </>
                              )}
                            </>
                          )}
                        </p>
                      ))}
                      {operation.sourceOrigin === 'MANUAL' &&
                        (operation.kind === 'SELL' ||
                          operation.kind === 'BUY') &&
                        operation.status !== 'REVERSED' &&
                        report.cashManualExecutions.some(
                          execution =>
                            execution.operationId === operation.operationId
                        ) && (
                          <Button
                            label={`Correct recorded ${operation.kind === 'BUY' ? 'acquisition' : 'sale'} ${operation.sourceReference}`}
                            outlined
                            disabled={!online || busy || report.source.changed}
                            onClick={() => {
                              const execution =
                                report.cashManualExecutions.find(
                                  row =>
                                    row.operationId === operation.operationId
                                );
                              if (!execution) return;
                              setError('');
                              setSuccess('');
                              setCorrection(null);
                              setSaleCorrection({
                                accountId,
                                statementId,
                                fingerprint: report.source.currentFingerprint,
                                operation,
                                execution,
                              });
                            }}
                          />
                        )}
                      {operation.sourceOrigin === 'MANUAL' &&
                        operation.cash &&
                        (operation.kind === 'DEPOSIT' ||
                          operation.kind === 'WITHDRAWAL') &&
                        operation.status !== 'REVERSED' && (
                          <Button
                            label={`Correct ${operation.sourceReference}`}
                            outlined
                            disabled={!online || busy || report.source.changed}
                            onClick={() => {
                              setError('');
                              setSuccess('');
                              setSaleCorrection(null);
                              setCorrection({
                                accountId,
                                statementId,
                                operation,
                              });
                            }}
                          />
                        )}
                      {operation.sourceOrigin === 'IMPORT' &&
                        (operation.kind === 'BUY' ||
                          operation.kind === 'SELL') &&
                        operation.status !== 'REVERSED' && (
                          <Button
                            label={`Correct sequence ${operation.sourceReference}`}
                            outlined
                            disabled={!online || busy || report.source.changed}
                            onClick={() => {
                              setError('');
                              setSuccess('');
                              setSaleCorrection(null);
                              setCorrection({
                                accountId,
                                statementId,
                                operation,
                              });
                            }}
                          />
                        )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {activeCorrection && (
          <DraftCashCorrectionForm
            key={JSON.stringify([
              accountId,
              statementId,
              activeCorrection.operation.operationId,
            ])}
            accountId={accountId}
            statementId={statementId}
            openingDate={report.openingDate}
            operation={activeCorrection.operation}
            stale={
              report.source.changed ||
              !report.cashOperations.some(
                operation =>
                  operation.operationId ===
                    activeCorrection.operation.operationId &&
                  operation.currentRevisionId ===
                    activeCorrection.operation.currentRevisionId
              )
            }
            onCancel={() => setCorrection(null)}
            onSaved={() => {
              setCorrection(null);
              invalidateEvidencePreview();
              setError('');
              setSuccess(
                'Audited correction saved in the inactive draft. Cash replay and evidence comparisons have been refreshed.'
              );
            }}
            onError={failure => setError(errorText(failure))}
          />
        )}
      </section>

      {activeSaleCorrection && (
        <DraftExecutionCorrectionForm
          key={JSON.stringify([
            accountId,
            statementId,
            activeSaleCorrection.operation.currentRevisionId,
          ])}
          accountId={accountId}
          statementId={statementId}
          openingDate={report.openingDate}
          asOfDate={report.source.reviewedAsOfDate}
          fingerprint={activeSaleCorrection.fingerprint}
          operation={activeSaleCorrection.operation}
          execution={activeSaleCorrection.execution}
          stale={
            report.source.changed ||
            report.source.currentFingerprint !==
              activeSaleCorrection.fingerprint ||
            report.cashOperations.find(
              row =>
                row.operationId === activeSaleCorrection.operation.operationId
            )?.currentRevisionId !==
              activeSaleCorrection.operation.currentRevisionId
          }
          onCancel={() => setSaleCorrection(null)}
          onSaved={() => {
            setSaleCorrection(null);
            invalidateEvidencePreview();
            setSuccess(
              `Live ${activeSaleCorrection.operation.kind === 'BUY' ? 'acquisition' : 'sale'} and draft cash corrected atomically. Review refreshed portfolio results and any stale tax reports.`
            );
          }}
          onError={failure => setError(errorText(failure))}
        />
      )}

      <section
        className='space-y-3'
        aria-label='Manual execution cash operations'
      >
        <h4>Stage cash for recorded manual trades</h4>
        <Message
          severity='info'
          text='Date, currency, gross amount and fees come from the recorded transaction. Choose an explicit stable sequence. Staging only affects this inactive cash replay, not live holdings or balances.'
        />
        {report.cashManualExecutions.length === 0 ? (
          <p>No recorded manual trades are available for this account.</p>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <caption>
                Manual executions available for inactive cash replay
              </caption>
              <thead>
                <tr>
                  <th>Transaction</th>
                  <th>Date</th>
                  <th>Gross</th>
                  <th>Fee</th>
                  <th>Stable sequence</th>
                  <th>Action / status</th>
                </tr>
              </thead>
              <tbody>
                {report.cashManualExecutions.map(execution => {
                  const key = `manual:${execution.transactionId}`;
                  const text = sequenceForImportedEvent(key);
                  return (
                    <tr key={execution.transactionId}>
                      <td>
                        {execution.kind} · {execution.transactionId}
                      </td>
                      <td>{formatDateDDMMYYYY(execution.effectiveDate)}</td>
                      <td>
                        {execution.currency} {mask(execution.grossValue)}
                      </td>
                      <td>
                        {execution.currency} {mask(execution.fee)}
                      </td>
                      <td>
                        <InputText
                          aria-label={`Stable sequence for manual transaction ${execution.transactionId}`}
                          value={text}
                          inputMode='numeric'
                          disabled={!online || busy || !execution.stageable}
                          onChange={event =>
                            setImportSequences(current => ({
                              ...current,
                              [JSON.stringify([accountId, statementId, key])]:
                                event.target.value,
                            }))
                          }
                        />
                      </td>
                      <td>
                        {execution.stageable ? (
                          <Button
                            label={`Stage manual cash ${execution.transactionId}`}
                            disabled={
                              !online ||
                              busy ||
                              !/^[1-9]\d*$/.test(text) ||
                              !Number.isSafeInteger(Number(text))
                            }
                            loading={manualOperationMutation.isPending}
                            onClick={() =>
                              void stageManualExecution(execution.transactionId)
                            }
                          />
                        ) : (
                          <span>
                            {execution.reason?.replaceAll('_', ' ')}
                            {execution.operationId
                              ? ` · ${execution.operationId}`
                              : ''}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section
        className='space-y-3'
        aria-label='Imported execution cash operations'
      >
        <h4>Stage cash for applied Kraken executions</h4>
        <Message
          severity='info'
          text='Execution values and transaction links are read from the applied import. Choose an explicit stable sequence for each date; no cash value or intraday order is inferred.'
        />
        {report.cashImportExecutions.length === 0 ? (
          <p>No applied Kraken executions are available for this account.</p>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <caption>
                Imported executions available for inactive cash replay
              </caption>
              <thead>
                <tr>
                  <th>Execution</th>
                  <th>Date</th>
                  <th>Time (Sydney)</th>
                  <th>Gross</th>
                  <th>Fee</th>
                  <th>Transaction links</th>
                  <th>Stable sequence</th>
                  <th>Action / status</th>
                </tr>
              </thead>
              <tbody>
                {report.cashImportExecutions.map(execution => (
                  <tr key={execution.eventId}>
                    <td>
                      {execution.kind} · {execution.externalId}
                    </td>
                    <td>{formatDateDDMMYYYY(execution.effectiveDate)}</td>
                    <td>
                      {new Intl.DateTimeFormat('en-AU', {
                        timeZone: 'Australia/Sydney',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false,
                      }).format(new Date(execution.occurredAt))}
                    </td>
                    <td>
                      {execution.grossValue === null
                        ? 'Unavailable'
                        : `${execution.quoteCurrency ?? '—'} ${mask(execution.grossValue)}`}
                    </td>
                    <td>
                      {mask(execution.fee)} {execution.feeCurrency ?? ''}
                    </td>
                    <td>{execution.transactionIds.join(', ') || 'Missing'}</td>
                    <td>
                      <InputText
                        aria-label={`Stable sequence for imported execution ${execution.externalId}`}
                        value={sequenceForImportedEvent(execution.eventId)}
                        inputMode='numeric'
                        disabled={!online || busy || !execution.stageable}
                        onChange={event => {
                          const key = JSON.stringify([
                            accountId,
                            statementId,
                            execution.eventId,
                          ]);
                          setImportSequences(current => ({
                            ...current,
                            [key]: event.target.value,
                          }));
                        }}
                      />
                    </td>
                    <td>
                      {execution.stageable ? (
                        <Button
                          label={`Stage imported cash ${execution.externalId}`}
                          disabled={
                            !online ||
                            busy ||
                            !/^[1-9]\d*$/.test(
                              sequenceForImportedEvent(execution.eventId)
                            ) ||
                            !Number.isSafeInteger(
                              Number(
                                sequenceForImportedEvent(execution.eventId)
                              )
                            )
                          }
                          loading={importedOperationMutation.isPending}
                          onClick={() =>
                            void stageImportedExecution(execution.eventId)
                          }
                        />
                      ) : (
                        <span>
                          {execution.reason === 'TRANSACTION_ALREADY_LINKED'
                            ? 'Transaction is already represented by a draft cash operation'
                            : execution.reason}
                          {execution.operationId
                            ? ` · ${execution.operationId}`
                            : ''}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}

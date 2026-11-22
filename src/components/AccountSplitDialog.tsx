'use client';

import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Checkbox } from 'primereact/checkbox';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import AppDialog from './AppDialog';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import {
  useAccountSplitHistory,
  useHoldings,
  usePostAccountSplit,
  useReverseAccountSplit,
} from '@/hooks/api';
import { formatDateDDMMYYYY, toLocalDateString } from '@/lib/date';
import type {
  AccountSplitInput,
  AccountSplitReversalInput,
  AccountSplitHistoryItem,
} from '@/lib/types';

function sydneyToday(): Date {
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Sydney',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  return new Date(`${date}T00:00:00`);
}

export default function AccountSplitDialog({
  accountId,
  accountName,
  onHide,
}: {
  accountId: string;
  accountName: string;
  onHide: () => void;
}) {
  const online = useNetworkStatus();
  const postings = usePostAccountSplit();
  const reversals = useReverseAccountSplit();
  const history = useAccountSplitHistory(accountId);
  const holdings = useHoldings(undefined, accountId);
  const [assetId, setAssetId] = useState('');
  const [effectiveDate, setEffectiveDate] = useState<Date | null>(() =>
    sydneyToday()
  );
  const [newUnits, setNewUnits] = useState('');
  const [oldUnits, setOldUnits] = useState('');
  const [sourceReference, setSourceReference] = useState('');
  const [statementConfirmed, setStatementConfirmed] = useState(false);
  const [retryKey, setRetryKey] = useState<{
    signature: string;
    key: string;
  } | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [reversalReason, setReversalReason] = useState('');
  const [reversalAcknowledged, setReversalAcknowledged] = useState(false);
  const [reversing, setReversing] = useState<AccountSplitHistoryItem | null>(
    null
  );

  const assetOptions = useMemo(() => {
    const distinct = new Map<string, { label: string; value: string }>();
    for (const holding of holdings.data ?? []) {
      if (
        holding.assetId &&
        (holding.assetType === 'EQUITY' || holding.assetType === 'ETF')
      ) {
        distinct.set(holding.assetId, {
          label: `${holding.symbol} — ${holding.name}`,
          value: holding.assetId,
        });
      }
    }
    return [...distinct.values()].sort((left, right) =>
      left.label.localeCompare(right.label)
    );
  }, [holdings.data]);

  const submit = async () => {
    setError('');
    setSuccess('');
    if (
      !assetId ||
      !effectiveDate ||
      !/^[1-9]\d{0,25}$/.test(newUnits) ||
      !/^[1-9]\d{0,25}$/.test(oldUnits) ||
      newUnits === oldUnits ||
      !sourceReference.trim() ||
      sourceReference.trim() !== sourceReference ||
      !statementConfirmed
    ) {
      setError(
        'Complete all fields with an exact changing ratio and statement confirmation.'
      );
      return;
    }

    const payload = {
      assetId,
      effectiveDate: toLocalDateString(effectiveDate),
      newUnits,
      oldUnits,
      sourceReference,
      statementConfirmed: true as const,
    };
    const signature = JSON.stringify(payload);
    const key =
      retryKey?.signature === signature
        ? retryKey.key
        : globalThis.crypto.randomUUID();
    setRetryKey({ signature, key });
    const input: AccountSplitInput = { ...payload, idempotencyKey: key };
    try {
      const result = await postings.mutateAsync({ accountId, input });
      setSuccess(
        result.created
          ? `Split posted; ${result.affectedParcels} parcel${result.affectedParcels === 1 ? '' : 's'} affected.`
          : 'The identical split was already retained.'
      );
      setNewUnits('');
      setOldUnits('');
      setSourceReference('');
      setStatementConfirmed(false);
      setRetryKey(null);
    } catch (failure: unknown) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'The stock split could not be recorded.'
      );
    }
  };

  const reverse = async (item: AccountSplitHistoryItem) => {
    setError('');
    setSuccess('');
    if (
      !reversalReason.trim() ||
      reversalReason.trim() !== reversalReason ||
      !reversalAcknowledged ||
      item.auditNumber === null ||
      !item.sourceFingerprint
    ) {
      setError(
        'Enter a retained reversal reason and confirm terminal reversal.'
      );
      return;
    }
    const input: AccountSplitReversalInput = {
      idempotencyKey: globalThis.crypto.randomUUID(),
      actionId: item.actionId,
      expectedAuditNumber: item.auditNumber,
      expectedSourceFingerprint: item.sourceFingerprint,
      reason: reversalReason,
      reversalConfirmed: true,
    };
    try {
      const result = await reversals.mutateAsync({
        accountId,
        actionId: item.actionId,
        input,
      });
      setSuccess(
        result.created
          ? 'The retained split was reversed.'
          : 'The identical reversal was already retained.'
      );
      setReversing(null);
      setReversalReason('');
      setReversalAcknowledged(false);
    } catch (failure: unknown) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'The stock split could not be reversed.'
      );
    }
  };

  const pending = postings.isPending || reversals.isPending;

  return (
    <AppDialog
      header={`Stock splits - ${accountName}`}
      visible
      modal
      blockScroll
      style={{ width: '50rem', maxWidth: '95vw' }}
      onHide={() => {
        if (!pending) onHide();
      }}
      footer={<Button label='Close' text onClick={onHide} disabled={pending} />}
    >
      {!online && (
        <Message
          severity='warn'
          text='Reconnect before recording or reversing stock splits.'
          className='w-full mb-3'
        />
      )}
      {error && (
        <Message severity='error' text={error} className='w-full mb-3' />
      )}
      {success && (
        <Message severity='success' text={success} className='w-full mb-3' />
      )}

      <div className='grid formgrid'>
        <div className='col-12 md:col-6'>
          <label htmlFor='split-asset'>Equity or ETF</label>
          <Dropdown
            id='split-asset'
            className='w-full'
            value={assetId}
            options={assetOptions}
            onChange={event => setAssetId(String(event.value ?? ''))}
            placeholder='Select holding'
            disabled={pending}
          />
        </div>
        <div className='col-12 md:col-6'>
          <label htmlFor='split-date'>Effective date</label>
          <Calendar
            id='split-date'
            className='w-full'
            value={effectiveDate}
            onChange={event => setEffectiveDate(event.value ?? null)}
            dateFormat='dd/mm/yy'
            maxDate={sydneyToday()}
            disabled={pending}
          />
        </div>
        <div className='col-6 md:col-3'>
          <label htmlFor='new-units'>New units</label>
          <InputText
            id='new-units'
            className='w-full'
            value={newUnits}
            onChange={event => setNewUnits(event.target.value)}
            disabled={pending}
          />
        </div>
        <div className='col-6 md:col-3'>
          <label htmlFor='old-units'>Old units</label>
          <InputText
            id='old-units'
            className='w-full'
            value={oldUnits}
            onChange={event => setOldUnits(event.target.value)}
            disabled={pending}
          />
        </div>
        <div className='col-12 md:col-6'>
          <label htmlFor='split-source'>Source reference</label>
          <InputText
            id='split-source'
            className='w-full'
            value={sourceReference}
            onChange={event => setSourceReference(event.target.value)}
            disabled={pending}
          />
        </div>
        <div className='col-12'>
          <Checkbox
            inputId='split-confirm'
            checked={statementConfirmed}
            onChange={event => setStatementConfirmed(Boolean(event.checked))}
            disabled={pending}
          />
          <label htmlFor='split-confirm' className='ml-2'>
            I confirmed this ratio and effective date against the statement.
          </label>
        </div>
      </div>

      <Button
        label='Record stock split'
        icon='pi pi-check'
        onClick={submit}
        disabled={!online || pending}
        className='mt-3'
      />

      <h3 className='mt-4'>Retained history</h3>
      {history.isLoading && <p>Loading split history...</p>}
      {history.isError && (
        <Message
          severity='error'
          text='Split history could not be loaded.'
          className='w-full'
        />
      )}
      {(history.data?.items ?? []).map(item => (
        <div
          key={item.actionId}
          className='surface-border border-1 border-round p-3 mb-2'
        >
          <div>
            {item.newUnits}:{item.oldUnits} -{' '}
            {formatDateDDMMYYYY(item.effectiveDate)} - {item.sourceReference}
          </div>
          <div className='text-sm mt-1'>
            {item.affectedParcelCount} affected parcel
            {item.affectedParcelCount === 1 ? '' : 's'}
            {item.reversal
              ? ` - reversed ${formatDateDDMMYYYY(item.reversal.recordedAt)}`
              : ''}
          </div>
          {!item.reversal && item.auditNumber !== null && (
            <Button
              label='Reverse'
              icon='pi pi-undo'
              outlined
              size='small'
              className='mt-2'
              disabled={!online || pending}
              onClick={() => {
                setReversing(item);
                setReversalReason('');
                setReversalAcknowledged(false);
              }}
            />
          )}
        </div>
      ))}

      {reversing && (
        <div className='surface-border border-1 border-round p-3 mt-3'>
          <label htmlFor='split-reversal-reason'>Reversal reason</label>
          <InputText
            id='split-reversal-reason'
            className='w-full'
            value={reversalReason}
            onChange={event => setReversalReason(event.target.value)}
            disabled={pending}
          />
          <div className='mt-2'>
            <Checkbox
              inputId='split-reversal-confirm'
              checked={reversalAcknowledged}
              onChange={event =>
                setReversalAcknowledged(Boolean(event.checked))
              }
              disabled={pending}
            />
            <label htmlFor='split-reversal-confirm' className='ml-2'>
              Confirm this reversal is terminal.
            </label>
          </div>
          <div className='mt-3 flex gap-2'>
            <Button
              label='Reverse permanently'
              severity='danger'
              onClick={() => reverse(reversing)}
              disabled={!online || pending}
            />
            <Button
              label='Cancel'
              text
              onClick={() => setReversing(null)}
              disabled={pending}
            />
          </div>
        </div>
      )}
    </AppDialog>
  );
}

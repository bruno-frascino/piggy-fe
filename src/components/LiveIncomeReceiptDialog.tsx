'use client';

import { useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import Decimal from 'decimal.js';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Checkbox } from 'primereact/checkbox';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import AppDialog from './AppDialog';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import {
  useIncomeEligibleAssets,
  useLiveCapitalOperations,
  useCorrectLiveIncomeReceipt,
  usePostAccountIncomeReceipt,
} from '@/hooks/api';
import { formatDateDDMMYYYY, toLocalDateString } from '@/lib/date';
import { mutationErrorMessage } from '@/lib/mutation-error';
import { usePrivacy } from '@/lib/privacy-context';
import type {
  AccountIncomeReceiptInput,
  LiveCashReviewOperation,
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

function normalizeAmount(value: string): string {
  const [whole, fraction = ''] = value.split('.');
  const normalizedFraction = fraction.replace(/0+$/, '');
  return normalizedFraction ? `${whole}.${normalizedFraction}` : whole;
}

function validAmount(value: string, allowZero = true): boolean {
  if (!/^(?:0|[1-9]\d{0,25})(?:\.\d{1,12})?$/.test(value)) return false;
  const parsed = new Decimal(value);
  return allowZero ? parsed.gte(0) : parsed.gt(0);
}

export default function LiveIncomeReceiptDialog({
  accountId,
  accountName,
  onHide,
}: {
  accountId: string;
  accountName: string;
  onHide: () => void;
}) {
  const online = useNetworkStatus();
  const { hidden, mask } = usePrivacy();
  const mutation = usePostAccountIncomeReceipt();
  const correctionMutation = useCorrectLiveIncomeReceipt();
  const holdings = useIncomeEligibleAssets(accountId);
  const history = useLiveCapitalOperations(accountId);
  const [assetId, setAssetId] = useState('');
  const [entitlementDate, setEntitlementDate] = useState<Date | null>(() =>
    sydneyToday()
  );
  const [paymentDate, setPaymentDate] = useState<Date | null>(() =>
    sydneyToday()
  );
  const [sequence, setSequence] = useState(1);
  const [currency, setCurrency] = useState('AUD');
  const [grossAmount, setGrossAmount] = useState('');
  const [withholdingAmount, setWithholdingAmount] = useState('0');
  const [frankedAmount, setFrankedAmount] = useState('0');
  const [unfrankedAmount, setUnfrankedAmount] = useState('');
  const [frankingCreditAud, setFrankingCreditAud] = useState('0');
  const [sourceReference, setSourceReference] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [retry, setRetry] = useState<{
    signature: string;
    key: string;
  } | null>(null);
  const [editing, setEditing] = useState<LiveCashReviewOperation | null>(null);
  const [correctionEntitlementDate, setCorrectionEntitlementDate] =
    useState<Date | null>(null);
  const [correctionPaymentDate, setCorrectionPaymentDate] =
    useState<Date | null>(null);
  const [correctionSequence, setCorrectionSequence] = useState(1);
  const [correctionAmounts, setCorrectionAmounts] = useState({
    grossAmount: '',
    withholdingAmount: '0',
    frankedAmount: '0',
    unfrankedAmount: '',
    frankingCreditAud: '0',
  });
  const [correctionReason, setCorrectionReason] = useState('');
  const [reversalAcknowledged, setReversalAcknowledged] = useState(false);
  const [correctionError, setCorrectionError] = useState('');
  const [correctionRetry, setCorrectionRetry] = useState<{
    signature: string;
    key: string;
  } | null>(null);
  const maximumDate = sydneyToday();
  const assetOptions = useMemo(() => {
    const distinct = new Map(
      (holdings.data ?? [])
        .filter(
          holding =>
            holding.assetId &&
            (holding.assetType === 'EQUITY' || holding.assetType === 'ETF')
        )
        .map(holding => [
          holding.assetId!,
          {
            label: `${holding.symbol} — ${holding.name} (${holding.exchangeCode ?? 'exchange'})`,
            value: holding.assetId!,
          },
        ])
    );
    return [...distinct.values()].sort((a, b) =>
      a.label.localeCompare(b.label)
    );
  }, [holdings.data]);
  const incomeHistory = (history.data?.auditOperations ?? []).filter(
    operation => operation.incomeReceipt
  );
  const amountFields: {
    label: string;
    value: string;
    setter: (value: string) => void;
  }[] = [
    { label: 'Gross amount', value: grossAmount, setter: setGrossAmount },
    {
      label: 'Withholding',
      value: withholdingAmount,
      setter: setWithholdingAmount,
    },
    { label: 'Franked amount', value: frankedAmount, setter: setFrankedAmount },
    {
      label: 'Unfranked amount',
      value: unfrankedAmount,
      setter: setUnfrankedAmount,
    },
    {
      label: 'Franking credit (AUD)',
      value: frankingCreditAud,
      setter: setFrankingCreditAud,
    },
  ];

  const submit = async () => {
    setError('');
    setSuccess('');
    if (
      !assetId ||
      !entitlementDate ||
      !paymentDate ||
      toLocalDateString(entitlementDate) > toLocalDateString(paymentDate) ||
      !Number.isSafeInteger(sequence) ||
      sequence < 1 ||
      !/^[A-Z]{3}$/.test(currency) ||
      !validAmount(grossAmount, false) ||
      !validAmount(withholdingAmount) ||
      !validAmount(frankedAmount) ||
      !validAmount(unfrankedAmount) ||
      !validAmount(frankingCreditAud) ||
      !sourceReference.trim() ||
      sourceReference.trim() !== sourceReference
    ) {
      setError(
        'Complete each field with valid dates, amounts and a source reference.'
      );
      return;
    }

    if (
      new Decimal(withholdingAmount).gt(grossAmount) ||
      !new Decimal(frankedAmount).plus(unfrankedAmount).eq(grossAmount)
    ) {
      setError(
        'Withholding cannot exceed gross, and franked plus unfranked must equal gross.'
      );
      return;
    }
    if (
      (new Decimal(frankedAmount).gt(0) ||
        new Decimal(frankingCreditAud).gt(0)) &&
      currency !== 'AUD'
    ) {
      setError('Franking amounts and credits must be recorded in AUD.');
      return;
    }

    const effectiveDate = toLocalDateString(paymentDate);
    const inputWithoutKey = {
      assetId,
      entitlementDate: toLocalDateString(entitlementDate),
      paymentDate: effectiveDate,
      sequence,
      currency,
      grossAmount: normalizeAmount(grossAmount),
      withholdingAmount: normalizeAmount(withholdingAmount),
      frankedAmount: normalizeAmount(frankedAmount),
      unfrankedAmount: normalizeAmount(unfrankedAmount),
      frankingCreditAud: normalizeAmount(frankingCreditAud),
      sourceReference,
    };
    const signature = JSON.stringify(inputWithoutKey);
    const key =
      retry?.signature === signature
        ? retry.key
        : globalThis.crypto.randomUUID();
    setRetry({ signature, key });
    const input: AccountIncomeReceiptInput = {
      ...inputWithoutKey,
      idempotencyKey: key,
    };
    try {
      const result = await mutation.mutateAsync({ accountId, input });
      setSuccess(
        `Income receipt recorded. Current balance ${currency} ${mask(
          result.replay.balances.find(balance => balance.currency === currency)
            ?.endingAmount ?? '0'
        )}.`
      );
      setGrossAmount('');
      setWithholdingAmount('0');
      setFrankedAmount('0');
      setUnfrankedAmount('');
      setFrankingCreditAud('0');
      setSourceReference('');
      setRetry(null);
      await history.refetch();
    } catch (failure) {
      setError(
        mutationErrorMessage(
          failure,
          'Could not record this income receipt. Refresh account history before retrying.'
        )
      );
    }
  };

  const beginCorrection = (operation: LiveCashReviewOperation) => {
    const current = operation.current;
    if (
      !current ||
      current.kind !== 'INCOME' ||
      !current.cash ||
      !current.income
    )
      return;
    setEditing(operation);
    setCorrectionEntitlementDate(
      new Date(`${current.income.entitlementDate}T00:00:00`)
    );
    setCorrectionPaymentDate(new Date(`${current.effectiveDate}T00:00:00`));
    setCorrectionSequence(current.sequence);
    setCorrectionAmounts({
      grossAmount: current.income.grossAmount,
      withholdingAmount: current.income.withholdingAmount,
      frankedAmount: current.income.frankedAmount,
      unfrankedAmount: current.income.unfrankedAmount,
      frankingCreditAud: current.income.frankingCreditAud,
    });
    setCorrectionReason('');
    setReversalAcknowledged(false);
    setCorrectionError('');
    setCorrectionRetry(null);
  };

  const submitCorrection = async (reversal: boolean) => {
    const current = editing?.current;
    if (
      !editing ||
      !current ||
      current.kind !== 'INCOME' ||
      !current.cash ||
      !current.income ||
      !history.data ||
      !online ||
      hidden ||
      correctionMutation.isPending
    )
      return;
    const reason = correctionReason.trim();
    if (
      !reason ||
      Array.from(reason).some(
        character =>
          character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127
      )
    ) {
      setCorrectionError(
        'Enter an audit reason before submitting the revision.'
      );
      return;
    }
    if (reversal && !reversalAcknowledged) {
      setCorrectionError(
        'Acknowledge that reversal is terminal before submitting.'
      );
      return;
    }

    let replacement: {
      entitlementDate: string;
      paymentDate: string;
      sequence: number;
      grossAmount: string;
      withholdingAmount: string;
      frankedAmount: string;
      unfrankedAmount: string;
      frankingCreditAud: string;
    } | null = null;
    if (!reversal) {
      if (
        !correctionEntitlementDate ||
        !correctionPaymentDate ||
        toLocalDateString(correctionEntitlementDate) >
          toLocalDateString(correctionPaymentDate) ||
        !Number.isSafeInteger(correctionSequence) ||
        correctionSequence < 1 ||
        !validAmount(correctionAmounts.grossAmount, false) ||
        !validAmount(correctionAmounts.withholdingAmount) ||
        !validAmount(correctionAmounts.frankedAmount) ||
        !validAmount(correctionAmounts.unfrankedAmount) ||
        !validAmount(correctionAmounts.frankingCreditAud)
      ) {
        setCorrectionError('Enter valid replacement dates and exact amounts.');
        return;
      }
      if (
        new Decimal(correctionAmounts.withholdingAmount).gt(
          correctionAmounts.grossAmount
        ) ||
        !new Decimal(correctionAmounts.frankedAmount)
          .plus(correctionAmounts.unfrankedAmount)
          .eq(correctionAmounts.grossAmount)
      ) {
        setCorrectionError(
          'Withholding cannot exceed gross, and franked plus unfranked must equal gross.'
        );
        return;
      }
      if (
        (new Decimal(correctionAmounts.frankedAmount).gt(0) ||
          new Decimal(correctionAmounts.frankingCreditAud).gt(0)) &&
        current.cash.currency !== 'AUD'
      ) {
        setCorrectionError(
          'Franking amounts and credits must be recorded in AUD.'
        );
        return;
      }
      replacement = {
        entitlementDate: toLocalDateString(correctionEntitlementDate),
        paymentDate: toLocalDateString(correctionPaymentDate),
        sequence: correctionSequence,
        grossAmount: normalizeAmount(correctionAmounts.grossAmount),
        withholdingAmount: normalizeAmount(correctionAmounts.withholdingAmount),
        frankedAmount: normalizeAmount(correctionAmounts.frankedAmount),
        unfrankedAmount: normalizeAmount(correctionAmounts.unfrankedAmount),
        frankingCreditAud: normalizeAmount(correctionAmounts.frankingCreditAud),
      };
    }

    const payload = {
      expectedRevisionId: editing.expectedRevisionId,
      expectedAuditNumber: history.data.auditNumber,
      expectedSourceFingerprint: history.data.sourceFingerprint,
      reason,
      replacement,
    };
    const signature = JSON.stringify(payload);
    const key =
      correctionRetry?.signature === signature
        ? correctionRetry.key
        : globalThis.crypto.randomUUID();
    setCorrectionRetry({ signature, key });
    setCorrectionError('');
    try {
      const result = await correctionMutation.mutateAsync({
        accountId,
        operationId: editing.operationId,
        input: { ...payload, idempotencyKey: key },
      });
      setEditing(null);
      setCorrectionRetry(null);
      setReversalAcknowledged(false);
      const currency = current.cash.currency;
      setSuccess(
        `${reversal ? 'Income receipt reversed' : 'Income receipt corrected'}. Current balance ${currency} ${mask(
          result.replay.balances.find(balance => balance.currency === currency)
            ?.endingAmount ?? '0'
        )}.`
      );
      await history.refetch();
    } catch (failure) {
      if (isAxiosError(failure) && failure.response?.status === 409) {
        setCorrectionError(
          'Cash history changed or this correction is stale. Refresh and review the current receipt before retrying.'
        );
        setEditing(null);
        await history.refetch();
      } else {
        setCorrectionError(
          mutationErrorMessage(
            failure,
            'Could not revise this income receipt. Please retry.'
          )
        );
      }
    }
  };

  return (
    <AppDialog
      header={`Record income — ${accountName}`}
      visible
      modal
      blockScroll
      task
      closable={!mutation.isPending}
      closeOnEscape={!mutation.isPending}
      onHide={() => {
        if (!mutation.isPending) onHide();
      }}
      style={{ width: '760px', maxWidth: '100vw' }}
    >
      <div className='space-y-4'>
        <p className='text-sm text-gray-600'>
          Enter figures from the actual dividend/distribution statement. This
          records net cash and retained tax attributes; it does not estimate
          entitlement, verify the broker, or support complex AMIT components.
        </p>
        {!online && (
          <Message
            severity='warn'
            text='Reconnect to record income. Offline changes are not queued.'
          />
        )}
        {hidden && (
          <Message
            severity='info'
            text='Disable privacy mode to correct or reverse recorded income.'
          />
        )}
        {holdings.error && (
          <Message
            severity='error'
            text={mutationErrorMessage(
              holdings.error,
              'Could not load eligible account holdings.'
            )}
          />
        )}
        {history.error && (
          <Message
            severity='error'
            text={mutationErrorMessage(
              history.error,
              'Could not load retained income history.'
            )}
          />
        )}
        {error && <Message severity='error' text={error} />}
        {success && <Message severity='success' text={success} />}
        {correctionError && <Message severity='error' text={correctionError} />}
        {assetOptions.length === 0 && !holdings.isLoading && (
          <Message
            severity='warn'
            text='No eligible equity or ETF holdings are available for this account.'
          />
        )}
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
          <label className='flex flex-col gap-1 text-sm'>
            Asset
            <Dropdown
              value={assetId}
              options={assetOptions}
              onChange={event => {
                setAssetId(typeof event.value === 'string' ? event.value : '');
                setSuccess('');
              }}
              placeholder='Select an equity or ETF'
              disabled={holdings.isLoading || mutation.isPending}
            />
          </label>
          <label className='flex flex-col gap-1 text-sm'>
            Currency
            <InputText
              value={currency}
              onChange={event => setCurrency(event.target.value.toUpperCase())}
              maxLength={3}
              autoComplete='off'
              disabled={mutation.isPending}
            />
          </label>
          <label className='flex flex-col gap-1 text-sm'>
            Entitlement date
            <Calendar
              value={entitlementDate}
              onChange={event =>
                setEntitlementDate(
                  event.value instanceof Date ? event.value : null
                )
              }
              dateFormat='dd/mm/yy'
              maxDate={maximumDate}
              showIcon
              disabled={mutation.isPending}
            />
          </label>
          <label className='flex flex-col gap-1 text-sm'>
            Payment date
            <Calendar
              value={paymentDate}
              onChange={event =>
                setPaymentDate(event.value instanceof Date ? event.value : null)
              }
              dateFormat='dd/mm/yy'
              maxDate={maximumDate}
              showIcon
              disabled={mutation.isPending}
            />
          </label>
          <label className='flex flex-col gap-1 text-sm'>
            Sequence within payment date
            <InputNumber
              value={sequence}
              onValueChange={event => {
                if (typeof event.value === 'number') setSequence(event.value);
              }}
              min={1}
              max={Number.MAX_SAFE_INTEGER}
              useGrouping={false}
              disabled={mutation.isPending}
            />
          </label>
          {amountFields.map(({ label, value, setter }) => (
            <label key={label} className='flex flex-col gap-1 text-sm'>
              {label}
              <InputText
                value={value}
                onChange={event => setter(event.target.value)}
                inputMode='decimal'
                autoComplete='off'
                disabled={mutation.isPending}
              />
            </label>
          ))}
          <label className='flex flex-col gap-1 text-sm sm:col-span-2'>
            Statement/source reference
            <InputText
              value={sourceReference}
              onChange={event => setSourceReference(event.target.value)}
              maxLength={200}
              autoComplete='off'
              disabled={mutation.isPending}
            />
          </label>
        </div>
        <div className='flex justify-end gap-2'>
          <Button
            type='button'
            label='Close'
            severity='secondary'
            outlined
            onClick={onHide}
            disabled={mutation.isPending}
          />
          <Button
            type='button'
            label='Record income'
            icon='pi pi-check'
            loading={mutation.isPending}
            disabled={
              !online || mutation.isPending || assetOptions.length === 0
            }
            onClick={() => void submit()}
          />
        </div>
        <section className='space-y-2 border-t border-gray-200 pt-4'>
          <h3 className='font-semibold'>Recorded income</h3>
          {incomeHistory.length === 0 && (
            <p className='text-sm text-gray-600'>
              No income receipts recorded.
            </p>
          )}
          {incomeHistory.map(operation => {
            const receipt =
              operation.currentIncomeReceipt ?? operation.incomeReceipt;
            if (!receipt) return null;
            return (
              <article
                key={operation.operationId}
                className='rounded border border-gray-200 p-3 text-sm'
              >
                <p className='font-medium'>
                  {receipt.assetSymbol} · payment{' '}
                  {formatDateDDMMYYYY(receipt.paymentDate)}
                  {!operation.currentIncomeReceipt && ' · reversed (terminal)'}
                </p>
                <p>
                  Entitlement {formatDateDDMMYYYY(receipt.entitlementDate)} ·
                  gross {receipt.currency} {mask(receipt.grossAmount)} ·
                  withholding {mask(receipt.withholdingAmount)} · net{' '}
                  {mask(receipt.netAmount)}
                </p>
                <p>
                  Franked {mask(receipt.frankedAmount)} · unfranked{' '}
                  {mask(receipt.unfrankedAmount)} · franking credit AUD{' '}
                  {mask(receipt.frankingCreditAud)}
                </p>
                <p>
                  Source: {operation.original.source.reference} · audit{' '}
                  {operation.auditNumber}
                </p>
                {operation.reinvestment && (
                  <p>
                    Linked dividend reinvestment: independent income corrections
                    and reversal are blocked.
                  </p>
                )}
                {operation.current && !operation.reinvestment && (
                  <Button
                    type='button'
                    label='Correct or reverse'
                    size='small'
                    outlined
                    disabled={
                      !online ||
                      hidden ||
                      correctionMutation.isPending ||
                      mutation.isPending
                    }
                    onClick={() => beginCorrection(operation)}
                  />
                )}
                {operation.revisions.map(revision => (
                  <div
                    key={revision.revisionId}
                    className='border-l-2 border-gray-300 pl-3'
                  >
                    <p>
                      Revision {revision.auditNumber} · {revision.reason}
                    </p>
                    {revision.incomeReplacement === null && (
                      <p>Terminal reversal</p>
                    )}
                  </div>
                ))}
                {editing?.operationId === operation.operationId && (
                  <section className='space-y-3 border-t border-gray-200 pt-3'>
                    <p className='text-sm text-gray-600'>
                      Asset, currency and source reference are fixed for a
                      replacement. Reverse and record a new receipt to correct
                      those identity fields.
                    </p>
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                      <label className='flex flex-col gap-1 text-sm'>
                        Entitlement date
                        <Calendar
                          value={correctionEntitlementDate}
                          onChange={event =>
                            setCorrectionEntitlementDate(
                              event.value instanceof Date ? event.value : null
                            )
                          }
                          dateFormat='dd/mm/yy'
                          maxDate={maximumDate}
                          showIcon
                          disabled={correctionMutation.isPending}
                        />
                      </label>
                      <label className='flex flex-col gap-1 text-sm'>
                        Payment date
                        <Calendar
                          value={correctionPaymentDate}
                          onChange={event =>
                            setCorrectionPaymentDate(
                              event.value instanceof Date ? event.value : null
                            )
                          }
                          dateFormat='dd/mm/yy'
                          maxDate={maximumDate}
                          showIcon
                          disabled={correctionMutation.isPending}
                        />
                      </label>
                      <label className='flex flex-col gap-1 text-sm'>
                        Sequence within payment date
                        <InputNumber
                          value={correctionSequence}
                          onValueChange={event => {
                            if (typeof event.value === 'number')
                              setCorrectionSequence(event.value);
                          }}
                          min={1}
                          max={Number.MAX_SAFE_INTEGER}
                          useGrouping={false}
                          disabled={correctionMutation.isPending}
                        />
                      </label>
                      {(
                        [
                          ['Gross amount', 'grossAmount'],
                          ['Withholding', 'withholdingAmount'],
                          ['Franked amount', 'frankedAmount'],
                          ['Unfranked amount', 'unfrankedAmount'],
                          ['Franking credit (AUD)', 'frankingCreditAud'],
                        ] as const
                      ).map(([label, key]) => (
                        <label
                          key={key}
                          className='flex flex-col gap-1 text-sm'
                        >
                          {label}
                          <InputText
                            value={correctionAmounts[key]}
                            onChange={event =>
                              setCorrectionAmounts(current => ({
                                ...current,
                                [key]: event.target.value,
                              }))
                            }
                            inputMode='decimal'
                            autoComplete='off'
                            disabled={correctionMutation.isPending}
                          />
                        </label>
                      ))}
                      <label className='flex flex-col gap-1 text-sm sm:col-span-2'>
                        Audit reason
                        <InputText
                          value={correctionReason}
                          onChange={event =>
                            setCorrectionReason(event.target.value)
                          }
                          maxLength={1000}
                          autoComplete='off'
                          disabled={correctionMutation.isPending}
                        />
                      </label>
                    </div>
                    <div className='flex items-center gap-2'>
                      <Checkbox
                        inputId={`income-reversal-${operation.operationId}`}
                        checked={reversalAcknowledged}
                        onChange={event =>
                          setReversalAcknowledged(event.checked === true)
                        }
                        disabled={correctionMutation.isPending}
                      />
                      <label
                        htmlFor={`income-reversal-${operation.operationId}`}
                        className='text-sm'
                      >
                        I understand reversal is terminal.
                      </label>
                    </div>
                    <div className='flex flex-wrap justify-end gap-2'>
                      <Button
                        type='button'
                        label='Cancel'
                        severity='secondary'
                        outlined
                        disabled={correctionMutation.isPending}
                        onClick={() => setEditing(null)}
                      />
                      <Button
                        type='button'
                        label='Replace receipt'
                        loading={correctionMutation.isPending}
                        disabled={
                          !online || hidden || correctionMutation.isPending
                        }
                        onClick={() => void submitCorrection(false)}
                      />
                      <Button
                        type='button'
                        label='Reverse receipt'
                        severity='danger'
                        outlined
                        disabled={
                          !online ||
                          hidden ||
                          correctionMutation.isPending ||
                          !reversalAcknowledged
                        }
                        onClick={() => void submitCorrection(true)}
                      />
                    </div>
                  </section>
                )}
              </article>
            );
          })}
        </section>
      </div>
    </AppDialog>
  );
}

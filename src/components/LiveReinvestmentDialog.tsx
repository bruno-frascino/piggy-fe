'use client';

import { useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import Decimal from 'decimal.js';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Checkbox } from 'primereact/checkbox';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import AppDialog from './AppDialog';
import {
  useAccountTradeCapability,
  useIncomeEligibleAssets,
  usePostAccountReinvestment,
} from '@/hooks/api';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { usePrivacy } from '@/lib/privacy-context';
import { useToast } from '@/lib/toast-context';
import { sydneyToday, toLocalDateString } from '@/lib/date';
import { mutationErrorMessage } from '@/lib/mutation-error';
import type { AccountReinvestmentInput } from '@/lib/types';

export default function LiveReinvestmentDialog({
  accountId,
  accountName,
  onHide,
  revision,
}: {
  accountId: string;
  accountName: string;
  onHide: () => void;
  revision?: {
    current: Omit<AccountReinvestmentInput, 'idempotencyKey'>;
    pending: boolean;
    blocked: boolean;
    onSubmit: (
      replacement: Omit<AccountReinvestmentInput, 'idempotencyKey'> | null,
      key: string,
      reason: string
    ) => Promise<unknown>;
    refresh: () => void;
  };
}) {
  const online = useNetworkStatus();
  const { hidden } = usePrivacy();
  const toast = useToast();
  const posting = usePostAccountReinvestment();
  const [reason, setReason] = useState('');
  const [conflict, setConflict] = useState(false);
  const mutation = {
    isPending: posting.isPending || revision?.pending === true,
  };
  const initial = revision?.current;
  const holdings = useIncomeEligibleAssets(accountId);
  const [assetId, setAssetId] = useState(initial?.income.assetId ?? '');
  const [entitlement, setEntitlement] = useState<Date | null>(() =>
    initial
      ? new Date(`${initial.income.entitlementDate}T00:00:00`)
      : sydneyToday()
  );
  const [payment, setPayment] = useState<Date | null>(() =>
    initial ? new Date(`${initial.income.paymentDate}T00:00:00`) : sydneyToday()
  );
  const [acquired, setAcquired] = useState<Date | null>(() =>
    initial
      ? new Date(`${initial.acquisition.effectiveDate}T00:00:00`)
      : sydneyToday()
  );
  const [form, setForm] = useState({
    currency: initial?.income.currency ?? 'AUD',
    grossAmount: initial?.income.grossAmount ?? '',
    withholdingAmount: initial?.income.withholdingAmount ?? '0',
    frankedAmount: initial?.income.frankedAmount ?? '0',
    unfrankedAmount: initial?.income.unfrankedAmount ?? '',
    frankingCreditAud: initial?.income.frankingCreditAud ?? '0',
    incomeSequence: String(initial?.income.sequence ?? 1),
    acquisitionSequence: String(initial?.acquisition.sequence ?? 2),
    quantity: initial?.acquisition.quantity ?? '',
    price: initial?.acquisition.price ?? '',
    fees: initial?.acquisition.fees ?? '0',
    residualAmount: initial?.residualAmount ?? '',
    sourceReference: initial?.income.sourceReference ?? '',
  });
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState('');
  const retry = useRef<{ signature: string; key: string } | null>(null);
  const paymentDate = payment ? toLocalDateString(payment) : '';
  const effectiveDate = acquired ? toLocalDateString(acquired) : '';
  const incomeCapability = useAccountTradeCapability(
    accountId,
    paymentDate,
    online
  );
  const acquisitionCapability = useAccountTradeCapability(
    accountId,
    effectiveDate,
    online
  );
  const ready =
    online &&
    !hidden &&
    !mutation.isPending &&
    !conflict &&
    !revision?.blocked &&
    !holdings.isFetching &&
    !holdings.isError &&
    [incomeCapability, acquisitionCapability].every(
      capability =>
        !capability.isFetching &&
        !capability.isError &&
        capability.data?.mode === 'LIVE_LEDGER'
    );
  const fields: { key: keyof typeof form; label: string }[] = [
    { key: 'currency', label: 'Statement currency' },
    { key: 'grossAmount', label: 'Gross distribution' },
    { key: 'withholdingAmount', label: 'Withholding' },
    { key: 'frankedAmount', label: 'Franked amount' },
    { key: 'unfrankedAmount', label: 'Unfranked amount' },
    { key: 'frankingCreditAud', label: 'Franking credit (AUD)' },
    { key: 'incomeSequence', label: 'Income sequence' },
    { key: 'acquisitionSequence', label: 'Acquisition sequence' },
    { key: 'quantity', label: 'New parcel units' },
    { key: 'price', label: 'Acquisition unit price' },
    { key: 'fees', label: 'Acquisition fees' },
    { key: 'residualAmount', label: 'Residual paid to account cash' },
    { key: 'sourceReference', label: 'Statement reference' },
  ];
  const persist = async (
    payload: Omit<AccountReinvestmentInput, 'idempotencyKey'> | null
  ) => {
    if (!ready || !acknowledged) return;
    if (revision && (!reason.trim() || reason !== reason.trim())) {
      setError('Enter an audit reason without surrounding whitespace.');
      return;
    }
    const signature = JSON.stringify({ payload, reason });
    if (retry.current?.signature !== signature)
      retry.current = { signature, key: globalThis.crypto.randomUUID() };
    setError('');
    try {
      if (revision) await revision.onSubmit(payload, retry.current.key, reason);
      else if (payload)
        await posting.mutateAsync({
          accountId,
          input: { ...payload, idempotencyKey: retry.current.key },
        });
      else throw new Error('A new reinvestment requires statement details.');
      toast.show({
        severity: 'success',
        summary: revision
          ? 'Paired reinvestment revised'
          : 'Dividend reinvestment recorded',
        detail: 'Income and parcel effects were committed atomically.',
      });
      onHide();
    } catch (failure) {
      if (revision && isAxiosError(failure) && failure.response?.status === 409)
        setConflict(true);
      setError(
        mutationErrorMessage(
          failure,
          'Could not save reinvestment. Review the statement and dated cash history before retrying.'
        )
      );
    }
  };
  const submit = async () => {
    if (!ready) return;
    const decimal = /^(?:0|[1-9]\d{0,25})(?:\.\d{1,12})?$/;
    const incomeSequence = Number(form.incomeSequence);
    const acquisitionSequence = Number(form.acquisitionSequence);
    const amounts = [
      'grossAmount',
      'withholdingAmount',
      'frankedAmount',
      'unfrankedAmount',
      'frankingCreditAud',
      'quantity',
      'price',
      'fees',
      'residualAmount',
    ] as const;
    if (
      !assetId ||
      !entitlement ||
      !paymentDate ||
      !effectiveDate ||
      !acknowledged ||
      toLocalDateString(entitlement) > paymentDate ||
      effectiveDate < paymentDate ||
      paymentDate > toLocalDateString(sydneyToday()) ||
      effectiveDate > toLocalDateString(sydneyToday()) ||
      ![incomeSequence, acquisitionSequence].every(
        sequence => Number.isSafeInteger(sequence) && sequence > 0
      ) ||
      (effectiveDate === paymentDate &&
        acquisitionSequence <= incomeSequence) ||
      !/^[A-Z]{3}$/.test(form.currency) ||
      !form.sourceReference.trim() ||
      form.sourceReference !== form.sourceReference.trim() ||
      amounts.some(key => !decimal.test(form[key]))
    ) {
      setError(
        'Complete the statement fields with valid dates, exact non-negative amounts and acquisition ordering, then confirm the statement.'
      );
      return;
    }
    const gross = new Decimal(form.grossAmount);
    const consideration = new Decimal(form.quantity).mul(form.price);
    if (
      !gross.gt(0) ||
      !consideration.gt(0) ||
      consideration.decimalPlaces() > 2 ||
      new Decimal(form.withholdingAmount).gt(gross) ||
      !new Decimal(form.frankedAmount).plus(form.unfrankedAmount).eq(gross) ||
      !gross
        .minus(form.withholdingAmount)
        .minus(consideration)
        .minus(form.fees)
        .eq(form.residualAmount) ||
      ((new Decimal(form.frankedAmount).gt(0) ||
        new Decimal(form.frankingCreditAud).gt(0)) &&
        form.currency !== 'AUD')
    ) {
      setError(
        'Tax components must equal gross; net income must exactly fund the new parcel, fees and account-cash residual. Consideration cannot require cent rounding. Franking requires AUD.'
      );
      return;
    }
    const payload: Omit<AccountReinvestmentInput, 'idempotencyKey'> = {
      income: {
        assetId,
        entitlementDate: toLocalDateString(entitlement),
        paymentDate,
        sequence: incomeSequence,
        currency: form.currency,
        grossAmount: gross.toFixed(),
        withholdingAmount: new Decimal(form.withholdingAmount).toFixed(),
        frankedAmount: new Decimal(form.frankedAmount).toFixed(),
        unfrankedAmount: new Decimal(form.unfrankedAmount).toFixed(),
        frankingCreditAud: new Decimal(form.frankingCreditAud).toFixed(),
        sourceReference: form.sourceReference,
      },
      acquisition: {
        effectiveDate,
        sequence: acquisitionSequence,
        quantity: new Decimal(form.quantity).toFixed(),
        price: new Decimal(form.price).toFixed(),
        fees: new Decimal(form.fees).toFixed(),
      },
      residualAmount: new Decimal(form.residualAmount).toFixed(),
      residualDisposition: 'ACCOUNT_CASH',
      statementConfirmed: true,
    };
    await persist(payload);
  };
  return (
    <AppDialog
      header={`${revision ? 'Revise paired reinvestment' : 'Record dividend reinvestment'} - ${accountName}`}
      visible
      modal
      blockScroll
      task
      closable={!mutation.isPending}
      closeOnEscape={!mutation.isPending}
      onHide={() => {
        if (!mutation.isPending) onHide();
      }}
      style={{ width: '720px', maxWidth: '100vw' }}
      footer={
        <div className='flex flex-wrap gap-2'>
          <Button
            label={
              revision ? 'Save paired correction' : 'Record linked reinvestment'
            }
            disabled={!ready || !acknowledged}
            loading={mutation.isPending}
            onClick={() => void submit()}
          />
          {revision && (
            <Button
              severity='danger'
              label='Reverse both effects permanently'
              disabled={!ready || !acknowledged}
              loading={mutation.isPending}
              onClick={() => void persist(null)}
            />
          )}
        </div>
      }
    >
      <div className='space-y-3'>
        <p>
          {revision ? (
            'Correct both retained effects together. Account, asset, currency and statement reference are fixed. Any effective SELL blocks corrections and reversal; void those sales first. Reversal is terminal and removes the effective income and parcel without creating a disposal.'
          ) : (
            <>
              Record a new equity/ETF statement, not an already recorded receipt
              or BUY. This records income once and creates a separate parcel,
              never adds units to an existing parcel. Use statement entitlement,
              tax figures and acquisition date; amounts are not estimated from
              current holdings.
            </>
          )}
        </p>
        <Message
          severity='warn'
          text='Only residual cash actually paid into this account is supported. Do not enter issuer-held carry-forward, prior plan credits, external top-ups, cross-currency purchases or complex AMIT components. Use the paired audited review for corrections and reversal; independent edits remain blocked.'
        />
        {!online && (
          <Message
            severity='warn'
            text='Offline: reinvestment writes are never queued.'
          />
        )}
        {hidden && (
          <Message
            severity='info'
            text='Disable privacy mode to enter reinvestment amounts.'
          />
        )}
        {revision?.blocked && (
          <Message
            severity='warn'
            text='Paired review is unavailable, refreshing, or has effective sales. Refresh the review; void all effective sales before revising.'
          />
        )}
        {[incomeCapability, acquisitionCapability, holdings].some(
          query => query.isError
        ) && (
          <Message
            severity='error'
            text='Could not validate current account eligibility. Refresh before posting.'
          />
        )}
        {![incomeCapability, acquisitionCapability].every(
          query => query.data?.mode === 'LIVE_LEDGER'
        ) && (
          <Message
            severity='info'
            text='A fresh confirmed real ledger is required for both payment and acquisition dates. This form never activates an account.'
          />
        )}
        {online && (
          <Button
            label='Refresh eligibility'
            outlined
            disabled={
              mutation.isPending ||
              holdings.isFetching ||
              incomeCapability.isFetching ||
              acquisitionCapability.isFetching
            }
            onClick={() => {
              if (revision) {
                revision.refresh();
                return;
              }
              void holdings.refetch();
              void incomeCapability.refetch();
              void acquisitionCapability.refetch();
            }}
          />
        )}
        {!hidden && (
          <fieldset disabled={!ready} className='space-y-3'>
            <label className='block' htmlFor='drp-asset'>
              Distribution asset
            </label>
            <Dropdown
              inputId='drp-asset'
              value={assetId}
              className='w-full'
              disabled={!ready || Boolean(revision)}
              options={(holdings.data ?? [])
                .filter(
                  asset =>
                    asset.assetId &&
                    (asset.assetType === 'EQUITY' || asset.assetType === 'ETF')
                )
                .map(asset => ({
                  value: asset.assetId,
                  label: `${asset.symbol} - ${asset.name}`,
                }))}
              onChange={event => {
                if (typeof event.value === 'string') setAssetId(event.value);
              }}
            />
            {[
              {
                id: 'entitlement',
                label: 'Entitlement date',
                value: entitlement,
                set: setEntitlement,
              },
              {
                id: 'payment',
                label: 'Payment date',
                value: payment,
                set: setPayment,
              },
              {
                id: 'acquired',
                label: 'Acquisition date',
                value: acquired,
                set: setAcquired,
              },
            ].map(({ id, label, value, set }) => (
              <div key={label}>
                <label className='block' htmlFor={`drp-${id}`}>
                  {label}
                </label>
                <Calendar
                  inputId={`drp-${id}`}
                  value={value}
                  dateFormat='dd/mm/yy'
                  maxDate={sydneyToday()}
                  showIcon
                  disabled={!ready}
                  onChange={event =>
                    set(event.value instanceof Date ? event.value : null)
                  }
                />
              </div>
            ))}
            <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
              {fields.map(({ key, label }) => (
                <div key={key}>
                  <label className='block' htmlFor={`drp-${key}`}>
                    {label}
                  </label>
                  <InputText
                    id={`drp-${key}`}
                    value={form[key]}
                    disabled={
                      Boolean(revision) &&
                      (key === 'currency' || key === 'sourceReference')
                    }
                    className='w-full'
                    onChange={event =>
                      setForm(current => ({
                        ...current,
                        [key]: event.target.value,
                      }))
                    }
                  />
                </div>
              ))}
            </div>
            {revision && (
              <div>
                <label htmlFor='drp-reason' className='block'>
                  Audit reason
                </label>
                <InputText
                  id='drp-reason'
                  value={reason}
                  maxLength={1000}
                  onChange={event => setReason(event.target.value)}
                />
              </div>
            )}
            <div className='flex gap-2'>
              <Checkbox
                inputId='drp-confirmed'
                checked={acknowledged}
                disabled={!ready}
                onChange={event => setAcknowledged(event.checked === true)}
              />
              <label htmlFor='drp-confirmed'>
                I verified eligible historical holdings, statement tax figures,
                the new parcel and that any residual was paid into account cash,
                not retained by the issuer.
                {revision &&
                  ' I understand that reversal permanently removes both effective effects and requires no effective sales.'}
              </label>
            </div>
          </fieldset>
        )}
        {error && <Message severity='error' text={error} />}
      </div>
    </AppDialog>
  );
}

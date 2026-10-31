'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Message } from 'primereact/message';
import ImportSellAllocation from '@/components/ImportSellAllocation';
import PageHeader from '@/components/PageHeader';
import {
  useCommitImport,
  useDiscardImport,
  useImport,
  useResolveImportEvent,
} from '@/hooks/api';
import { useToast } from '@/lib/toast-context';
import { formatDateDDMMYYYY } from '@/lib/date';
import type { ImportDetail, ImportPlanIssue } from '@/lib/types';

function apiMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: unknown } } })
      .response;
    if (typeof response?.data?.message === 'string')
      return response.data.message;
  }
  return error instanceof Error ? error.message : 'Something went wrong';
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className='mb-4' title={title}>
      {children}
    </Card>
  );
}

function ReconciliationBanner({ detail }: { detail: ImportDetail }) {
  const reconciliation = detail.plan.reconciliation;
  if (!reconciliation) return null;
  if (reconciliation.reconciled) {
    return (
      <Message
        severity='success'
        className='mb-4 w-full justify-start'
        text='Reconciled ✓ — the imported holdings match Kraken’s ledger balances.'
      />
    );
  }
  return (
    <div className='mb-4'>
      <Message
        severity='warn'
        className='w-full justify-start'
        text='Holdings do not match the ledger. This usually means the export does not cover your full history.'
      />
      <div className='table-region'>
        <table className='data-grid text-sm mt-2'>
          <thead>
            <tr className='text-left'>
              <th className='pr-4'>Asset</th>
              <th className='pr-4'>Kraken ledger</th>
              <th className='pr-4'>Imported</th>
              <th>Difference</th>
            </tr>
          </thead>
          <tbody>
            {reconciliation.rows.map(row => (
              <tr key={row.asset}>
                <td className='pr-4'>{row.asset}</td>
                <td className='pr-4'>{row.expected}</td>
                <td className='pr-4'>{row.simulated}</td>
                <td>{row.difference}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FmvInput({
  issue,
  busy,
  onSave,
}: {
  issue: ImportPlanIssue;
  busy: boolean;
  onSave: (eventId: string, value: string) => void;
}) {
  const [value, setValue] = useState('');
  return (
    <div className='responsive-actions mt-1'>
      <span role='alert' className='text-sm text-red-600'>
        {issue.message}
      </span>
      <input
        className='border rounded px-2 py-1 w-28'
        inputMode='decimal'
        aria-label='AUD value'
        value={value}
        onChange={e => setValue(e.target.value)}
      />
      <Button
        label='Save value'
        size='small'
        disabled={busy || value.trim() === '' || Number.isNaN(Number(value))}
        onClick={() => onSave(issue.eventId, value.trim())}
      />
    </div>
  );
}

export default function ImportReview({ importId }: { importId: string }) {
  const router = useRouter();
  const { show: showToast } = useToast();
  const query = useImport(importId);
  const resolve = useResolveImportEvent(importId);
  const commit = useCommitImport(importId);
  const discard = useDiscardImport(importId);
  const [error, setError] = useState('');

  if (query.isLoading) return <div className='p-6'>Loading import…</div>;
  if (query.isError || !query.data) {
    return (
      <div className='p-6'>
        <Message severity='error' text={apiMessage(query.error)} />
      </div>
    );
  }

  const { batch, plan, eventCounts } = query.data;
  const done = batch.status === 'COMMITTED' || batch.status === 'DISCARDED';
  const busy = resolve.isPending || commit.isPending || discard.isPending;
  const blocking = plan.summary.blockingIssues;
  const applied = eventCounts.APPLIED ?? 0;
  const nothingToApply =
    plan.newPositions.length === 0 && plan.sells.every(s => !s.resolved);

  const doResolve = (
    eventId: string,
    resolution: Parameters<typeof resolve.mutate>[0]['resolution']
  ) => {
    setError('');
    resolve.mutate(
      { eventId, resolution },
      { onError: e => setError(apiMessage(e)) }
    );
  };

  const doCommit = () => {
    setError('');
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError('You are offline. Reconnect to commit this import.');
      return;
    }
    commit.mutate(undefined, {
      onSuccess: result => {
        showToast({
          severity: 'success',
          summary: 'Import committed',
          detail: `${result.createdPositionIds.length} positions created.`,
          life: 4000,
        });
      },
      onError: e => setError(apiMessage(e)),
    });
  };

  const doDiscard = () => {
    setError('');
    discard.mutate(undefined, {
      onSuccess: () => router.push('/imports'),
      onError: e => setError(apiMessage(e)),
    });
  };

  const issuesFor = (eventId: string) =>
    plan.issues.filter(i => i.eventId === eventId);
  const fmvIssues = plan.issues.filter(i => i.type === 'MISSING_FMV');
  const otherIssues = plan.issues.filter(
    i =>
      i.type !== 'MISSING_FMV' && !plan.sells.some(s => s.eventId === i.eventId)
  );

  return (
    <div
      className={`app-page import-review${!done ? ' import-review--editable' : ''}${blocking > 0 ? ' import-review--blocked' : ''}`}
    >
      <PageHeader
        title='Review import'
        subtitle={`Kraken · ${batch.fileNames.join(', ')}`}
        action={
          <Link href='/imports' className='text-sm underline'>
            All imports
          </Link>
        }
      />

      {!done && (
        <Message
          severity='info'
          className='mb-4 w-full justify-start'
          text={
            batch.status === 'PARTIALLY_APPLIED'
              ? 'Some events are already committed. Review the remaining items, resolve any issues, then click Commit at the bottom to add them to your portfolio and History.'
              : 'Your files are uploaded, but nothing has been added to your portfolio yet. Review the items below, resolve any issues, then click Commit at the bottom.'
          }
        />
      )}
      {batch.status === 'COMMITTED' && (
        <div className='mb-4'>
          <Message
            severity='success'
            className='mb-2 w-full justify-start'
            text={`Committed — ${applied} events applied. The links below open this import's trading account. Switch between Kraken (AUD) and Kraken (USD) on the dashboard if your purchases used both currencies.`}
          />
          <div className='flex gap-4 text-sm font-semibold'>
            <Link
              href={`/?accountId=${encodeURIComponent(batch.accountId)}&venue=KRAKEN`}
              className='underline'
            >
              View open positions
            </Link>
            <Link
              href={`/history?accountId=${encodeURIComponent(batch.accountId)}&period=all`}
              className='underline'
            >
              View History
            </Link>
          </div>
        </div>
      )}
      {batch.status === 'DISCARDED' && (
        <Message
          severity='info'
          className='mb-4 w-full justify-start'
          text='This import was discarded.'
        />
      )}
      {batch.warnings.map(w => (
        <Message
          key={w}
          severity='warn'
          className='mb-2 w-full justify-start'
          text={w}
        />
      ))}
      {error && (
        <Message
          severity='error'
          className='mb-4 w-full justify-start'
          text={error}
        />
      )}

      <Section title='Summary'>
        <ul className='text-sm grid gap-1'>
          <li>{plan.summary.buys} new positions from buys</li>
          <li>{plan.summary.sells} sales matched to parcels</li>
          <li>
            Staking: {plan.summary.stakingMonthsApplied} months added,{' '}
            {plan.summary.stakingMonthsDust} skipped as dust (A$
            {Number(plan.summary.dustTotalAud).toFixed(2)} total),{' '}
            {plan.summary.stakingMonthsDeferred} deferred until the month ends
          </li>
          <li>
            {plan.summary.unsupported} unsupported · {plan.summary.skipped}{' '}
            skipped
          </li>
        </ul>
      </Section>

      <ReconciliationBanner detail={query.data} />

      {otherIssues.length > 0 && (
        <Section title='Issues'>
          {otherIssues.map(issue => (
            <div
              key={`${issue.type}-${issue.eventId}`}
              role={issue.blocking ? 'alert' : undefined}
              className={
                issue.blocking
                  ? 'text-red-600 text-sm'
                  : 'text-amber-700 text-sm'
              }
            >
              {issue.message}
            </div>
          ))}
        </Section>
      )}

      {plan.newPositions.length > 0 && (
        <Section title='New positions'>
          <div className='table-region'>
            <table className='data-grid text-sm w-full'>
              <thead>
                <tr className='text-left'>
                  <th>Symbol</th>
                  <th>Opened</th>
                  <th>Quantity</th>
                  <th>Entry price</th>
                  <th>Fees</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {plan.newPositions.map(p => (
                  <tr key={p.ref}>
                    <td>{p.symbol}</td>
                    <td>{formatDateDDMMYYYY(p.openDate.slice(0, 10))}</td>
                    <td>{p.quantity}</td>
                    <td>{p.entryPrice}</td>
                    <td>{p.buyFees}</td>
                    <td>
                      {p.origin === 'STAKING_REWARD' ? 'Staking' : 'Trade'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {plan.sells.length > 0 && (
        <Section title='Sales'>
          {plan.sells.map(sell => (
            <ImportSellAllocation
              key={`${sell.eventId}-${sell.allocations.map(a => a.positionRef + a.quantity).join()}`}
              sell={sell}
              issues={issuesFor(sell.eventId)}
              busy={busy}
              readOnly={done}
              onResolve={resolution => doResolve(sell.eventId, resolution)}
            />
          ))}
        </Section>
      )}

      {plan.staking.length > 0 && (
        <Section title='Staking rewards'>
          <div className='table-region'>
            <table className='data-grid text-sm w-full'>
              <thead>
                <tr className='text-left'>
                  <th>Asset</th>
                  <th>Month</th>
                  <th>Quantity</th>
                  <th>Value (AUD)</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {plan.staking.map(m => (
                  <tr key={m.key}>
                    <td>{m.baseAsset}</td>
                    <td>{m.month.split('-').reverse().join('/')}</td>
                    <td>{m.quantity}</td>
                    <td>
                      {m.status === 'DEFERRED'
                        ? '—'
                        : Number(m.fmvAud).toFixed(2)}
                    </td>
                    <td>
                      {m.status === 'APPLY' && 'Added as a position'}
                      {m.status === 'DUST' && 'Skipped (below A$1)'}
                      {m.status === 'DEFERRED' &&
                        'Deferred — month not finished'}
                      {m.status === 'BLOCKED' && 'Needs a value'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!done &&
            fmvIssues.map(issue => (
              <FmvInput
                key={issue.eventId}
                issue={issue}
                busy={busy}
                onSave={(eventId, value) =>
                  doResolve(eventId, { fmvAud: value })
                }
              />
            ))}
        </Section>
      )}

      {(plan.unsupported.length > 0 || plan.skipped.length > 0) && (
        <Section title='Unsupported and skipped'>
          <ul className='text-sm grid gap-1'>
            {[...plan.unsupported, ...plan.skipped].map(item => (
              <li key={item.eventId}>
                <span className='font-mono'>{item.externalId}</span> —{' '}
                {item.reason}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {!done && (
        <section className='import-review-actions' aria-label='Import actions'>
          {blocking > 0 && (
            <span className='import-review-actions-issues text-sm text-red-600'>
              {blocking} {blocking === 1 ? 'issue' : 'issues'} to resolve
            </span>
          )}
          <Button
            label='Discard'
            severity='danger'
            outlined
            disabled={busy}
            onClick={doDiscard}
          />
          <Button
            className='import-review-actions-commit'
            label={`Commit ${plan.newPositions.length + plan.sells.filter(s => s.resolved).length} items`}
            icon='pi pi-check'
            loading={commit.isPending}
            disabled={busy || blocking > 0 || nothingToApply}
            onClick={doCommit}
          />
        </section>
      )}
    </div>
  );
}

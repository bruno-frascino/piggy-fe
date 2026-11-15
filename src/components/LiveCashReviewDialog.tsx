'use client';

import { useState } from 'react';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import AppDialog from './AppDialog';
import LiveCashTransferRevisionDialog from './LiveCashTransferRevisionDialog';
import LiveFxRevisionDialog from './LiveFxRevisionDialog';
import LiveReinvestmentRevisionDialog from './LiveReinvestmentRevisionDialog';
import { useLiveCapitalOperations } from '@/hooks/api';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { formatDateDDMMYYYY } from '@/lib/date';
import { mutationErrorMessage } from '@/lib/mutation-error';
import { usePrivacy } from '@/lib/privacy-context';
import type { LiveCashCommandSummary } from '@/lib/types';

function commandDescription(
  command: LiveCashCommandSummary | null,
  mask: (value: string) => string
): string {
  if (!command) return 'Reversed (terminal)';
  if (command.kind === 'FX_CONVERSION' && command.from && command.to) {
    const fees =
      (command.fees ?? [])
        .map(fee => `${fee.currency} ${mask(fee.amount)}`)
        .join(', ') || 'none';
    return `FX conversion · ${formatDateDDMMYYYY(command.effectiveDate)} · sequence ${command.sequence} · ${command.from.currency} ${mask(command.from.amount)} -> ${command.to.currency} ${mask(command.to.amount)} · explicit fees ${fees}`;
  }
  const amounts = command.cash
    ? `${command.cash.currency} ${mask(command.cash.amount)}`
    : `${command.consideration?.currency ?? ''} ${mask(command.consideration?.amount ?? '')}`;
  const transfer = command.transfer
    ? ` · ${command.transfer.fromAccountId} -> ${command.transfer.toAccountId} · fee charged here ${mask(command.fee ?? '0')}`
    : '';
  return `${command.kind} · ${formatDateDDMMYYYY(command.effectiveDate)} · sequence ${command.sequence} · ${amounts}${transfer}`;
}

export default function LiveCashReviewDialog({
  accountId,
  accountName,
  onHide,
}: {
  accountId: string;
  accountName: string;
  onHide: () => void;
}) {
  const online = useNetworkStatus();
  const { mask, hidden } = usePrivacy();
  const [fxOperationId, setFxOperationId] = useState<string | null>(null);
  const [reinvestmentOperationId, setReinvestmentOperationId] = useState<
    string | null
  >(null);
  const [transferOperationId, setTransferOperationId] = useState<string | null>(
    null
  );
  const [offset, setOffset] = useState(0);
  const query = useLiveCapitalOperations(accountId, offset);
  const review = query.data;
  const hasNextPage = Boolean(
    review &&
    offset + review.limit <
      Math.max(review.total, review.activityTotal, review.auditTotal)
  );

  return (
    <AppDialog
      header={`Live cash review - ${accountName}`}
      visible
      modal
      blockScroll
      closable
      onHide={onHide}
      style={{ width: '760px', maxWidth: '100vw' }}
    >
      <div className='space-y-4'>
        <p className='text-sm text-gray-600'>
          Balances are replayed from recorded ledger activity. Statement
          evidence is user-attested and is not broker verification or proof of
          complete portfolio performance.
        </p>
        {!online && (
          <Message
            severity='warn'
            text={
              review
                ? 'Offline: showing cached last-successful cash review. Reconnect to refresh; no offline changes are available.'
                : 'Offline and no cached cash review is available. Reconnect to load account history.'
            }
          />
        )}
        {query.error && (
          <Message
            severity='error'
            text={mutationErrorMessage(
              query.error,
              'Could not load the account cash review. Retained audit data may be invalid.'
            )}
          />
        )}
        {query.isLoading && (
          <Message severity='info' text='Loading account cash review…' />
        )}
        {review && (
          <>
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <p className='text-sm'>
                {review.accountStatus === 'CLOSED'
                  ? 'Archived account · read-only'
                  : 'Active account · read-only review'}
              </p>
              <Button
                type='button'
                label='Refresh'
                icon='pi pi-refresh'
                outlined
                size='small'
                disabled={!online || query.isFetching}
                onClick={() => void query.refetch()}
              />
            </div>
            <p className='text-sm'>
              Opening boundary: end of day{' '}
              {formatDateDDMMYYYY(review.openingBoundary.date)} (
              {review.openingBoundary.timezone}); source reviewed through{' '}
              {formatDateDDMMYYYY(review.reviewedAsOfDate)}.
            </p>
            {review.sourceFreshness.status === 'STALE' && (
              <Message
                severity='warn'
                text='Source history has changed since the accepted ledger head. Balances below are the last validated ledger replay and are not a complete current-account balance.'
              />
            )}
            {review.sourceFreshness.status === 'NOT_REVALIDATED' && (
              <Message
                severity='warn'
                text='Archived accounts are read-only; current source freshness is not revalidated. Treat this as a retained ledger replay, not a current broker balance.'
              />
            )}
            {review.cashCompleteness === 'INCOMPLETE' && (
              <Message
                severity='warn'
                text='Cash replay is incomplete for current source history. Review unsupported events and source issues before relying on these balances.'
              />
            )}
            {review.unsupportedEvents.map((event, index) => (
              <Message
                key={`${event.code}-${event.sourceId ?? index}`}
                severity='error'
                text={`${event.code}${event.message ? `: ${event.message}` : ''}${event.effectiveDate ? ` (${formatDateDDMMYYYY(event.effectiveDate)})` : ''}`}
              />
            ))}
            {review.replay.fundingIssues.map((issue, index) => (
              <Message
                key={`${issue.idempotencyKey}-${index}`}
                severity='error'
                text={`Funding gap: ${issue.currency} ${mask(issue.balance)} on ${formatDateDDMMYYYY(issue.effectiveDate)}.`}
              />
            ))}

            <section className='space-y-2'>
              <h3 className='font-semibold'>Balances by currency</h3>
              {review.replay.balances.map(balance => (
                <div
                  key={balance.currency}
                  className='flex flex-wrap justify-between gap-x-4 rounded border border-gray-200 p-2 text-sm'
                >
                  <span>{balance.currency}</span>
                  <span>
                    Opening {mask(balance.openingAmount)} · current replay{' '}
                    {mask(balance.endingAmount)}
                  </span>
                </div>
              ))}
            </section>

            <section className='space-y-2'>
              <h3 className='font-semibold'>
                Effective-dated activity ({review.activityTotal})
              </h3>
              {review.activity.length === 0 && (
                <p className='text-sm text-gray-600'>
                  No post-opening activity.
                </p>
              )}
              {review.activity.map(entry => (
                <article
                  key={entry.operationId}
                  className='space-y-1 rounded border border-gray-200 p-2 text-sm'
                >
                  <p className='font-medium'>
                    {entry.kind} · {formatDateDDMMYYYY(entry.effectiveDate)} ·
                    sequence {entry.sequence}
                  </p>
                  <p>
                    {entry.sourceOrigin}: {entry.sourceReference}
                  </p>
                  {entry.changes.map(change => (
                    <p key={change.currency}>
                      {change.currency} {mask(change.amount)} · balance after{' '}
                      {mask(change.balanceAfter)}
                    </p>
                  ))}
                </article>
              ))}
            </section>

            <section className='space-y-2'>
              <h3 className='font-semibold'>
                Statement evidence ·{' '}
                {review.evidenceStatus.replaceAll('_', ' ')}
              </h3>
              {review.evidence.length === 0 && (
                <p className='text-sm text-gray-600'>
                  No user-attested statement cash evidence is recorded.
                </p>
              )}
              {review.evidence.map(evidence => (
                <article
                  key={evidence.id}
                  className='space-y-1 rounded border border-gray-200 p-2 text-sm'
                >
                  <p className='font-medium'>
                    {formatDateDDMMYYYY(evidence.asOfDate)} · {evidence.source}{' '}
                    · {evidence.reference}
                  </p>
                  <p>
                    User attested · recorded{' '}
                    {formatDateDDMMYYYY(evidence.recordedAt)}
                  </p>
                  {evidence.statementBalances.map(balance => (
                    <p key={balance.currency}>
                      Statement {balance.currency} {mask(balance.amount)}
                    </p>
                  ))}
                  {evidence.currentComparison.variances.map(variance => (
                    <p key={variance.currency} className='text-red-700'>
                      {variance.currency} variance {mask(variance.difference)}{' '}
                      (replay {mask(variance.expectedAmount)} vs statement{' '}
                      {mask(variance.statementAmount)})
                    </p>
                  ))}
                  {evidence.decisions.map(decision => (
                    <p key={decision.currency}>
                      {decision.currency} review: {decision.reason} —{' '}
                      {decision.note}
                    </p>
                  ))}
                </article>
              ))}
            </section>

            {review.sourceReviewIssues.length > 0 && (
              <section className='space-y-2'>
                <h3 className='font-semibold'>Source review issues</h3>
                {review.sourceReviewIssues.map((issue, index) => (
                  <Message
                    key={`${issue.code}-${issue.sourceId ?? index}`}
                    severity={issue.severity === 'BLOCKING' ? 'error' : 'warn'}
                    text={`${issue.code}: ${issue.message}`}
                  />
                ))}
              </section>
            )}

            <section className='space-y-2'>
              <h3 className='font-semibold'>
                Retained operation revisions ({review.auditTotal})
              </h3>
              {review.auditOperations.map(operation => (
                <article
                  key={operation.operationId}
                  className='space-y-1 rounded border border-gray-200 p-2 text-sm'
                >
                  <p className='font-medium'>
                    Audit {operation.auditNumber} ·{' '}
                    {operation.original.source.origin}:{' '}
                    {operation.original.source.reference}
                  </p>
                  <p>
                    Original: {commandDescription(operation.original, mask)}
                  </p>
                  <p>Current: {commandDescription(operation.current, mask)}</p>
                  {operation.reinvestment && (
                    <p>
                      Linked dividend reinvestment: income{' '}
                      {operation.reinvestment.incomeOperationId}
                      {' / '}acquisition{' '}
                      {operation.reinvestment.acquisitionOperationId}
                      {' / '}new parcel {operation.reinvestment.positionId}.{' '}
                      Original acquisition{' '}
                      {formatDateDDMMYYYY(
                        operation.reinvestment.request.acquisition.effectiveDate
                      )}
                      :{' '}
                      {mask(
                        operation.reinvestment.request.acquisition.quantity
                      )}{' '}
                      units; account-cash residual{' '}
                      {mask(operation.reinvestment.request.residualAmount)}{' '}
                      {operation.reinvestment.request.income.currency}.
                      Independent edits and reversal are blocked.
                    </p>
                  )}
                  {operation.reinvestment && operation.current && (
                    <Button
                      label='Correct or reverse paired reinvestment'
                      outlined
                      size='small'
                      disabled={
                        !online ||
                        hidden ||
                        query.isFetching ||
                        Boolean(query.error) ||
                        query.data?.accountStatus !== 'ACTIVE' ||
                        query.data?.sourceFreshness.status !== 'CURRENT'
                      }
                      onClick={() =>
                        setReinvestmentOperationId(
                          operation.reinvestment!.incomeOperationId
                        )
                      }
                    />
                  )}
                  {operation.original.kind === 'FX_CONVERSION' &&
                    operation.current && (
                      <Button
                        label='Correct or reverse FX conversion'
                        outlined
                        size='small'
                        disabled={
                          !online ||
                          hidden ||
                          query.isFetching ||
                          Boolean(query.error) ||
                          review.accountStatus !== 'ACTIVE' ||
                          review.sourceFreshness.status !== 'CURRENT'
                        }
                        onClick={() => setFxOperationId(operation.operationId)}
                      />
                    )}
                  {operation.original.kind === 'TRANSFER_OUT' &&
                    operation.current && (
                      <Button
                        label='Correct or reverse paired transfer'
                        outlined
                        size='small'
                        disabled={
                          !online ||
                          hidden ||
                          query.isFetching ||
                          review.accountStatus !== 'ACTIVE' ||
                          review.sourceFreshness.status !== 'CURRENT'
                        }
                        onClick={() =>
                          setTransferOperationId(operation.operationId)
                        }
                      />
                    )}
                  {operation.revisions.map(revision => (
                    <div
                      key={revision.revisionId}
                      className='border-l-2 border-gray-300 pl-3'
                    >
                      <p>
                        Revision {revision.revisionNumber} / audit{' '}
                        {revision.auditNumber} · {revision.reason}
                      </p>
                      <p>
                        Effective replacement:{' '}
                        {commandDescription(revision.replacement, mask)}
                      </p>
                      {revision.postings.map((posting, index) => (
                        <p key={`${posting.phase}-${index}`}>
                          {posting.phase} {posting.currency}{' '}
                          {mask(posting.amount)} ({posting.role})
                        </p>
                      ))}
                    </div>
                  ))}
                </article>
              ))}
            </section>
            <div className='flex justify-between gap-2'>
              <Button
                type='button'
                label='Previous'
                outlined
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - review.limit))}
              />
              <Button
                type='button'
                label='Next'
                outlined
                disabled={!hasNextPage}
                onClick={() => setOffset(offset + review.limit)}
              />
            </div>
          </>
        )}
      </div>
      {transferOperationId && (
        <LiveCashTransferRevisionDialog
          accountId={accountId}
          operationId={transferOperationId}
          onHide={() => setTransferOperationId(null)}
        />
      )}
      {reinvestmentOperationId && (
        <LiveReinvestmentRevisionDialog
          accountId={accountId}
          accountName={accountName}
          operationId={reinvestmentOperationId}
          onHide={() => setReinvestmentOperationId(null)}
        />
      )}
      {fxOperationId && (
        <LiveFxRevisionDialog
          accountId={accountId}
          operationId={fxOperationId}
          onHide={() => setFxOperationId(null)}
        />
      )}
    </AppDialog>
  );
}

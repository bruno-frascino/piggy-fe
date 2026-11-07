'use client';

import { useState } from 'react';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { useLiveManualTradeVoids } from '@/hooks/api';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { usePrivacy } from '@/lib/privacy-context';
import { mutationErrorMessage } from '@/lib/mutation-error';
import { formatDateDDMMYYYY } from '@/lib/date';

function VoidRecords({ accountId }: { accountId: string }) {
  const [offset, setOffset] = useState(0);
  const { data, isPending, error, isFetching, refetch } =
    useLiveManualTradeVoids(accountId, offset);
  const online = useNetworkStatus();
  const { mask } = usePrivacy();
  return (
    <div className='space-y-3'>
      {!online && (
        <Message
          severity='warn'
          text='Offline: retained audits may be stale.'
        />
      )}
      {isPending && <p>Loading retained void audits...</p>}
      {error && (
        <Message
          severity='error'
          text={mutationErrorMessage(
            error,
            'Could not load retained void audits. This view requires a confirmed live cash ledger.'
          )}
        />
      )}
      <Button
        label='Refresh void audits'
        text
        disabled={!online || isFetching}
        onClick={() => void refetch()}
      />
      {data?.items.length === 0 && <p>No manual trade voids recorded.</p>}
      {data?.items.map(record => (
        <article key={record.revisionId} className='task-summary'>
          <p>
            <strong>
              {record.kind === 'BUY' ? 'Acquisition' : 'Sale'} voided
            </strong>{' '}
            - {formatDateDDMMYYYY(record.voidedAt.slice(0, 10))}
          </p>
          <p>Original trade: {record.transactionId}</p>
          <p>
            Trade date: {formatDateDDMMYYYY(record.before.date.slice(0, 10))}
          </p>
          <p>
            {mask(
              `${record.before.quantity} units at ${record.before.price} ${record.before.currency}; fees ${record.before.fees}`
            )}
          </p>
          <p>Reason: {mask(record.reason)}</p>
          <p>Audit revision: {record.revisionId}</p>
        </article>
      ))}
      {data && data.total > 100 && (
        <div className='task-actions'>
          <Button
            label='Previous void audits'
            outlined
            disabled={offset === 0 || isFetching}
            onClick={() => setOffset(value => Math.max(0, value - 100))}
          />
          <span>
            {offset + 1}-{Math.min(offset + data.items.length, data.total)} of{' '}
            {data.total}
          </span>
          <Button
            label='Next void audits'
            outlined
            disabled={offset + data.items.length >= data.total || isFetching}
            onClick={() => setOffset(value => value + 100)}
          />
        </div>
      )}
    </div>
  );
}

export default function ManualTradeVoidHistory({
  accountId,
}: {
  accountId: string;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <section className='space-y-3 mt-4'>
      <Button
        label={
          expanded ? 'Hide retained void audits' : 'View retained void audits'
        }
        outlined
        onClick={() => setExpanded(value => !value)}
      />
      {expanded && (
        <>
          <p>
            Voided trades do not contribute to holdings, disposals or current
            results. Original records remain available below. This view requires
            a confirmed live cash ledger.
          </p>
          <VoidRecords accountId={accountId} />
        </>
      )}
    </section>
  );
}

'use client';

import Link from 'next/link';
import { Card } from 'primereact/card';
import { Message } from 'primereact/message';
import PageHeader from '@/components/PageHeader';
import { useImports, useTradingAccounts } from '@/hooks/api';
import { formatDateDDMMYYYY } from '@/lib/date';
import type { ImportBatchStatus } from '@/lib/types';

const STATUS_LABELS: Record<ImportBatchStatus, string> = {
  PENDING_REVIEW: 'Pending review',
  PARTIALLY_APPLIED: 'Partially applied',
  COMMITTED: 'Committed',
  DISCARDED: 'Discarded',
  FAILED: 'Failed',
};

export default function ImportsList() {
  const imports = useImports();
  const accounts = useTradingAccounts(true);
  const accountName = (id: string) =>
    accounts.data?.find(a => a.id === id)?.name ?? 'Unknown account';

  return (
    <div className='p-4 md:p-6'>
      <PageHeader
        title='Imports'
        subtitle='Positions imported from exchange exports. Start an import from the Add Position area on the dashboard.'
      />
      {imports.isError && (
        <Message severity='error' text='Could not load your imports.' />
      )}
      {imports.data?.length === 0 && (
        <div className='text-sm' style={{ color: 'var(--tr-text-2)' }}>
          No imports yet.
        </div>
      )}
      {imports.data?.map(batch => (
        <Card key={batch.id} className='mb-3'>
          <div className='flex flex-wrap justify-between gap-2'>
            <div>
              <Link
                href={`/imports/${batch.id}`}
                className='font-semibold underline'
              >
                Kraken · {formatDateDDMMYYYY(batch.createdAt)}{' '}
                {new Date(batch.createdAt).toLocaleTimeString()}
              </Link>
              <div className='text-sm' style={{ color: 'var(--tr-text-2)' }}>
                {accountName(batch.accountId)} · {batch.fileNames.join(', ')}
              </div>
            </div>
            <div className='text-sm text-right'>
              <div>{STATUS_LABELS[batch.status]}</div>
              <div style={{ color: 'var(--tr-text-2)' }}>
                {Object.entries(batch.eventCounts ?? {})
                  .map(([status, count]) => `${count} ${status.toLowerCase()}`)
                  .join(' · ')}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

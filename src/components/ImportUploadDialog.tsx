'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import AppDialog from '@/components/AppDialog';
import { useCreateImport } from '@/hooks/api';
import { useToast } from '@/lib/toast-context';
import type {
  ImportBatchStatus,
  ImportFilePayload,
  ImportUploadResult,
} from '@/lib/types';

const STATUS_LABELS: Record<ImportBatchStatus, string> = {
  PENDING_REVIEW: 'Awaiting review and commit',
  PARTIALLY_APPLIED: 'Partially committed',
  COMMITTED: 'Committed',
  DISCARDED: 'Discarded',
  FAILED: 'Failed',
};

interface ImportUploadDialogProps {
  visible: boolean;
  accountId: string;
  accountName?: string;
  onHide: () => void;
}

function errorMessage(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'data' in error.response
  ) {
    const data = error.response.data;
    if (
      typeof data === 'object' &&
      data !== null &&
      'message' in data &&
      typeof data.message === 'string'
    ) {
      return data.message;
    }
  }
  return error instanceof Error ? error.message : 'Import failed';
}

function FilePicker({
  label,
  file,
  onChange,
}: {
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  return (
    <div className='flex flex-col gap-1 text-sm font-medium'>
      {label}
      <label
        className='flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed px-4 py-3 transition-colors hover:bg-black/5 focus-within:ring-2'
        style={{
          borderColor: file ? 'var(--primary-color)' : 'var(--tr-text-2)',
        }}
      >
        <i
          className={`pi ${file ? 'pi-file' : 'pi-upload'}`}
          style={{ color: 'var(--primary-color)' }}
        />
        <span
          className='font-semibold'
          style={{ color: 'var(--primary-color)' }}
        >
          {file ? 'Change file' : 'Choose file'}
        </span>
        <span
          className='min-w-0 flex-1 truncate font-normal'
          style={{ color: 'var(--tr-text-2)' }}
        >
          {file ? file.name : 'No file chosen'}
        </span>
        <input
          type='file'
          accept='.csv,text/csv'
          aria-label={label}
          className='sr-only'
          onChange={e => onChange(e.target.files?.[0] ?? null)}
        />
      </label>
    </div>
  );
}

export default function ImportUploadDialog({
  visible,
  accountId,
  accountName,
  onHide,
}: ImportUploadDialogProps) {
  const router = useRouter();
  const { show: showToast } = useToast();
  const createImport = useCreateImport();
  const [trades, setTrades] = useState<File | null>(null);
  const [ledgers, setLedgers] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [previousImport, setPreviousImport] =
    useState<ImportUploadResult | null>(null);

  const reset = () => {
    setTrades(null);
    setLedgers(null);
    setError('');
    setPreviousImport(null);
  };

  const handleHide = () => {
    reset();
    onHide();
  };

  const handleUpload = async () => {
    setError('');
    setPreviousImport(null);
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError('You are offline. Reconnect to import from an exchange.');
      return;
    }
    if (!trades || !ledgers) {
      setError('Choose both the Trades CSV and the Ledgers CSV.');
      return;
    }

    try {
      const files: ImportFilePayload[] = [
        { kind: 'trades', fileName: trades.name, content: await trades.text() },
        {
          kind: 'ledgers',
          fileName: ledgers.name,
          content: await ledgers.text(),
        },
      ];
      const result = await createImport.mutateAsync({
        source: 'KRAKEN',
        accountId,
        files,
      });

      if (!result.batch) {
        setPreviousImport(result);
        return;
      }
      showToast({
        severity: 'success',
        summary: 'Import ready for review',
        detail: 'Nothing is added to your portfolio until you commit.',
        life: 4000,
      });
      reset();
      onHide();
      router.push(`/imports/${result.batch.id}`);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <AppDialog
      header={`Import from Kraken${accountName ? ` · ${accountName}` : ''}`}
      visible={visible}
      onHide={handleHide}
      style={{ width: '32rem', maxWidth: '95vw' }}
      modal
    >
      <div className='flex flex-col gap-4'>
        <div className='text-sm' style={{ color: 'var(--tr-text-2)' }}>
          <p className='mb-2'>
            In Kraken go to <strong>History → Export</strong> and export both{' '}
            <strong>Trades</strong> and <strong>Ledgers</strong> as CSV, for the
            same date range. Both files are required.
          </p>
          <p>
            Upload → Review → Commit. Uploading only saves a draft. Positions
            and sales appear in your portfolio and History after you commit the
            review.
          </p>
          <p className='mt-2'>
            Re-uploading overlapping files is safe. Events already uploaded are
            not added again; you can continue their existing review.
          </p>
        </div>

        <FilePicker
          label='Trades CSV'
          file={trades}
          onChange={file => {
            setTrades(file);
            setPreviousImport(null);
            setError('');
          }}
        />
        <FilePicker
          label='Ledgers CSV'
          file={ledgers}
          onChange={file => {
            setLedgers(file);
            setPreviousImport(null);
            setError('');
          }}
        />

        <Link
          href='/imports'
          className='text-sm font-medium underline'
          onClick={handleHide}
        >
          View past imports
        </Link>

        {error && <Message severity='error' text={error} />}
        {previousImport && (
          <div className='flex flex-col gap-3' role='status'>
            <Message
              severity='info'
              text={
                previousImport.duplicates > 0
                  ? `These ${previousImport.duplicates} events were uploaded before. This does not mean they have been committed to your portfolio.`
                  : 'No importable events were found. Check that both CSV exports cover the intended date range.'
              }
            />
            {previousImport.existingBatches?.map(batch => {
              const canReview =
                batch.status === 'PENDING_REVIEW' ||
                batch.status === 'PARTIALLY_APPLIED';
              return (
                <div
                  key={batch.id}
                  className='rounded-lg border p-3 text-sm'
                  style={{ borderColor: 'var(--tr-text-2)' }}
                >
                  <p className='font-semibold'>
                    {batch.accountName} · {STATUS_LABELS[batch.status]}
                  </p>
                  <p className='my-2'>
                    {batch.eventCount} matching events.
                    {batch.accountId !== accountId &&
                      ' This import belongs to a different trading account.'}
                    {canReview
                      ? ' Open the review, resolve any issues, then click Commit to add the remaining positions and sales.'
                      : ' Open this import to check which events were applied, skipped or deferred.'}
                  </p>
                  <Link
                    href={`/imports/${batch.id}`}
                    className={
                      canReview
                        ? 'p-button p-component p-button-sm inline-flex justify-center'
                        : 'font-semibold underline'
                    }
                    onClick={handleHide}
                  >
                    {canReview ? 'Continue review' : 'View import details'}
                    {' · '}
                    {batch.accountName}
                  </Link>
                </div>
              );
            })}
            {previousImport.duplicates > 0 &&
              !previousImport.existingBatches?.length && (
                <p className='text-sm'>
                  Open View past imports above to check their status and
                  continue any unfinished review.
                </p>
              )}
            {previousImport.warnings.map(warning => (
              <Message key={warning} severity='warn' text={warning} />
            ))}
          </div>
        )}

        <div className='flex justify-end gap-2'>
          <Button
            label='Cancel'
            severity='secondary'
            text
            onClick={handleHide}
          />
          <Button
            label='Upload and review'
            icon='pi pi-upload'
            loading={createImport.isPending}
            disabled={!trades || !ledgers || previousImport !== null}
            onClick={handleUpload}
          />
        </div>
      </div>
    </AppDialog>
  );
}

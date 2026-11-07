'use client';

import { useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { isAxiosError } from 'axios';
import AppDialog from './AppDialog';
import { useVoidLiveManualTrade } from '@/hooks/api';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { usePrivacy } from '@/lib/privacy-context';
import { mutationErrorMessage } from '@/lib/mutation-error';
import type { LiveSaleCorrectionMetadata } from '@/lib/types';

export default function ManualTradeVoidDialog({
  accountId,
  transactionId,
  symbol,
  kind,
  metadata,
  onHide,
  onSaved,
}: {
  accountId: string;
  transactionId: string;
  symbol: string;
  kind: 'BUY' | 'SELL';
  metadata: LiveSaleCorrectionMetadata;
  onHide: () => void;
  onSaved: () => void;
}) {
  const online = useNetworkStatus();
  const { hidden } = usePrivacy();
  const { mutateAsync, isPending } = useVoidLiveManualTrade();
  const [reason, setReason] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState('');
  const [stale, setStale] = useState(false);
  const retry = useRef<{ signature: string; idempotencyKey: string } | null>(
    null
  );
  const save = async () => {
    if (!online || hidden || stale || isPending) return;
    if (
      !reason.trim() ||
      Array.from(reason).some(
        character =>
          character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127
      ) ||
      !acknowledged
    ) {
      setError('Enter an audit reason and acknowledge the financial impact.');
      return;
    }
    const input = {
      expectedRevisionId: metadata.expectedRevisionId,
      expectedSourceFingerprint: metadata.expectedSourceFingerprint,
      reason: reason.trim(),
    };
    const signature = JSON.stringify(input);
    if (retry.current?.signature !== signature)
      retry.current = {
        signature,
        idempotencyKey: globalThis.crypto.randomUUID(),
      };
    setError('');
    try {
      await mutateAsync({
        accountId,
        transactionId,
        input: { ...input, idempotencyKey: retry.current.idempotencyKey },
      });
      onSaved();
    } catch (failure) {
      if (isAxiosError(failure) && failure.response?.status === 409) {
        setStale(true);
        setError(
          'Account history changed or this void conflicts with recorded trades. Close, refresh and review before trying again.'
        );
      } else {
        const message = isAxiosError<{ message?: unknown }>(failure)
          ? failure.response?.data?.message
          : undefined;
        setError(
          typeof message === 'string'
            ? message
            : mutationErrorMessage(
                failure,
                'Could not void this trade. Please retry.'
              )
        );
      }
    }
  };
  return (
    <AppDialog
      header={`Void ${kind === 'BUY' ? 'acquisition' : 'sale'} - ${symbol}`}
      visible
      task
      style={{ width: '600px', maxWidth: '95vw' }}
      onHide={() => {
        if (!isPending) onHide();
      }}
      footer={
        <div className='task-actions'>
          <Button
            label='Cancel'
            outlined
            onClick={onHide}
            disabled={isPending}
          />
          <Button
            label='Record void'
            severity='danger'
            loading={isPending}
            disabled={isPending || !online || hidden || stale}
            onClick={() => void save()}
          />
        </div>
      }
    >
      <div className='space-y-4'>
        <Message
          severity='warn'
          text={
            kind === 'BUY'
              ? 'This permanently removes the acquisition from effective holdings and refunds its cash outflow. All effective sales must be voided first. Imported parcels are not supported.'
              : 'This permanently restores the sold units and removes sale proceeds from cash replay. The void is rejected if later activity would become unfunded.'
          }
        />
        <p>
          Original trades and postings remain in the retained void audit
          history. This cannot be undone. Current results change; existing tax
          PDFs remain unchanged and may need regeneration.
        </p>
        {!online && (
          <Message
            severity='warn'
            text='Reconnect to void this trade. Offline changes are not queued.'
          />
        )}
        {hidden && (
          <Message
            severity='info'
            text='Disable privacy mode to review and void this trade.'
          />
        )}
        {error && <Message severity='error' text={error} />}
        <label className='block' htmlFor='trade-void-reason'>
          Audit reason
        </label>
        <InputTextarea
          id='trade-void-reason'
          value={reason}
          maxLength={1000}
          disabled={isPending || stale}
          onChange={event => setReason(event.target.value)}
        />
        <div className='flex gap-2 items-center'>
          <Checkbox
            inputId='trade-void-ack'
            checked={acknowledged}
            disabled={isPending || stale}
            onChange={event => setAcknowledged(event.checked === true)}
          />
          <label htmlFor='trade-void-ack'>
            I understand this permanently changes live inventory, cash and tax
            results.
          </label>
        </div>
      </div>
    </AppDialog>
  );
}

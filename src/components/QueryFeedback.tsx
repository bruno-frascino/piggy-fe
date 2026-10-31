'use client';

import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export default function QueryFeedback({
  label,
  isError,
  isFetching,
  hasData,
  onRetry,
  showOffline = true,
}: {
  label: string;
  isError?: boolean;
  isFetching?: boolean;
  hasData: boolean;
  onRetry: () => void;
  showOffline?: boolean;
}) {
  const online = useNetworkStatus();
  if (!online) {
    if (!showOffline) return null;
    return (
      <Message
        severity='warn'
        text={
          hasData
            ? `Offline — showing last loaded ${label.toLowerCase()}. Data may be out of date.`
            : `Offline — ${label.toLowerCase()} is unavailable. Reconnect to load it.`
        }
      />
    );
  }
  if (!isError) return null;
  return (
    <div className='query-feedback'>
      <Message
        severity='error'
        text={
          hasData
            ? `Could not refresh ${label.toLowerCase()}. Showing last loaded data.`
            : `Could not load ${label.toLowerCase()}. Please try again.`
        }
      />
      <Button
        type='button'
        label={`Retry ${label.toLowerCase()}`}
        icon='pi pi-refresh'
        outlined
        size='small'
        loading={isFetching}
        disabled={isFetching}
        onClick={onRetry}
      />
    </div>
  );
}

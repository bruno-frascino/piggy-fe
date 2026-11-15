'use client';

import { useState } from 'react';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import AppDialog from './AppDialog';
import LiveReinvestmentDialog from './LiveReinvestmentDialog';
import {
  useLiveReinvestmentReview,
  useCorrectLiveReinvestment,
} from '@/hooks/api';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export default function LiveReinvestmentRevisionDialog({
  accountId,
  accountName,
  operationId,
  onHide,
}: {
  accountId: string;
  accountName: string;
  operationId: string;
  onHide: () => void;
}) {
  const query = useLiveReinvestmentReview(accountId, operationId);
  const mutation = useCorrectLiveReinvestment();
  const online = useNetworkStatus();
  const [refreshVersion, setRefreshVersion] = useState(0);
  const refresh = async () => {
    if (!online || mutation.isPending || query.isFetching) return;
    const result = await query.refetch();
    if (!result.isError) setRefreshVersion(version => version + 1);
  };
  const review = query.data;
  if (!review?.current)
    return (
      <AppDialog
        header={`Review paired reinvestment - ${accountName}`}
        visible
        modal
        onHide={onHide}
      >
        <Message
          severity={query.isError ? 'error' : 'info'}
          text={
            query.isError
              ? 'Could not load a fresh paired review. Refresh before making changes.'
              : review
                ? 'This reinvestment was terminally reversed. Original records and audits remain retained.'
                : 'Loading paired reinvestment review.'
          }
        />
        <Button
          label='Refresh paired review heads'
          disabled={!online || query.isFetching || mutation.isPending}
          onClick={() => void refresh()}
        />
      </AppDialog>
    );
  return (
    <LiveReinvestmentDialog
      key={`${review.expectedIncomeRevisionId}:${review.expectedAcquisitionRevisionId}:${review.expectedAuditNumber}:${review.expectedSourceFingerprint}:${refreshVersion}`}
      accountId={accountId}
      accountName={accountName}
      onHide={onHide}
      revision={{
        current: review.current,
        pending: mutation.isPending,
        blocked: query.isError || query.isFetching || review.hasEffectiveSales,
        refresh: () => void refresh(),
        onSubmit: (replacement, idempotencyKey, reason) =>
          mutation.mutateAsync({
            accountId,
            operationId: review.incomeOperationId,
            input: {
              idempotencyKey,
              expectedIncomeRevisionId: review.expectedIncomeRevisionId,
              expectedAcquisitionRevisionId:
                review.expectedAcquisitionRevisionId,
              expectedAuditNumber: review.expectedAuditNumber,
              expectedSourceFingerprint: review.expectedSourceFingerprint,
              reason,
              replacement,
            },
          }),
      }}
    />
  );
}

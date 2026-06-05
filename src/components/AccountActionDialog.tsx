'use client';

import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';

interface Props {
  visible: boolean;
  action: 'close' | 'delete';
  accountName: string;
  loading?: boolean;
  error?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function AccountActionDialog({
  visible,
  action,
  accountName,
  loading = false,
  error = '',
  onCancel,
  onConfirm,
}: Props) {
  if (!visible) return null;

  const isDelete = action === 'delete';
  const header = `${isDelete ? 'Delete' : 'Close'} account — ${accountName}`;
  const title = isDelete
    ? `Delete ${accountName} permanently?`
    : `Close ${accountName}?`;
  const detail = isDelete
    ? 'This permanently removes the account from the app. It only works when the account has no positions or snapshots.'
    : 'This archives the account. You can reopen it later and your history will be preserved.';

  return (
    <Dialog
      header={header}
      visible
      modal
      dismissableMask={false}
      closable={!loading}
      closeOnEscape={!loading}
      style={{ width: '560px', maxWidth: '95vw' }}
      onHide={onCancel}
    >
      <div className='space-y-5'>
        <div
          className={`rounded-2xl border p-4 ${
            isDelete
              ? 'border-red-200 bg-red-50 text-red-900'
              : 'border-amber-200 bg-amber-50 text-amber-950'
          }`}
        >
          <div className='flex gap-3'>
            <div
              className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-full ${
                isDelete ? 'bg-red-100' : 'bg-amber-100'
              }`}
              aria-hidden
            >
              <i
                className={`pi ${isDelete ? 'pi-trash' : 'pi-lock'} text-lg`}
                aria-hidden
              />
            </div>
            <div className='space-y-1'>
              <p className='text-base font-semibold'>{title}</p>
              <p className='text-sm leading-6 opacity-90'>{detail}</p>
            </div>
          </div>
        </div>

        <div className='space-y-2'>
          <p className='text-sm text-gray-600'>
            {isDelete
              ? 'If the account still has activity, clear it first by closing positions or archiving the account.'
              : 'Use close when you want to keep the account around but stop using it for now.'}
          </p>
          {error && <p className='text-sm text-red-600'>{error}</p>}
        </div>

        <div className='flex justify-end gap-2 pt-1'>
          <Button
            type='button'
            label='Cancel'
            severity='secondary'
            outlined
            onClick={onCancel}
            disabled={loading}
          />
          <Button
            type='button'
            label={isDelete ? 'Delete account' : 'Close account'}
            icon={isDelete ? 'pi pi-trash' : 'pi pi-lock'}
            severity={isDelete ? 'danger' : 'warning'}
            onClick={onConfirm}
            loading={loading}
            disabled={loading}
          />
        </div>
      </div>
    </Dialog>
  );
}

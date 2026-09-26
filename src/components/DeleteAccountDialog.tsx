'use client';

import { useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Message } from 'primereact/message';

interface Props {
  visible: boolean;
  email: string;
  loading?: boolean;
  error?: string;
  onCancel: () => void;
  onConfirm: (currentPassword: string) => void;
}

export default function DeleteAccountDialog({
  visible,
  email,
  loading = false,
  error = '',
  onCancel,
  onConfirm,
}: Props) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');

  if (!visible) return null;

  const emailMatches =
    confirmEmail.trim().toLowerCase() === email.trim().toLowerCase();
  const canSubmit = emailMatches && currentPassword.length > 0 && !loading;

  const handleHide = () => {
    setCurrentPassword('');
    setConfirmEmail('');
    onCancel();
  };

  return (
    <Dialog
      header='Delete your account'
      visible
      modal
      blockScroll
      dismissableMask={false}
      closable={!loading}
      closeOnEscape={!loading}
      style={{ width: '560px', maxWidth: '95vw' }}
      onHide={handleHide}
    >
      <div className='space-y-5'>
        <div className='rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900'>
          <div className='flex gap-3'>
            <div
              className='mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-red-100'
              aria-hidden
            >
              <i className='pi pi-exclamation-triangle text-lg' aria-hidden />
            </div>
            <div className='space-y-1'>
              <p className='text-base font-semibold'>
                This deletes everything in Truffles
              </p>
              <p className='text-sm leading-6 opacity-90'>
                Your trading accounts, positions, closed trades, performance
                history and generated tax reports will all be removed.
              </p>
            </div>
          </div>
        </div>

        <Message
          severity='warn'
          className='w-full'
          content={
            <span className='text-sm leading-6'>
              Download anything you still need first. The ATO expects capital
              gains records to be kept for five years, and Truffles may hold the
              only copy of your cost bases and tax report PDFs.
            </span>
          }
        />

        <p className='text-sm text-gray-600'>
          You have 30 days to change your mind — signing in during that window
          lets you restore the account. After that it is permanently erased.
        </p>

        <div className='space-y-2'>
          <label
            htmlFor='delete-confirm-email'
            className='block text-sm font-medium text-gray-700'
          >
            Type <span className='font-semibold'>{email}</span> to confirm
          </label>
          <InputText
            id='delete-confirm-email'
            value={confirmEmail}
            onChange={e => setConfirmEmail(e.target.value)}
            className='w-full'
            autoComplete='off'
          />
        </div>

        <div className='space-y-2'>
          <label
            htmlFor='delete-confirm-password'
            className='block text-sm font-medium text-gray-700'
          >
            Current password
          </label>
          <Password
            inputId='delete-confirm-password'
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            feedback={false}
            toggleMask
            className='w-full'
          />
        </div>

        {error && <Message severity='error' text={error} className='w-full' />}

        <div className='flex justify-end gap-2 pt-1'>
          <Button
            type='button'
            label='Cancel'
            severity='secondary'
            outlined
            onClick={handleHide}
            disabled={loading}
          />
          <Button
            type='button'
            label='Delete my account'
            icon='pi pi-trash'
            severity='danger'
            onClick={() => onConfirm(currentPassword)}
            loading={loading}
            disabled={!canSubmit}
          />
        </div>
      </div>
    </Dialog>
  );
}

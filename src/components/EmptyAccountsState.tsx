'use client';

import { Button } from 'primereact/button';

interface EmptyAccountsStateProps {
  onCreateAccount: () => void;
}

export default function EmptyAccountsState({
  onCreateAccount,
}: EmptyAccountsStateProps) {
  return (
    <div className='max-w-sm w-full mx-auto text-center space-y-4'>
      <span className='text-5xl' aria-hidden>
        🐷
      </span>
      <h1
        className='text-2xl font-semibold'
        style={{ color: 'var(--tr-text)' }}
      >
        Welcome to Truffles
      </h1>
      <p className='text-sm' style={{ color: 'var(--tr-text-2)' }}>
        Create your first account to start tracking your portfolio.
      </p>
      <Button
        type='button'
        label='Create your first account'
        icon='pi pi-plus'
        onClick={onCreateAccount}
      />
    </div>
  );
}

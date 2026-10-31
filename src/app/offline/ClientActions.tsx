'use client';

import Link from 'next/link';

export default function OfflineActions() {
  return (
    <div className='flex items-center justify-center gap-3'>
      <button
        className='p-button p-component'
        onClick={() => window.location.reload()}
      >
        Retry
      </button>
      <Link
        href='/'
        className='p-button p-component p-button-secondary p-button-outlined'
      >
        Go Home
      </Link>
    </div>
  );
}

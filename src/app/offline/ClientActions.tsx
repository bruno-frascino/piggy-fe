'use client';

import Link from 'next/link';

export default function OfflineActions() {
  return (
    <div className='flex items-center justify-center gap-3'>
      <button
        className='px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700'
        onClick={() => window.location.reload()}
      >
        Retry
      </button>
      <Link
        href='/'
        className='px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50'
      >
        Go Home
      </Link>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function TopNav() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href;

  return (
    <nav className='sticky top-0 z-40 topnav'>
      <div className='max-w-6xl xl:max-w-7xl 2xl:max-w-screen-2xl 3xl:max-w-[1800px] mx-auto px-5 h-16 grid grid-cols-3 items-center'>
        {/* Left: Menu links */}
        <div className='flex items-center gap-6 text-sm md:text-base'>
          <Link
            href='/'
            className={`nav-link transition-colors ${isActive('/') ? 'active font-semibold' : ''}`}
          >
            Dashboard
          </Link>
          <Link
            href='/history'
            className={`nav-link transition-colors ${isActive('/history') ? 'active font-semibold' : ''}`}
          >
            History
          </Link>
        </div>

        {/* Center: Pig icon only */}
        <div className='flex justify-center'>
          <Link href='/' className='select-none' aria-label='Hamm Reserve Home'>
            <span aria-hidden className='text-3xl md:text-4xl'>
              🐷
            </span>
          </Link>
        </div>

        {/* Right: User avatar (hardcoded placeholder) */}
        <div className='flex justify-end'>
          <div
            className='h-10 w-10 rounded-full user-badge flex items-center justify-center text-sm font-semibold'
            title='User: Bruno Frascino'
            aria-label='User initials'
          >
            BF
          </div>
        </div>
      </div>
    </nav>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function TopNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href ? 'text-blue-600 font-semibold' : 'text-gray-700';

  return (
    <nav className='sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-gray-200'>
      <div className='max-w-6xl xl:max-w-7xl 2xl:max-w-screen-2xl 3xl:max-w-[1800px] mx-auto px-4 h-16 grid grid-cols-3 items-center'>
        {/* Left: Menu links */}
        <div className='flex items-center gap-4'>
          <Link href='/' className={`hover:text-blue-700 ${isActive('/')}`}>
            Dashboard
          </Link>
          <Link
            href='/history'
            className={`hover:text-blue-700 ${isActive('/history')}`}
          >
            History
          </Link>
        </div>

        {/* Center: Brand with pig icon and initials H.R. */}
        <div className='flex justify-center'>
          <Link href='/' className='flex items-center gap-2 select-none'>
            <span aria-hidden className='text-2xl md:text-3xl'>
              🐷
            </span>
            <span className='text-xl md:text-2xl font-bold tracking-wide'>
              H.R.
            </span>
          </Link>
        </div>

        {/* Right: App name */}
        <div className='flex justify-end text-sm md:text-base text-gray-500'>
          Hamm Reserve
        </div>
      </div>
    </nav>
  );
}

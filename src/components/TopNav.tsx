'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/api';

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const isActive = (href: string) => pathname === href;

  const initials = (() => {
    const source = currentUser?.name?.trim() || '';
    if (!source) return 'U';
    const parts = source.split(/\s+/).filter(Boolean);
    if (!parts.length) return 'U';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  })();

  const handleSignOut = async () => {
    const sensitiveCachePrefixes = ['apis', 'pages', 'pages-rsc', 'next-data'];

    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    queryClient.clear();

    if (typeof window !== 'undefined' && 'caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(cacheName =>
            sensitiveCachePrefixes.some(prefix => cacheName.startsWith(prefix))
          )
          .map(cacheName => caches.delete(cacheName))
      );
    }

    router.replace('/auth/login');
  };

  return (
    <nav className='sticky top-0 z-40 topnav'>
      <div className='max-w-6xl xl:max-w-7xl 2xl:max-w-screen-2xl 3xl:max-w-[1800px] mx-auto px-5 h-16 flex items-center justify-between gap-4'>
        {/* Left: Brand */}
        <Link
          href='/'
          className='flex items-center gap-2 select-none shrink-0'
          aria-label='Truffles Home'
        >
          <span aria-hidden className='text-2xl'>
            🍄
          </span>
          <span className='font-bold text-slate-800 text-lg tracking-tight hidden sm:inline'>
            Truffles
          </span>
        </Link>

        {/* Center: Nav links */}
        <div className='flex items-center gap-1 text-sm md:text-base'>
          <Link
            href='/'
            className={`nav-link px-3 py-2 rounded-lg transition-colors ${isActive('/') ? 'active font-semibold' : ''}`}
          >
            Dashboard
          </Link>
          <Link
            href='/history'
            className={`nav-link px-3 py-2 rounded-lg transition-colors ${isActive('/history') ? 'active font-semibold' : ''}`}
          >
            History
          </Link>
        </div>

        {/* Right: User + Sign out */}
        <div className='flex items-center gap-3 shrink-0'>
          <Link
            href='/account'
            className='h-9 w-9 rounded-full user-badge flex items-center justify-center text-xs font-semibold'
            title='Manage account'
            aria-label='Manage account'
          >
            {initials}
          </Link>
          <button
            onClick={handleSignOut}
            className='signout-btn flex items-center gap-1 text-sm px-2 py-1 rounded-lg transition-colors'
            title='Sign out'
            aria-label='Sign out'
          >
            <i className='pi pi-sign-out text-base' aria-hidden />
            <span className='hidden md:inline'>Sign out</span>
          </button>
        </div>
      </div>
    </nav>
  );
}

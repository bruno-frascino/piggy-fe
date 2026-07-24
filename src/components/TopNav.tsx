'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useCurrentUser } from '@/hooks/api';
import { apiClient } from '@/lib/api-client';
import {
  clearQueuedWrites,
  getQueuedWritesCount,
  OFFLINE_WRITE_QUEUE_CHANGED_EVENT,
  syncQueuedWritesNow,
} from '@/lib/offline-write-queue';
import { useToast } from '@/lib/toast-context';

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { show: showToast } = useToast();
  const { data: currentUser } = useCurrentUser();
  const [queuedWritesCount, setQueuedWritesCount] = useState(0);
  const [syncingNow, setSyncingNow] = useState(false);
  const isActive = (href: string) => pathname === href;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const refreshQueueCount = () => {
      setQueuedWritesCount(getQueuedWritesCount());
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshQueueCount();
      }
    };

    refreshQueueCount();

    window.addEventListener(
      OFFLINE_WRITE_QUEUE_CHANGED_EVENT,
      refreshQueueCount
    );
    window.addEventListener('online', refreshQueueCount);
    window.addEventListener('focus', refreshQueueCount);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener(
        OFFLINE_WRITE_QUEUE_CHANGED_EVENT,
        refreshQueueCount
      );
      window.removeEventListener('online', refreshQueueCount);
      window.removeEventListener('focus', refreshQueueCount);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

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
    const refreshToken = localStorage.getItem('refreshToken');

    if (refreshToken) {
      await apiClient.logout(refreshToken).catch(() => undefined);
    }

    clearQueuedWrites();
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

  const handleSyncNow = async () => {
    if (syncingNow || queuedWritesCount === 0) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      showToast({
        severity: 'warn',
        summary: 'Offline',
        detail: 'Reconnect to sync pending changes.',
        life: 4000,
      });
      return;
    }

    setSyncingNow(true);
    try {
      const { processed, remaining } = await syncQueuedWritesNow();

      if (processed > 0) {
        await queryClient.invalidateQueries({ queryKey: ['holdings'] });
        await queryClient.invalidateQueries({ queryKey: ['closed-positions'] });
        await queryClient.invalidateQueries({
          queryKey: ['portfolio-history'],
        });
        await queryClient.invalidateQueries({ queryKey: ['user-portfolio'] });
      }

      if (processed > 0) {
        showToast({
          severity: 'success',
          summary: 'Synced',
          detail: `${processed} pending change${processed === 1 ? '' : 's'} synced.`,
          life: 3500,
        });
      }

      if (remaining > 0) {
        showToast({
          severity: 'warn',
          summary: 'Sync Paused',
          detail: `${remaining} pending change${remaining === 1 ? '' : 's'} still queued.`,
          life: 4000,
        });
      }
    } catch {
      showToast({
        severity: 'error',
        summary: 'Sync failed',
        detail: 'Could not sync queued changes right now.',
        life: 4500,
      });
    } finally {
      setSyncingNow(false);
      setQueuedWritesCount(getQueuedWritesCount());
    }
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
          <Image
            src='/icons/launchericon-144x144.png'
            alt=''
            aria-hidden
            width={64}
            height={64}
            priority
          />
          <span className='font-bold text-slate-800 text-xl tracking-tight hidden sm:inline'>
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
            {queuedWritesCount > 0 && (
              <span
                className='ml-2 inline-flex min-w-5 h-5 px-1 items-center justify-center rounded-full bg-amber-100 text-amber-800 text-xs font-semibold align-middle'
                title={`${queuedWritesCount} pending sync ${queuedWritesCount === 1 ? 'change' : 'changes'}`}
                aria-label={`${queuedWritesCount} pending sync ${queuedWritesCount === 1 ? 'change' : 'changes'}`}
              >
                {queuedWritesCount}
              </span>
            )}
          </Link>
          <Link
            href='/reports'
            className={`nav-link px-3 py-2 rounded-lg transition-colors ${isActive('/reports') ? 'active font-semibold' : ''}`}
          >
            Reports
          </Link>
          {queuedWritesCount > 0 && (
            <button
              type='button'
              onClick={handleSyncNow}
              disabled={syncingNow}
              className='nav-link px-3 py-2 rounded-lg transition-colors text-amber-700 disabled:opacity-50'
              title='Sync pending offline changes now'
              aria-label='Sync pending offline changes now'
            >
              {syncingNow ? 'Syncing...' : 'Sync now'}
            </button>
          )}
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

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/', label: 'Dashboard', icon: 'pi-home' },
  { href: '/history', label: 'History', icon: 'pi-clock' },
  { href: '/reports', label: 'Reports', icon: 'pi-file-pdf' },
  { href: '/account', label: 'Account', icon: 'pi-user' },
] as const;

/**
 * Bottom-fixed primary navigation shown only below the `md` breakpoint —
 * thumb-reachable navigation is a standard mobile/PWA UX pattern. Mirrors the
 * same routes as the desktop TopNav; hidden on /auth/* by the same gate
 * (TopNavGate) that hides TopNav.
 */
export default function MobileTabBar() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname?.startsWith(href);

  return (
    <nav className='mobile-tab-bar md:hidden' aria-label='Primary'>
      {TABS.map(tab => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`mobile-tab-bar-link ${isActive(tab.href) ? 'active' : ''}`}
          aria-current={isActive(tab.href) ? 'page' : undefined}
        >
          <i className={`pi ${tab.icon}`} aria-hidden />
          <span>{tab.label}</span>
        </Link>
      ))}
    </nav>
  );
}

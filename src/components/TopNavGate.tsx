'use client';

import { usePathname } from 'next/navigation';
import TopNav from '@/components/TopNav';
import MobileTabBar from '@/components/MobileTabBar';

export default function TopNavGate() {
  const pathname = usePathname();
  const hideOnAuth = pathname?.startsWith('/auth');
  if (hideOnAuth) return null;
  return (
    <>
      <TopNav />
      <MobileTabBar />
    </>
  );
}

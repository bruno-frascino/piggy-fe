import { Suspense } from 'react';
import DashboardView from '@/components/DashboardView';

function DashboardFallback() {
  return <div>Loading...</div>;
}

export default function HomePage() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <DashboardView />
    </Suspense>
  );
}

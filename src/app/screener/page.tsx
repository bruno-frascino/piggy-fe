import { Suspense } from 'react';
import ScreenerView from '@/components/ScreenerView';

function ScreenerFallback() {
  return <div>Loading...</div>;
}

export default function ScreenerPage() {
  return (
    <Suspense fallback={<ScreenerFallback />}>
      <ScreenerView />
    </Suspense>
  );
}

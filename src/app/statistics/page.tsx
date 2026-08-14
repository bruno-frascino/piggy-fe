import { Suspense } from 'react';
import StatisticsView from '@/components/StatisticsView';

function StatisticsFallback() {
  return <div>Loading...</div>;
}

export default function StatisticsPage() {
  return (
    <Suspense fallback={<StatisticsFallback />}>
      <StatisticsView />
    </Suspense>
  );
}

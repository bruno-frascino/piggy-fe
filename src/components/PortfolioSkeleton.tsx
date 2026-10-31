import { Card } from 'primereact/card';
import { Skeleton } from 'primereact/skeleton';

export default function PortfolioSkeleton() {
  return (
    <div
      className='portfolio-workspace mx-auto px-4 py-5 space-y-4'
      role='status'
      aria-label='Loading portfolio'
      aria-busy='true'
    >
      <span className='sr-only'>Loading portfolio…</span>
      <div aria-hidden='true' className='space-y-4'>
        <Skeleton width='12rem' height='2rem' />
        <Skeleton width='8rem' height='2.75rem' />
        <div className='portfolio-metrics'>
          {[0, 1, 2].map(key => (
            <Card key={key}>
              <Skeleton height='4rem' />
            </Card>
          ))}
        </div>
        <Card>
          <Skeleton height='16rem' />
        </Card>
        <Card>
          <Skeleton height='8rem' />
        </Card>
      </div>
    </div>
  );
}

'use client';

import { Card } from 'primereact/card';
import { Button } from 'primereact/button';

export default function Dashboard() {
  return (
    <div className='container mx-auto p-6'>
      <h1 className='text-3xl font-bold text-gray-900 mb-8'>
        Welcome to Piggy Finance 🐷
      </h1>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'>
        <Card className='text-center'>
          <h3 className='text-lg font-semibold text-gray-700'>Total Balance</h3>
          <p className='text-2xl font-bold text-green-600'>$12,345.67</p>
        </Card>

        <Card className='text-center'>
          <h3 className='text-lg font-semibold text-gray-700'>This Month</h3>
          <p className='text-2xl font-bold text-blue-600'>$2,456.78</p>
        </Card>

        <Card className='text-center'>
          <h3 className='text-lg font-semibold text-gray-700'>Expenses</h3>
          <p className='text-2xl font-bold text-red-600'>$1,234.56</p>
        </Card>

        <Card className='text-center'>
          <h3 className='text-lg font-semibold text-gray-700'>Savings</h3>
          <p className='text-2xl font-bold text-purple-600'>$3,456.78</p>
        </Card>
      </div>

      <div className='flex gap-4'>
        <Button label='Add Transaction' icon='pi pi-plus' />
        <Button
          label='View Reports'
          icon='pi pi-chart-line'
          severity='secondary'
        />
      </div>
    </div>
  );
}

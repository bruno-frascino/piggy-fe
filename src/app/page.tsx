'use client';

import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { ProgressSpinner } from 'primereact/progressspinner';
import { useBalance } from '@/hooks/api';

export default function Dashboard() {
  const { data: balance, isLoading, error } = useBalance();

  if (isLoading) {
    return (
      <div className='flex justify-center items-center min-h-screen'>
        <ProgressSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className='container mx-auto p-6'>
        <div className='bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded'>
          <strong>Error:</strong> Unable to load balance data. Using mock data
          for now.
        </div>
      </div>
    );
  }

  // Use real data if available, otherwise fall back to mock data
  const balanceData = balance || {
    total: 12345.67,
    thisMonth: 2456.78,
    expenses: 1234.56,
    savings: 3456.78,
  };

  return (
    <div className='container mx-auto p-6'>
      <h1 className='text-3xl font-bold text-gray-900 mb-8'>
        Welcome to Hamm Reserve 🐷
      </h1>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'>
        <Card className='text-center'>
          <h3 className='text-lg font-semibold text-gray-700'>Total Balance</h3>
          <p className='text-2xl font-bold text-green-600'>
            ${balanceData.total.toLocaleString()}
          </p>
        </Card>

        <Card className='text-center'>
          <h3 className='text-lg font-semibold text-gray-700'>This Month</h3>
          <p className='text-2xl font-bold text-blue-600'>
            ${balanceData.thisMonth.toLocaleString()}
          </p>
        </Card>

        <Card className='text-center'>
          <h3 className='text-lg font-semibold text-gray-700'>Expenses</h3>
          <p className='text-2xl font-bold text-red-600'>
            ${balanceData.expenses.toLocaleString()}
          </p>
        </Card>

        <Card className='text-center'>
          <h3 className='text-lg font-semibold text-gray-700'>Savings</h3>
          <p className='text-2xl font-bold text-purple-600'>
            ${balanceData.savings.toLocaleString()}
          </p>
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

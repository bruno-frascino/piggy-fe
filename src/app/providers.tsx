'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { PrimeReactProvider } from 'primereact/api';
import { ToastProvider } from '@/lib/toast-context';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 2,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <PrimeReactProvider>
        <ToastProvider>{children}</ToastProvider>
      </PrimeReactProvider>
    </QueryClientProvider>
  );
}

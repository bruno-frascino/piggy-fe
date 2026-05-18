'use client';

import { createContext, useContext, useRef } from 'react';
import { Toast } from 'primereact/toast';
import type { ToastMessage } from 'primereact/toast';

interface ToastContextValue {
  show: (message: ToastMessage) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const toastRef = useRef<Toast>(null);

  function show(message: ToastMessage) {
    toastRef.current?.show(message);
  }

  return (
    <ToastContext.Provider value={{ show }}>
      <Toast ref={toastRef} />
      {children}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

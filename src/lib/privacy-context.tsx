'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { MASKED_VALUE } from '@/lib/format';

interface PrivacyContextValue {
  hidden: boolean;
  toggle: () => void;
  hide: () => void;
  mask: (value: string) => string;
}

const PrivacyContext = createContext<PrivacyContextValue | null>(null);

// Not persisted on purpose — every fresh app load starts with figures hidden.
export function PrivacyProvider({
  children,
  initialHidden = true,
}: {
  children: React.ReactNode;
  initialHidden?: boolean;
}) {
  const [hidden, setHidden] = useState(initialHidden);

  const toggle = useCallback(() => setHidden(v => !v), []);
  const hide = useCallback(() => setHidden(true), []);
  const mask = useCallback(
    (value: string) => (hidden ? MASKED_VALUE : value),
    [hidden]
  );

  const value = useMemo(
    () => ({ hidden, toggle, hide, mask }),
    [hidden, toggle, hide, mask]
  );

  return (
    <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>
  );
}

export function usePrivacy(): PrivacyContextValue {
  const ctx = useContext(PrivacyContext);
  if (!ctx) {
    throw new Error('usePrivacy must be used within a PrivacyProvider');
  }
  return ctx;
}

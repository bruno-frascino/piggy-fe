'use client';

import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

/**
 * Shared page header used across Dashboard/History/Reports for a consistent
 * title + optional subtitle + right-aligned primary action.
 */
export default function PageHeader({
  title,
  subtitle,
  action,
}: PageHeaderProps) {
  return (
    <div className='flex items-start justify-between gap-4 mb-6 flex-wrap'>
      <div>
        <h1 className='text-2xl font-bold' style={{ color: 'var(--tr-text)' }}>
          {title}
        </h1>
        {subtitle && (
          <p className='text-sm mt-1' style={{ color: 'var(--tr-text-2)' }}>
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className='shrink-0'>{action}</div>}
    </div>
  );
}

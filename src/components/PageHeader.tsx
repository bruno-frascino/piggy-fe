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
    <header className='page-header'>
      <div className='min-w-0'>
        <h1 className='portfolio-heading'>{title}</h1>
        {subtitle && (
          <p className='text-sm mt-1' style={{ color: 'var(--tr-text-2)' }}>
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className='page-header-actions'>{action}</div>}
    </header>
  );
}

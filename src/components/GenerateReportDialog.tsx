'use client';

import { useEffect, useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import type { TaxReport } from '@/lib/types';
import { useTradingAccounts, useGenerateTaxReport } from '@/hooks/api';
import { useToast } from '@/lib/toast-context';

function getCurrentFinancialYearStart(now: Date): number {
  // Australian financial year starts 1 July.
  return now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
}

function fyLabel(startYear: number): string {
  return `FY${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
}

interface Props {
  visible: boolean;
  onHide: () => void;
  onGenerated?: (report: TaxReport) => void;
}

export default function GenerateReportDialog({
  visible,
  onHide,
  onGenerated,
}: Props) {
  const { data: accounts = [] } = useTradingAccounts(true);
  const generateReport = useGenerateTaxReport();
  const { show: showToast } = useToast();

  const mostRecentCompletedFy = getCurrentFinancialYearStart(new Date()) - 1;
  const fyOptions = Array.from({ length: 6 }, (_, i) => {
    const startYear = mostRecentCompletedFy - i;
    return { label: fyLabel(startYear), value: startYear };
  });

  const [financialYearStartYear, setFinancialYearStartYear] = useState(
    mostRecentCompletedFy
  );
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setFinancialYearStartYear(mostRecentCompletedFy);
      setSelectedAccountIds([]);
      setError('');
    }
  }, [visible, mostRecentCompletedFy]);

  const handleGenerate = async () => {
    if (selectedAccountIds.length === 0) {
      setError('Select at least one account to include in this report.');
      return;
    }
    setError('');
    try {
      const report = await generateReport.mutateAsync({
        financialYearStartYear,
        accountIds: selectedAccountIds,
      });
      showToast({
        severity: 'success',
        summary: 'Report generated',
        detail: `${report.financialYearLabel} capital gains report is ready.`,
        life: 3500,
      });
      onGenerated?.(report);
      onHide();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(
        e.response?.data?.message ||
          'Could not generate the report. Please try again.'
      );
    }
  };

  return (
    <Dialog
      header='Generate Capital Gains Report'
      visible={visible}
      modal
      style={{ width: '560px', maxWidth: '95vw' }}
      closable={!generateReport.isPending}
      closeOnEscape={!generateReport.isPending}
      onHide={() => {
        if (!generateReport.isPending) onHide();
      }}
    >
      <div className='space-y-4'>
        <p className='text-sm' style={{ color: 'var(--tr-text-2)' }}>
          Select the financial year and the accounts to include in this
          declaration (e.g. your own accounts, or a spouse&apos;s accounts
          tracked separately).
        </p>

        <div>
          <label
            className='block text-sm font-medium mb-1'
            style={{ color: 'var(--tr-text-2)' }}
          >
            Financial year
          </label>
          <Dropdown
            value={financialYearStartYear}
            options={fyOptions}
            onChange={e => setFinancialYearStartYear(e.value)}
            className='w-full'
            disabled={generateReport.isPending}
          />
        </div>

        <div>
          <label
            className='block text-sm font-medium mb-1'
            style={{ color: 'var(--tr-text-2)' }}
          >
            Accounts to include
          </label>
          <MultiSelect
            value={selectedAccountIds}
            options={accounts.map(a => ({ label: a.name, value: a.id }))}
            onChange={e => setSelectedAccountIds(e.value)}
            placeholder='Select accounts'
            display='chip'
            className='w-full'
            disabled={generateReport.isPending}
          />
        </div>

        {error && <Message severity='error' text={error} />}

        <Message
          severity='warn'
          text='This report is generated automatically and is not professional tax advice. Verify all figures with a registered tax agent before lodging.'
        />

        <div className='flex justify-end gap-2 pt-1'>
          <Button
            type='button'
            label='Cancel'
            severity='secondary'
            outlined
            onClick={onHide}
            disabled={generateReport.isPending}
          />
          <Button
            type='button'
            label='Generate'
            icon='pi pi-file-pdf'
            onClick={handleGenerate}
            loading={generateReport.isPending}
          />
        </div>
      </div>
    </Dialog>
  );
}

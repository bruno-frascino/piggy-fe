'use client';

import { Dialog } from 'primereact/dialog';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Message } from 'primereact/message';
import { useTaxReportDetail } from '@/hooks/api';
import type { TaxReportLineItem } from '@/lib/types';

function formatAud(n: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(n);
}

interface Props {
  reportId: string | null;
  onHide: () => void;
}

export default function ReportDetailDialog({ reportId, onHide }: Props) {
  const { data: report, isLoading } = useTaxReportDetail(reportId ?? undefined);

  return (
    <Dialog
      header={
        report ? `${report.financialYearLabel} — Detail` : 'Report Detail'
      }
      visible={!!reportId}
      modal
      style={{ width: '900px', maxWidth: '95vw' }}
      onHide={onHide}
    >
      {isLoading && (
        <div
          className='flex items-center gap-2 text-sm'
          style={{ color: 'var(--tr-text-2)' }}
        >
          <i className='pi pi-spin pi-spinner' /> Loading report...
        </div>
      )}

      {report && (
        <div className='space-y-4'>
          <Message
            severity='warn'
            text='This report is generated automatically and is not professional tax advice. Verify all figures with a registered tax agent before lodging.'
          />

          <div className='grid grid-cols-2 md:grid-cols-4 gap-3 text-sm'>
            <SummaryStat
              label='Total proceeds'
              value={formatAud(report.totalProceedsAud)}
            />
            <SummaryStat
              label='Total cost base'
              value={formatAud(report.totalCostBaseAud)}
            />
            <SummaryStat
              label='Gross capital gain'
              value={formatAud(report.totalCapitalGainGrossAud)}
            />
            <SummaryStat
              label='Capital losses'
              value={formatAud(report.totalCapitalLossAud)}
            />
            <SummaryStat
              label='Carried-forward loss (opening)'
              value={formatAud(report.carriedForwardLossOpeningAud)}
            />
            <SummaryStat
              label='CGT discount applied'
              value={formatAud(report.discountAppliedAud)}
            />
            <SummaryStat
              label='Net capital gain / (loss)'
              value={formatAud(report.netCapitalGainAud)}
              highlight
            />
            <SummaryStat
              label='Carried-forward loss (closing)'
              value={formatAud(report.carriedForwardLossClosingAud)}
            />
          </div>

          <DataTable
            value={report.lineItems ?? []}
            size='small'
            scrollable
            scrollHeight='320px'
            stripedRows
          >
            <Column field='symbol' header='Symbol' />
            <Column field='accountName' header='Account' />
            <Column field='acquireDate' header='Acquired' />
            <Column field='disposeDate' header='Disposed' />
            <Column field='quantity' header='Qty' />
            <Column
              header='Proceeds (AUD)'
              body={(l: TaxReportLineItem) => formatAud(l.proceedsAud)}
            />
            <Column
              header='Cost base (AUD)'
              body={(l: TaxReportLineItem) => formatAud(l.costBaseAud)}
            />
            <Column
              header='Gain/(Loss)'
              body={(l: TaxReportLineItem) => (
                <span
                  className={
                    l.capitalGainAud >= 0 ? 'text-green-600' : 'text-red-600'
                  }
                >
                  {formatAud(l.capitalGainAud)}
                </span>
              )}
            />
            <Column
              header='Discount'
              body={(l: TaxReportLineItem) =>
                l.discountEligible ? 'Yes' : 'No'
              }
            />
          </DataTable>
        </div>
      )}
    </Dialog>
  );
}

function SummaryStat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className='p-3 rounded-xl'
      style={{
        background: 'var(--tr-surface-2)',
        border: '1px solid var(--tr-border)',
      }}
    >
      <div className='text-xs' style={{ color: 'var(--tr-text-2)' }}>
        {label}
      </div>
      <div
        className={`font-semibold ${highlight ? 'text-base' : 'text-sm'}`}
        style={{ color: 'var(--tr-text)' }}
      >
        {value}
      </div>
    </div>
  );
}

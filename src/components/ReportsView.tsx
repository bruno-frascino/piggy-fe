'use client';

import { useState } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { useTaxReports, useTradingAccounts } from '@/hooks/api';
import { apiClient } from '@/lib/api-client';
import PageHeader from '@/components/PageHeader';
import GenerateReportDialog from '@/components/GenerateReportDialog';
import ReportDetailDialog from '@/components/ReportDetailDialog';
import { useToast } from '@/lib/toast-context';
import type { TaxReport } from '@/lib/types';

function formatAud(n: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(n);
}

export default function ReportsView() {
  const { data: reports = [], isLoading } = useTaxReports();
  const { data: accounts = [] } = useTradingAccounts(true);
  const { show: showToast } = useToast();
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [detailReportId, setDetailReportId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const accountName = (id: string) =>
    accounts.find(a => a.id === id)?.name ?? id;

  const handleDownload = async (report: TaxReport) => {
    setDownloadingId(report.id);
    try {
      const blob = await apiClient.downloadTaxReportPdf(report.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `capital-gains-${report.financialYearLabel}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast({
        severity: 'error',
        summary: 'Download failed',
        detail: 'Could not download the PDF. Please try again.',
        life: 4000,
      });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className='min-h-screen bg-[--tr-bg] p-4'>
      <div className='max-w-6xl xl:max-w-7xl 2xl:max-w-screen-2xl 3xl:max-w-[1800px] mx-auto space-y-6'>
        <PageHeader
          title='Tax Reports'
          subtitle='ATO capital gains summaries, generated per financial year and account selection'
          action={
            !isLoading && reports.length === 0 ? undefined : (
              <Button
                label='Generate report'
                icon='pi pi-plus'
                onClick={() => setShowGenerateDialog(true)}
              />
            )
          }
        />

        {isLoading && (
          <div
            className='flex items-center gap-2 text-sm'
            style={{ color: 'var(--tr-text-2)' }}
          >
            <i className='pi pi-spin pi-spinner' /> Loading reports...
          </div>
        )}

        {!isLoading && reports.length === 0 && (
          <Card>
            <div className='flex flex-col items-center justify-center py-10 gap-3 text-center'>
              <i
                className='pi pi-file-pdf text-4xl'
                style={{ color: 'var(--tr-text-3)' }}
              />
              <p style={{ color: 'var(--tr-text-2)' }}>
                No tax reports generated yet.
              </p>
              <Button
                label='Generate your first report'
                icon='pi pi-plus'
                onClick={() => setShowGenerateDialog(true)}
              />
            </div>
          </Card>
        )}

        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          {reports.map(report => (
            <Card key={report.id}>
              <div className='flex items-start justify-between gap-3 mb-2'>
                <div>
                  <h3
                    className='text-lg font-semibold'
                    style={{ color: 'var(--tr-text)' }}
                  >
                    {report.financialYearLabel}
                  </h3>
                  <div className='flex flex-wrap gap-1 mt-1'>
                    {report.accountIds.map(id => (
                      <span
                        key={id}
                        className='text-xs px-2 py-0.5 rounded-full'
                        style={{
                          background: 'var(--tr-brand-bg)',
                          color: 'var(--tr-brand)',
                        }}
                      >
                        {accountName(id)}
                      </span>
                    ))}
                  </div>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    report.netCapitalGainAud >= 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {formatAud(report.netCapitalGainAud)}
                </span>
              </div>

              <p className='text-xs mb-3' style={{ color: 'var(--tr-text-2)' }}>
                Generated{' '}
                {new Date(report.generatedAt).toLocaleDateString('en-AU')}
                {report.discountAppliedAud > 0 &&
                  ` · ${formatAud(report.discountAppliedAud)} discount applied`}
                {report.carriedForwardLossClosingAud > 0 &&
                  ` · ${formatAud(report.carriedForwardLossClosingAud)} loss carried forward`}
              </p>

              <div className='flex gap-2'>
                <Button
                  label='View'
                  icon='pi pi-eye'
                  severity='secondary'
                  outlined
                  size='small'
                  onClick={() => setDetailReportId(report.id)}
                />
                <Button
                  label='Download PDF'
                  icon='pi pi-download'
                  size='small'
                  loading={downloadingId === report.id}
                  onClick={() => handleDownload(report)}
                />
              </div>
            </Card>
          ))}
        </div>

        <GenerateReportDialog
          visible={showGenerateDialog}
          onHide={() => setShowGenerateDialog(false)}
        />
        <ReportDetailDialog
          reportId={detailReportId}
          onHide={() => setDetailReportId(null)}
        />
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { CLOSE_REASON_OPTIONS } from '@/lib/close-reason';
import { formatDateDDMMYYYY } from '@/lib/date';
import {
  initialAllocationInput,
  remainingToAllocate,
  toAllocationPayload,
  validateAllocation,
  type AllocationInput,
} from '@/lib/import-allocation';
import type {
  ImportEventResolution,
  ImportPlanIssue,
  ImportPlannedSell,
} from '@/lib/types';

interface ImportSellAllocationProps {
  sell: ImportPlannedSell;
  issues: ImportPlanIssue[];
  busy: boolean;
  readOnly?: boolean;
  onResolve: (resolution: ImportEventResolution) => void;
}

const NO_REASON = '__none__';

export default function ImportSellAllocation({
  sell,
  issues,
  busy,
  readOnly = false,
  onResolve,
}: ImportSellAllocationProps) {
  const [input, setInput] = useState<AllocationInput>(() =>
    initialAllocationInput(sell)
  );
  const [open, setOpen] = useState(false);

  const remaining = remainingToAllocate(sell, input);
  const error = validateAllocation(sell, input);
  const blocking = issues.filter(i => i.blocking);
  const closeReasonValue = sell.closeReason ?? NO_REASON;

  return (
    <div
      className='border rounded p-3 mb-3'
      style={{ borderColor: 'var(--tr-border, #e5e7eb)' }}
      data-testid={`sell-${sell.eventId}`}
    >
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div>
          <div className='font-semibold'>
            Sell {sell.quantity} {sell.baseAsset} ·{' '}
            {formatDateDDMMYYYY(sell.sellDate.slice(0, 10))}
          </div>
          <div className='text-xs' style={{ color: 'var(--tr-text-2)' }}>
            {sell.orderType ?? 'order'} · {sell.quoteCurrency} ·{' '}
            {sell.userOverridden ? 'your allocation' : 'FIFO suggestion'}
          </div>
        </div>
        {!readOnly && (
          <div className='responsive-actions'>
            <Dropdown
              value={closeReasonValue}
              aria-label='Close reason'
              options={[
                { label: 'No reason', value: NO_REASON },
                ...CLOSE_REASON_OPTIONS,
              ]}
              disabled={busy}
              onChange={e =>
                onResolve({
                  closeReason: e.value === NO_REASON ? null : e.value,
                })
              }
            />
            <Button
              label='Skip sale'
              size='small'
              severity='secondary'
              outlined
              disabled={busy}
              onClick={() => onResolve({ skip: true })}
            />
          </div>
        )}
      </div>

      {blocking.map(issue => (
        <div
          key={`${issue.type}-${issue.eventId}`}
          role='alert'
          className='mt-2 text-sm text-red-600'
        >
          {issue.message}
        </div>
      ))}
      {issues
        .filter(i => !i.blocking)
        .map(issue => (
          <div
            key={`${issue.type}-${issue.eventId}`}
            className='mt-2 text-sm text-amber-700'
          >
            {issue.message}
          </div>
        ))}

      {sell.resolved && (
        <ul className='mt-2 text-sm'>
          {sell.allocations.map(a => (
            <li key={a.positionRef}>
              {a.quantity} from parcel{' '}
              <span className='font-mono'>{a.positionRef.slice(-8)}</span>
            </li>
          ))}
        </ul>
      )}

      {!readOnly && sell.eligible.length > 0 && (
        <div className='mt-2'>
          <Button
            label={open ? 'Hide parcels' : 'Choose parcels'}
            size='small'
            text
            onClick={() => setOpen(o => !o)}
          />
          {open && (
            <div>
              <div className='table-region'>
                <table className='data-grid text-sm w-full'>
                  <thead>
                    <tr className='text-left'>
                      <th>Acquired</th>
                      <th>Available</th>
                      <th>Sell from this parcel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sell.eligible.map(parcel => (
                      <tr key={parcel.positionRef}>
                        <td>
                          {formatDateDDMMYYYY(parcel.acquiredAt.slice(0, 10))}
                        </td>
                        <td>{parcel.remaining}</td>
                        <td>
                          <input
                            className='border rounded px-2 py-1 w-40'
                            inputMode='decimal'
                            aria-label={`Quantity from parcel acquired ${formatDateDDMMYYYY(parcel.acquiredAt.slice(0, 10))}`}
                            value={input[parcel.positionRef] ?? ''}
                            onChange={e =>
                              setInput(prev => ({
                                ...prev,
                                [parcel.positionRef]: e.target.value,
                              }))
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div
                className='mt-2 text-sm'
                data-testid='remaining-to-allocate'
                style={{
                  color:
                    Math.abs(remaining) < 1e-9
                      ? 'inherit'
                      : 'var(--tr-warning)',
                }}
              >
                Remaining to allocate: {Number(remaining.toFixed(12))}{' '}
                {sell.baseAsset}
              </div>
              <div className='mt-2 responsive-actions'>
                <Button
                  label='Save allocation'
                  size='small'
                  disabled={busy || error !== null}
                  onClick={() =>
                    onResolve({ allocations: toAllocationPayload(input) })
                  }
                />
                <Button
                  label='Reset to FIFO'
                  size='small'
                  severity='secondary'
                  outlined
                  disabled={busy}
                  onClick={() => {
                    onResolve({ allocations: null });
                    setInput({});
                    setOpen(false);
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

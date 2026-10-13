import type { CloseReason } from '@/lib/types';

export const CLOSE_REASON_OPTIONS: { label: string; value: CloseReason }[] = [
  { label: 'Manual', value: 'MANUAL' },
  { label: 'Stop loss', value: 'STOP_LOSS' },
  { label: 'Target', value: 'TARGET' },
  { label: 'Other', value: 'OTHER' },
];

// Returns are fractions (0.01 = 1%); |return| within this band counts as break-even.
export const BREAK_EVEN_TOLERANCE = 0.001;

export type CloseOutcome = 'GAIN' | 'LOSS' | 'BREAK_EVEN';

// Outcome is derived from realised return rather than stored, so it can't go
// stale when the sell price or fees are edited later.
export function closeOutcome(returnFraction: number): CloseOutcome {
  if (returnFraction > BREAK_EVEN_TOLERANCE) return 'GAIN';
  if (returnFraction < -BREAK_EVEN_TOLERANCE) return 'LOSS';
  return 'BREAK_EVEN';
}

const OUTCOME_LABELS: Record<CloseOutcome, string> = {
  GAIN: 'gain',
  LOSS: 'loss',
  BREAK_EVEN: 'break-even',
};

export function closeReasonLabel(
  reason: CloseReason | undefined,
  returnFraction: number
): string {
  if (!reason) return '—';
  const base =
    CLOSE_REASON_OPTIONS.find(o => o.value === reason)?.label ?? reason;
  return reason === 'STOP_LOSS'
    ? `${base} (${OUTCOME_LABELS[closeOutcome(returnFraction)]})`
    : base;
}

import { describe, expect, it } from 'vitest';
import { closeOutcome, closeReasonLabel } from './close-reason';

describe('closeOutcome', () => {
  it('classifies gain, loss and break-even with a 0.1% tolerance', () => {
    expect(closeOutcome(0.05)).toBe('GAIN');
    expect(closeOutcome(-0.05)).toBe('LOSS');
    expect(closeOutcome(0)).toBe('BREAK_EVEN');
    expect(closeOutcome(0.001)).toBe('BREAK_EVEN');
    expect(closeOutcome(-0.001)).toBe('BREAK_EVEN');
  });
});

describe('closeReasonLabel', () => {
  it('shows a dash when the reason is unknown', () => {
    expect(closeReasonLabel(undefined, 0.2)).toBe('—');
  });

  it('appends the derived outcome only for stop-loss closures', () => {
    expect(closeReasonLabel('STOP_LOSS', -0.08)).toBe('Stop loss (loss)');
    expect(closeReasonLabel('STOP_LOSS', 0.02)).toBe('Stop loss (gain)');
    expect(closeReasonLabel('STOP_LOSS', 0)).toBe('Stop loss (break-even)');
    expect(closeReasonLabel('MANUAL', -0.08)).toBe('Manual');
    expect(closeReasonLabel('TARGET', 0.3)).toBe('Target');
  });
});

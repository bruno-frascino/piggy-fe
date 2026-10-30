import type { ImportPlannedSell } from '@/lib/types';

const TOLERANCE = 1e-9;

export type AllocationInput = Record<string, string>;

function toNumber(value: string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Initial editor state: the plan's current allocation per parcel. */
export function initialAllocationInput(
  sell: ImportPlannedSell
): AllocationInput {
  return Object.fromEntries(
    sell.allocations.map(a => [a.positionRef, a.quantity])
  );
}

export function allocatedTotal(input: AllocationInput): number {
  return Object.values(input).reduce((sum, v) => sum + toNumber(v), 0);
}

export function remainingToAllocate(
  sell: ImportPlannedSell,
  input: AllocationInput
): number {
  return toNumber(sell.quantity) - allocatedTotal(input);
}

export type AllocationError =
  | { kind: 'exceeds'; positionRef: string }
  | { kind: 'negative'; positionRef: string }
  | { kind: 'not-complete'; remaining: number };

/** Returns null when the input is a valid, complete allocation of the sell. */
export function validateAllocation(
  sell: ImportPlannedSell,
  input: AllocationInput
): AllocationError | null {
  for (const [positionRef, value] of Object.entries(input)) {
    const qty = toNumber(value);
    if (qty < 0) return { kind: 'negative', positionRef };
    const eligible = sell.eligible.find(e => e.positionRef === positionRef);
    if (
      qty > 0 &&
      (!eligible || qty > toNumber(eligible.remaining) + TOLERANCE)
    ) {
      return { kind: 'exceeds', positionRef };
    }
  }
  const remaining = remainingToAllocate(sell, input);
  if (Math.abs(remaining) > TOLERANCE)
    return { kind: 'not-complete', remaining };
  return null;
}

/** Payload for PATCH: only parcels with a positive quantity. */
export function toAllocationPayload(input: AllocationInput) {
  return Object.entries(input)
    .filter(([, value]) => toNumber(value) > 0)
    .map(([positionRef, quantity]) => ({ positionRef, quantity }));
}

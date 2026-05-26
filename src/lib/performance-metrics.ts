const DAYS_PER_WEEK = 7;

export function calculateGainLossPerWeek(
  gainLoss: number,
  daysOpen: number
): number | null {
  if (
    !Number.isFinite(gainLoss) ||
    !Number.isFinite(daysOpen) ||
    daysOpen <= 0
  ) {
    return null;
  }

  return gainLoss / (daysOpen / DAYS_PER_WEEK);
}

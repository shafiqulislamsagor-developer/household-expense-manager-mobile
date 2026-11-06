/**
 * Utility helper to determine if a transaction's date belongs to an already closed financial month.
 */
export function isTransactionMonthClosed(
  dateStr: string | undefined | null,
  closedMonths: Array<{ year: number; month: number }>
): boolean {
  if (!dateStr || !closedMonths || closedMonths.length === 0) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  return closedMonths.some((cm) => cm.year === y && cm.month === m);
}


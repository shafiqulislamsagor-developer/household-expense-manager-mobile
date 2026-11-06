import { isTransactionMonthClosed } from './closedMonth';

describe('closedMonth helper', () => {
  const closedMonths = [
    { year: 2026, month: 9 },
    { year: 2026, month: 10 },
  ];

  test('returns true for dates in closed months', () => {
    expect(isTransactionMonthClosed('2026-10-15T12:00:00.000Z', closedMonths)).toBe(true);
    expect(isTransactionMonthClosed('2026-09-01T00:00:00.000Z', closedMonths)).toBe(true);
  });

  test('returns false for dates in active/unclosed months', () => {
    expect(isTransactionMonthClosed('2026-11-05T12:00:00.000Z', closedMonths)).toBe(false);
    expect(isTransactionMonthClosed('2026-08-15T12:00:00.000Z', closedMonths)).toBe(false);
    expect(isTransactionMonthClosed('2025-10-15T12:00:00.000Z', closedMonths)).toBe(false);
  });

  test('returns false for empty or invalid dates/lists', () => {
    expect(isTransactionMonthClosed(null, closedMonths)).toBe(false);
    expect(isTransactionMonthClosed(undefined, closedMonths)).toBe(false);
    expect(isTransactionMonthClosed('invalid-date', closedMonths)).toBe(false);
    expect(isTransactionMonthClosed('2026-10-15', [])).toBe(false);
  });
});


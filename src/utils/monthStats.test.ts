import { parseYearMonth, getBengaliMonthLabel, buildMonthlySummaries } from './monthStats';

describe('monthStats utils', () => {
  it('parses YYYY-MM correctly from various date strings', () => {
    expect(parseYearMonth('2026-11-05T12:00:00Z')).toEqual({
      year: 2026,
      month: 11,
      key: '2026-11',
    });
    expect(parseYearMonth('2026-05-15')).toEqual({
      year: 2026,
      month: 5,
      key: '2026-05',
    });
  });

  it('generates Bengali month labels properly', () => {
    expect(getBengaliMonthLabel(2026, 11)).toBe('নভেম্বর ২০২৬');
    expect(getBengaliMonthLabel(2026, 1)).toBe('জানুয়ারি ২০২৬');
  });

  it('aggregates personal and household finances by month accurately', () => {
    const summaries = buildMonthlySummaries({
      currentUserId: 'user-1',
      personalIncomes: [
        {
          _id: 'inc-1',
          userId: 'user-1',
          amountPaisa: 5000000, // 50,000 taka
          source: 'বেতন',
          date: '2026-11-01T00:00:00Z',
        },
      ],
      personalExpenses: [
        {
          _id: 'exp-1',
          userId: 'user-1',
          amountPaisa: 2000000, // 20,000 taka
          title: 'ব্যক্তিগত কেনাকাটা',
          date: '2026-11-02T00:00:00Z',
        },
      ],
      householdExpenses: [
        {
          _id: 'hexp-1',
          householdId: 'h-1',
          paidByUserId: 'user-1',
          paidFromFund: false,
          amountPaisa: 1500000, // 15,000 taka
          title: 'বাজার খরচ',
          date: '2026-11-03T00:00:00Z',
          splitType: 'EQUAL',
          splits: [],
          approvalStatus: 'APPROVED',
        },
        {
          _id: 'hexp-2',
          householdId: 'h-1',
          paidByUserId: null,
          paidFromFund: true,
          amountPaisa: 500000, // 5,000 taka
          title: 'বিদ্যুৎ বিল',
          date: '2026-11-04T00:00:00Z',
          splitType: 'EQUAL',
          splits: [],
          approvalStatus: 'APPROVED',
        },
      ],
      contributions: [
        {
          _id: 'c-1',
          householdId: 'h-1',
          userId: 'user-1',
          amountPaisa: 1000000, // 10,000 taka
          date: '2026-11-01T00:00:00Z',
          paymentMethod: 'CASH',
          status: 'VERIFIED',
        },
      ],
      closedMonths: [{ year: 2026, month: 10 }],
    });

    const nov = summaries.find((s) => s.key === '2026-11');
    expect(nov).toBeDefined();
    expect(nov!.personalIncomePaisa).toBe(5000000);
    expect(nov!.personalExpensePaisa).toBe(2000000);
    expect(nov!.personalSavingsPaisa).toBe(3000000);
    expect(nov!.personalSavingsRate).toBe(60);
    expect(nov!.householdExpensePaisa).toBe(2000000); // 15k + 5k
    expect(nov!.householdFromFundPaisa).toBe(500000);
    expect(nov!.householdFromMembersPaisa).toBe(1500000);
    expect(nov!.myHouseholdPaidPaisa).toBe(1500000);
    expect(nov!.householdContributionsPaisa).toBe(1000000);
    expect(nov!.isClosed).toBe(false);

    const oct = summaries.find((s) => s.key === '2026-10');
    expect(oct).toBeDefined();
    expect(oct!.isClosed).toBe(true);
  });
});

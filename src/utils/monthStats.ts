import { PersonalIncome, PersonalExpense, HouseholdExpense, Contribution } from '../types';
import { MoneyUtil } from './money';

export const BENGALI_MONTH_NAMES = [
  'জানুয়ারি',
  'ফেব্রুয়ারি',
  'মার্চ',
  'এপ্রিল',
  'মে',
  'জুন',
  'জুলাই',
  'আগস্ট',
  'সেপ্টেম্বর',
  'অক্টোবর',
  'নভেম্বর',
  'ডিসেম্বর',
];

export function parseYearMonth(dateStr: string): { year: number; month: number; key: string } {
  if (!dateStr) {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    return { year: y, month: m, key: `${y}-${String(m).padStart(2, '0')}` };
  }

  // Fast ISO prefix parsing "YYYY-MM"
  if (dateStr.length >= 7 && dateStr[4] === '-') {
    const y = parseInt(dateStr.substring(0, 4), 10);
    const m = parseInt(dateStr.substring(5, 7), 10);
    if (!isNaN(y) && !isNaN(m) && m >= 1 && m <= 12) {
      return { year: y, month: m, key: `${y}-${String(m).padStart(2, '0')}` };
    }
  }

  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    return { year: y, month: m, key: `${y}-${String(m).padStart(2, '0')}` };
  }

  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  return { year: y, month: m, key: `${y}-${String(m).padStart(2, '0')}` };
}

export function getBengaliMonthLabel(year: number, month: number): string {
  const name = BENGALI_MONTH_NAMES[month - 1] || `${month}তম মাস`;
  return `${name} ${MoneyUtil.toBengaliNumber(year)}`;
}

export interface MonthFinancialSummary {
  year: number;
  month: number;
  key: string;
  label: string;
  isClosed: boolean;

  // Personal
  personalIncomePaisa: number;
  personalExpensePaisa: number;
  personalSavingsPaisa: number;
  personalSavingsRate: number; // percentage (0 - 100)

  // Household
  householdExpensePaisa: number;
  householdFromFundPaisa: number;
  householdFromMembersPaisa: number;
  myHouseholdPaidPaisa: number;
  householdContributionsPaisa: number;

  // Member spenders
  memberSpenders: Array<{ userId: string; paidPaisa: number }>;
}

export function buildMonthlySummaries(params: {
  currentUserId: string;
  personalIncomes: PersonalIncome[];
  personalExpenses: PersonalExpense[];
  householdExpenses: HouseholdExpense[];
  contributions: Contribution[];
  closedMonths: Array<{ year: number; month: number }>;
}): MonthFinancialSummary[] {
  const {
    currentUserId,
    personalIncomes,
    personalExpenses,
    householdExpenses,
    contributions,
    closedMonths,
  } = params;

  const map = new Map<string, { year: number; month: number }>();

  // Always include current month
  const now = new Date();
  const currentYM = parseYearMonth(now.toISOString());
  map.set(currentYM.key, { year: currentYM.year, month: currentYM.month });

  // Collect from transactions
  for (const inc of personalIncomes) {
    const ym = parseYearMonth(inc.date);
    if (!map.has(ym.key)) map.set(ym.key, { year: ym.year, month: ym.month });
  }
  for (const exp of personalExpenses) {
    const ym = parseYearMonth(exp.date);
    if (!map.has(ym.key)) map.set(ym.key, { year: ym.year, month: ym.month });
  }
  for (const hExp of householdExpenses) {
    const ym = parseYearMonth(hExp.date);
    if (!map.has(ym.key)) map.set(ym.key, { year: ym.year, month: ym.month });
  }
  for (const c of contributions) {
    const ym = parseYearMonth(c.date);
    if (!map.has(ym.key)) map.set(ym.key, { year: ym.year, month: ym.month });
  }
  for (const cm of closedMonths) {
    const key = `${cm.year}-${String(cm.month).padStart(2, '0')}`;
    if (!map.has(key)) map.set(key, { year: cm.year, month: cm.month });
  }

  // Sort descending by year-month key (newest first)
  const sortedKeys = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));

  return sortedKeys.map((key) => {
    const { year, month } = map.get(key)!;
    const label = getBengaliMonthLabel(year, month);

    const isClosed = closedMonths.some((cm) => cm.year === year && cm.month === month);

    // Personal Incomes
    const personalIncomePaisa = personalIncomes
      .filter((inc) => parseYearMonth(inc.date).key === key)
      .reduce((sum, inc) => sum + inc.amountPaisa, 0);

    // Personal Expenses
    const personalExpensePaisa = personalExpenses
      .filter((exp) => parseYearMonth(exp.date).key === key)
      .reduce((sum, exp) => sum + exp.amountPaisa, 0);

    const personalSavingsPaisa = personalIncomePaisa - personalExpensePaisa;
    const personalSavingsRate =
      personalIncomePaisa > 0
        ? Math.max(0, Math.round((personalSavingsPaisa / personalIncomePaisa) * 100))
        : 0;

    // Household Expenses
    const monthHousehold = householdExpenses.filter((h) => parseYearMonth(h.date).key === key);

    const householdExpensePaisa = monthHousehold.reduce((sum, h) => sum + h.amountPaisa, 0);

    const householdFromFundPaisa = monthHousehold
      .filter((h) => h.paidFromFund)
      .reduce((sum, h) => sum + h.amountPaisa, 0);

    const householdFromMembersPaisa = monthHousehold
      .filter((h) => !h.paidFromFund)
      .reduce((sum, h) => sum + h.amountPaisa, 0);

    const myHouseholdPaidPaisa = monthHousehold
      .filter((h) => !h.paidFromFund && h.paidByUserId === currentUserId)
      .reduce((sum, h) => sum + h.amountPaisa, 0);

    // Spender members
    const spenderMap = new Map<string, number>();
    for (const h of monthHousehold) {
      if (!h.paidFromFund && h.paidByUserId) {
        spenderMap.set(h.paidByUserId, (spenderMap.get(h.paidByUserId) || 0) + h.amountPaisa);
      }
    }
    const memberSpenders = Array.from(spenderMap.entries()).map(([userId, paidPaisa]) => ({
      userId,
      paidPaisa,
    }));

    // Contributions
    const householdContributionsPaisa = contributions
      .filter((c) => parseYearMonth(c.date).key === key)
      .reduce((sum, c) => sum + c.amountPaisa, 0);

    return {
      year,
      month,
      key,
      label,
      isClosed,
      personalIncomePaisa,
      personalExpensePaisa,
      personalSavingsPaisa,
      personalSavingsRate,
      householdExpensePaisa,
      householdFromFundPaisa,
      householdFromMembersPaisa,
      myHouseholdPaidPaisa,
      householdContributionsPaisa,
      memberSpenders,
    };
  });
}


import { MoneyUtil } from './money';

describe('Mobile MoneyUtil', () => {
  test('converts Taka to integer Paisa and Paisa to Taka accurately', () => {
    expect(MoneyUtil.takaToPaisa(120.75)).toBe(12075);
    expect(MoneyUtil.paisaToTaka(12075)).toBe(120.75);
  });

  test('formats integer Paisa to Bengali representation with Taka sign', () => {
    const formatted = MoneyUtil.formatBengaliCurrency(50000);
    expect(formatted).toContain('৫০০.০০');
    expect(formatted).toContain('৳');
  });

  test('formats 1 Crore Taka (১ কোটি টাকা) with exact South Asian commas', () => {
    // 1 Crore = 10,000,000 Taka = 1,000,000,000 Paisa
    const oneCrorePaisa = 1000000000;
    const formatted = MoneyUtil.formatBengaliCurrency(oneCrorePaisa);
    expect(formatted).toBe('১,০০,০০,০০০.০০ ৳');

    // 5 Crore Taka = 5,00,00,000 Taka = 5,000,000,000 Paisa
    const fiveCrorePaisa = 5000000000;
    expect(MoneyUtil.formatBengaliCurrency(fiveCrorePaisa)).toBe('৫,০০,০০,০০০.০০ ৳');
  });

  test('converts English digits to Bengali numerals', () => {
    expect(MoneyUtil.toBengaliNumber('12345')).toBe('১২৩৪৫');
    expect(MoneyUtil.toBengaliNumber('2026-11-05')).toBe('২০২৬-১১-০৫');
  });

  test('calculates equal splits with zero remainder loss', () => {
    // Regression Suite: 100 Taka (10000 Paisa) split among 3 members: 3334, 3333, 3333 = 10000
    const splits = MoneyUtil.calculateEqualSplits(10000, ['u1', 'u2', 'u3']);
    expect(splits).toHaveLength(3);
    expect(splits[0].sharePaisa).toBe(3334);
    expect(splits[1].sharePaisa).toBe(3333);
    expect(splits[2].sharePaisa).toBe(3333);
    expect(splits.reduce((s, x) => s + x.sharePaisa, 0)).toBe(10000);

    // Regression Suite: 1 Taka (100 Paisa) split among 3 members: 34, 33, 33 = 100
    const splits1Taka = MoneyUtil.calculateEqualSplits(100, ['u1', 'u2', 'u3']);
    expect(splits1Taka).toHaveLength(3);
    expect(splits1Taka[0].sharePaisa).toBe(34);
    expect(splits1Taka[1].sharePaisa).toBe(33);
    expect(splits1Taka[2].sharePaisa).toBe(33);
    expect(splits1Taka.reduce((s, x) => s + x.sharePaisa, 0)).toBe(100);
  });

  test('calculates percentage splits with exact total paisa sum', () => {
    // 15000 Paisa with 50%, 30%, 20%
    const splits = MoneyUtil.calculatePercentageSplits(15000, [
      { userId: 'u1', basisPoints: 5000 },
      { userId: 'u2', basisPoints: 3000 },
      { userId: 'u3', basisPoints: 2000 },
    ]);
    expect(splits[0].sharePaisa).toBe(7500);
    expect(splits[1].sharePaisa).toBe(4500);
    expect(splits[2].sharePaisa).toBe(3000);
    expect(splits.reduce((s, x) => s + x.sharePaisa, 0)).toBe(15000);
  });
});

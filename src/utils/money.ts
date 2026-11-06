import { SettlementTransaction } from '../types';

export class MoneyUtil {
  public static takaToPaisa(taka: number): number {
    return Math.round(taka * 100);
  }

  public static paisaToTaka(paisa: number): number {
    return Number((paisa / 100).toFixed(2));
  }

  /**
   * Formats paisa to standard Bangladeshi comma grouping e.g. "1,00,00,000.00" for 1 Crore
   */
  public static formatTaka(paisa: number): string {
    const taka = this.paisaToTaka(paisa);
    const parts = taka.toFixed(2).split('.');
    let intPart = parts[0];
    const decPart = parts[1];

    // South Asian grouping: last 3 digits, then groups of 2 digits
    if (intPart.length > 3) {
      const last3 = intPart.substring(intPart.length - 3);
      const remaining = intPart.substring(0, intPart.length - 3);
      const groups = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
      intPart = `${groups},${last3}`;
    }
    return `${intPart}.${decPart}`;
  }

  private static banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

  public static formatBengaliCurrency(paisa: number): string {
    const isNegative = paisa < 0;
    const absPaisa = Math.abs(paisa);
    const takaStr = this.formatTaka(absPaisa);
    let bnStr = '';
    for (const char of takaStr) {
      if (char >= '0' && char <= '9') {
        bnStr += this.banglaDigits[parseInt(char, 10)];
      } else {
        bnStr += char;
      }
    }
    return `${isNegative ? '-' : ''}${bnStr} ৳`;
  }

  public static toBengaliNumber(val: number | string): string {
    const str = String(val);
    let bnStr = '';
    for (const char of str) {
      if (char >= '0' && char <= '9') {
        bnStr += this.banglaDigits[parseInt(char, 10)];
      } else {
        bnStr += char;
      }
    }
    return bnStr;
  }

  /**
   * Calculates equal splits with zero-loss remainder distribution
   */
  public static calculateEqualSplits(totalPaisa: number, userIds: string[]): Array<{ userId: string; sharePaisa: number }> {
    if (!userIds || userIds.length === 0) {
      throw new Error('At least one user must be specified for split');
    }
    if (totalPaisa <= 0) {
      throw new Error('Total paisa must be greater than zero');
    }

    const count = userIds.length;
    const baseShare = Math.floor(totalPaisa / count);
    const remainder = totalPaisa - baseShare * count;

    return userIds.map((userId, idx) => ({
      userId,
      sharePaisa: idx < remainder ? baseShare + 1 : baseShare,
    }));
  }

  /**
   * Calculates percentage splits where percentages are basis points (100% = 10000 bps)
   */
  public static calculatePercentageSplits(
    totalPaisa: number,
    shares: Array<{ userId: string; basisPoints: number }>
  ): Array<{ userId: string; sharePaisa: number }> {
    if (!shares || shares.length === 0) {
      throw new Error('Shares list cannot be empty');
    }
    const totalBps = shares.reduce((acc, s) => acc + s.basisPoints, 0);
    if (totalBps !== 10000) {
      throw new Error(`Total percentage basis points must equal 10000 (100%). Received: ${totalBps}`);
    }

    let allocatedPaisa = 0;
    const items = shares.map((s) => {
      const share = Math.floor((totalPaisa * s.basisPoints) / 10000);
      allocatedPaisa += share;
      return {
        userId: s.userId,
        sharePaisa: share,
      };
    });

    // Remainder paisa distributed to the highest percentages
    let remainder = totalPaisa - allocatedPaisa;
    let idx = 0;
    while (remainder > 0) {
      items[idx % items.length].sharePaisa += 1;
      remainder--;
      idx++;
    }

    return items;
  }

  /**
   * Minimizes cash flow debt settlements using greedy algorithm
   */
  public static simplifyDebts(
    netBalances: Array<{ userId: string; netBalancePaisa: number }>
  ): SettlementTransaction[] {
    const debtors: Array<{ userId: string; amount: number }> = [];
    const creditors: Array<{ userId: string; amount: number }> = [];

    for (const item of netBalances) {
      if (item.netBalancePaisa < 0) {
        debtors.push({ userId: item.userId, amount: Math.abs(item.netBalancePaisa) });
      } else if (item.netBalancePaisa > 0) {
        creditors.push({ userId: item.userId, amount: item.netBalancePaisa });
      }
    }

    // Sort descending by amount
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const transactions: SettlementTransaction[] = [];
    let i = 0;
    let j = 0;

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const settlementAmount = Math.min(debtor.amount, creditor.amount);

      if (settlementAmount > 0) {
        transactions.push({
          fromUserId: debtor.userId,
          toUserId: creditor.userId,
          amountPaisa: settlementAmount,
        });

        debtor.amount -= settlementAmount;
        creditor.amount -= settlementAmount;
      }

      if (debtor.amount === 0) i++;
      if (creditor.amount === 0) j++;
    }

    return transactions;
  }
}

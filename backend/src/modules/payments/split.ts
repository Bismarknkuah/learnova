/** Pure payment-split math — kept separate so it's unit-testable without a database. */
export interface Split { commissionGHS: number; teacherEarningsGHS: number }

const round2 = (n: number) => Math.round(n * 100) / 100;

export function splitPayment(amountGHS: number, commissionRate: number): Split {
  if (amountGHS < 0) throw new Error('amount must be >= 0');
  if (commissionRate < 0 || commissionRate > 1) throw new Error('rate must be 0..1');
  const commissionGHS = round2(amountGHS * commissionRate);
  return { commissionGHS, teacherEarningsGHS: round2(amountGHS - commissionGHS) };
}

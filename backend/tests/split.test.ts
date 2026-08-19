import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitPayment } from '../src/modules/payments/split.js';

test('splits ₵100 at 15% into ₵15 / ₵85', () => {
  const s = splitPayment(100, 0.15);
  assert.equal(s.commissionGHS, 15);
  assert.equal(s.teacherEarningsGHS, 85);
});

test('commission + earnings always equal the amount', () => {
  for (const amt of [49.99, 100, 333.33, 0]) {
    const s = splitPayment(amt, 0.2);
    assert.equal(Math.round((s.commissionGHS + s.teacherEarningsGHS) * 100) / 100, Math.round(amt * 100) / 100);
  }
});

test('rejects invalid rate and negative amount', () => {
  assert.throws(() => splitPayment(100, 1.5));
  assert.throws(() => splitPayment(-1, 0.15));
});

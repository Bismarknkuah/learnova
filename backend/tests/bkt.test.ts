import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bktUpdate } from '../src/modules/adaptive/bkt.js';

test('a correct answer raises mastery', () => {
  assert.ok(bktUpdate(0.3, true) > 0.3);
});

test('an incorrect answer lowers mastery', () => {
  assert.ok(bktUpdate(0.6, false) < 0.6);
});

test('mastery stays within (0,1)', () => {
  let p = 0.5;
  for (let i = 0; i < 50; i++) p = bktUpdate(p, i % 2 === 0);
  assert.ok(p > 0 && p < 1);
});

test('repeated correct answers approach mastery', () => {
  let p = 0.3;
  for (let i = 0; i < 10; i++) p = bktUpdate(p, true);
  assert.ok(p > 0.85);
});

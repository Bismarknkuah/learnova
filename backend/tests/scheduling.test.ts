import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SchedulingAgent } from '../src/agents/SchedulingAgent.js';

const agent = new SchedulingAgent();
const H = 3_600_000;

test('finds overlapping 60-min slots between teacher and student', async () => {
  const base = Date.now();
  const r = await agent.handle({ input: {
    teacherAvail: [{ start: base, end: base + 3 * H }],
    studentAvail: [{ start: base + H, end: base + 4 * H }],
    durationMin: 60,
  } });
  assert.ok(r.slots.length >= 1);
  // every slot must sit inside the overlap window [base+H, base+3H]
  for (const s of r.slots) {
    assert.ok(s.start >= base + H && s.end <= base + 3 * H);
  }
});

test('excludes slots that clash with existing bookings', async () => {
  const base = Date.now();
  const r = await agent.handle({ input: {
    teacherAvail: [{ start: base, end: base + 2 * H }],
    studentAvail: [{ start: base, end: base + 2 * H }],
    existingBookings: [{ start: base, end: base + H }],
    durationMin: 60,
  } });
  for (const s of r.slots) assert.ok(s.start >= base + H);
});

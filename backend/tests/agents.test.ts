import { test } from 'node:test';
import assert from 'node:assert/strict';
import { agentSystem } from '../src/agents/index.js';

test('multi-agent system brings the full specialist roster online', () => {
  agentSystem.start();
  const s = agentSystem.status();
  assert.equal(s.online, true);
  const names = s.agents.map((a) => a.name);
  for (const expected of ['TutorAgent', 'ExamAgent', 'CareerAgent', 'FraudAgent', 'AnalyticsAgent', 'SchoolAgent', 'ParentAgent', 'ResearchAgent']) {
    assert.ok(names.includes(expected), `missing ${expected}`);
  }
  assert.ok(s.agents.length >= 12, `expected >= 12 agents, got ${s.agents.length}`);
});

test('ExamAgent flags high-risk proctoring as review', async () => {
  const r = await agentSystem.exam.handle({ input: { events: [{ type: 'phone_detected' }, { type: 'multiple_faces' }, { type: 'paste' }], riskScore: 20 } }) as { verdict: string };
  assert.equal(r.verdict, 'review');
});

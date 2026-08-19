import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RecommendationAgent } from '../src/agents/RecommendationAgent.js';

const agent = new RecommendationAgent();

test('ranks the subject-matching, in-budget, higher-rated tutor first', async () => {
  const r = await agent.handle({ input: {
    student: { subject: 'Physics', language: 'Twi', maxPrice: 120 },
    tutors: [
      { id: 'good', subjects: ['Physics'], languages: ['Twi'], hourlyRateGHS: 100, rating: 4.8, completedSessions: 300 },
      { id: 'offtopic', subjects: ['History'], languages: ['English'], hourlyRateGHS: 80, rating: 5, completedSessions: 500 },
    ],
  } });
  assert.equal(r.recommended[0].tutor.id, 'good');
  assert.ok(r.recommended[0].why.length > 0);
});

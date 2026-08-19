import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateNotes } from '../src/modules/classrooms/notes.js';

test('internal note generator extracts formulas, homework and questions (no AI key)', () => {
  const transcript = [
    'Today we studied Newtons second law. The formula is F = m * a.',
    'Force equals mass times acceleration in physics.',
    'What happens if mass doubles?',
    'For homework, practice exercises on page 42 and submit tomorrow.',
  ].join(' ');
  const n = generateNotes('Physics', transcript);
  assert.ok(n.summary.length > 0, 'has a summary');
  assert.ok(n.formulas.some((f) => f.includes('=')), 'detects a formula');
  assert.ok(n.homework.some((h) => /homework|submit/i.test(h)), 'detects homework');
  assert.ok(n.unansweredQuestions.some((q) => q.endsWith('?')), 'detects a question');
});

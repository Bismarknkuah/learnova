import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plagiarismScore } from '../src/modules/assignments/review.js';

test('plagiarism: near-identical text scores high', () => {
  const corpus = [{ id: 'a', text: 'The mitochondria is the powerhouse of the cell and produces energy.' }];
  const r = plagiarismScore('The mitochondria is the powerhouse of the cell and produces energy.', corpus);
  assert.ok(r.score > 60, `expected high score, got ${r.score}`);
  assert.equal(r.matchedId, 'a');
});

test('plagiarism: original text scores low', () => {
  const corpus = [{ id: 'a', text: 'The mitochondria is the powerhouse of the cell.' }];
  const r = plagiarismScore('Photosynthesis converts sunlight into chemical energy in plants.', corpus);
  assert.ok(r.score < 20, `expected low score, got ${r.score}`);
});

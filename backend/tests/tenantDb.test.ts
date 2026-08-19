import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tenantDbName } from '../src/core/tenantDb.js';

test('each school maps to its own distinct database name', () => {
  const a = tenantDbName('accra-high');
  const b = tenantDbName('kumasi-academy');
  assert.equal(a, 'learnova_accra-high');
  assert.notEqual(a, b);
});

test('database names are sanitised', () => {
  assert.equal(tenantDbName('My School!! 2026'), 'learnova_myschool2026');
});

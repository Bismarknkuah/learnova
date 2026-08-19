import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tenantDbName } from '../src/core/tenantDb.js';

// Proves the routing primitive: two different schools resolve to two different databases.
test('two schools map to two distinct databases', () => {
  const accra = tenantDbName('accra-high');
  const kumasi = tenantDbName('kumasi-academy');
  assert.equal(accra, 'learnova_accra-high');
  assert.equal(kumasi, 'learnova_kumasi-academy');
  assert.notEqual(accra, kumasi, 'each school must get its own database');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { runParityFixtures, fixtureIds } from './native-resource-fixtures.mjs';

test('native resource parity fixtures execute and assert observed behavior',async()=> {
  const results = await runParityFixtures();
  assert.equal(results.size,fixtureIds.length);
  for (const id of fixtureIds) assert.equal(results.get(id).success,true,id);
});

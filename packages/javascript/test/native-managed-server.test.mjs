import test from 'node:test';
import assert from 'node:assert/strict';
import { runParityFixtures, fixtureIds } from './native-managed-server-fixtures.mjs';
test('native managed lifecycle executes meaningful readiness, identity and ownership fixtures',async()=> {
  const evidence = await runParityFixtures();
  assert.equal(evidence.size,fixtureIds.length);
  for (const id of fixtureIds) assert.equal(evidence.get(id).success,true,id);
});

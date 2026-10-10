import test from 'node:test';
import assert from 'node:assert/strict';
import { runParityFixtures, fixtureIds } from './native-managed-server-fixtures.mjs';
// This aggregate runs 15 fixtures with real daemon startup, shutdown, restart,
// concurrency and failed-readiness cleanup. Its budget covers the complete
// sequence; each startup and stop retains its own 10-second / 6-second bound.
test('native managed lifecycle executes meaningful readiness, identity and ownership fixtures',{timeout:120000},async()=> {
  const evidence = await runParityFixtures();
  assert.equal(evidence.size,fixtureIds.length);
  for (const id of fixtureIds) assert.equal(evidence.get(id).success,true,id);
});

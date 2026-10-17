import test from 'node:test';
import assert from 'node:assert/strict';
import { runParityFixtures, fixtureIds } from './native-managed-server-fixtures.mjs';
// This aggregate runs readiness, shutdown, restart, contention, live revocation,
// commit acknowledgement and failed-readiness cleanup against real daemons.
// Its budget covers the delayed-commit fixture as well as the complete sequence;
// each startup, commit and stop retains its own 10-second / 10-second / 6-second bound.
test('native managed lifecycle executes meaningful readiness, identity and ownership fixtures',{timeout:120000},async()=> {
  const evidence = await runParityFixtures();
  assert.equal(evidence.size,fixtureIds.length);
  for (const id of fixtureIds) assert.equal(evidence.get(id).success,true,id);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { runParityFixtures, nativeRouteSubset } from './native-route-fixtures.mjs';
test('native HTTP census observes every canonical OpenAPI method and path', async () => {
  const result = await runParityFixtures();
  assert.equal(result.size, 368);
  assert.equal([...result.values()].filter(result => result.success).length, nativeRouteSubset.size);
});

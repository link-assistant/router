import test from 'node:test';
import assert from 'node:assert/strict';
import { runParityFixtures, nativeRouteSubset, nativeRouteOutcomes } from './native-route-fixtures.mjs';
test('native HTTP census observes every canonical OpenAPI method and path', {timeout:120000}, async () => {
  const result = await runParityFixtures();
  assert.equal(result.size, 368);
  assert.equal([...result.values()].filter(result => result.success).length, nativeRouteSubset.size);
  assert.ok([...result.values()].every(result=>result.fullParity === false));
  assert.equal([...result.values()].filter(result=>result.headBodyEmpty).length,nativeRouteOutcomes.filter(row=>row.route.startsWith('HEAD ')).length);
  assert.equal([...result.values()].filter(result=>result.upstreamVerified).length,nativeRouteOutcomes.filter(row=>row.upstream).length);
  assert.equal([...result.values()].filter(result=>result.observed==='web-request-transport-rejection').length,process.versions.bun ? 0:4);
});

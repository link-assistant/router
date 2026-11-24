import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkTypeScriptFixtures } from '../check-typescript-fixtures.mjs';
import { translateSource } from '../translate.mjs';

test('standalone strict fixture checking resolves shipped recursive guards and host declarations', () => {
  const fixtures = JSON.parse(readFileSync(new URL('../fixtures/portable-cases.json', import.meta.url)));
  const result = checkTypeScriptFixtures(fixtures);
  assert.equal(result.modules, fixtures.length);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const source = 'pub fn seconds(value:&std::time::Duration)->u64 {value.as_secs()}';
  const translated = translateSource(source, 'host.rs');
  assert.ok(translated.ir.items.some(item => item.name === 'seconds' && item.status === 'executable'));
  assert.match(translated.typescript, /time-runtime\.mjs/);
  const host = checkTypeScriptFixtures([{ source }]);
  assert.equal(host.status, 0, host.stdout + host.stderr);
});

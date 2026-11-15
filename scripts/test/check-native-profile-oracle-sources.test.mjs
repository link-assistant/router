// The native profile preflight must treat only the profiles' explicit archive
// drift diagnostic as "stale"; every other visitor error stays fatal.
import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyNativeProfileVisitorError, staleNativeProfileInstructions} from '../check-native-profile-oracle-sources-20261101.mjs';

const options = {timeout: 10000};

test('the explicit archive drift diagnostic is stale and names the first differing file', options, () => {
  const error = new TypeError('Persistent output source profile: complete physical source differs: tools/translation/extensions/host-contracts.mjs');
  assert.deepEqual(classifyNativeProfileVisitorError(error), {stale: true, path: 'tools/translation/extensions/host-contracts.mjs', message: error.message});
});

test('guard, import and unknown failures are not stale', options, () => {
  for (const message of [
    'Original file token context: original source operations changed',
    "Cannot access 'INTEGER_ERROR_CONTRACTS' before initialization",
    'complete physical source differs:',
    'complete physical source differs: a.mjs and more',
  ]) assert.equal(classifyNativeProfileVisitorError(new TypeError(message)).stale, false, message);
  assert.equal(classifyNativeProfileVisitorError('not an Error').stale, false);
});

test('maintainer instructions name every stale profile, its archive and both ways out', options, () => {
  const text = staleNativeProfileInstructions({profiles: [
    {profileId: 'a-20261101', archive: 'tools/a.json.gz', fresh: false, firstDifferingPath: 'x.mjs'},
    {profileId: 'b-20261101', archive: 'tools/b.json.gz', fresh: true},
  ]});
  assert.match(text, /a-20261101 \(first differing file: x\.mjs\)/u);
  assert.match(text, /regenerate tools\/a\.json\.gz/u);
  assert.match(text, /remove the stale profiles from NATIVE_PROFILE_ORACLES/u);
  assert.doesNotMatch(text, /b-20261101/u);
});

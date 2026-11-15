import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {prepareStaticResultResidualSource,deriveStaticResultResidualSource} from '../prepare-static-result-residual-source.mjs';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {assertStaticResultResidualSourceComposition} from './static-result-residual-source-composition.mjs';

test('complete static Result lifetime source equation reaches the actual checker through both serialized phases and its inverse', {timeout:60000}, () => {
  const plan=prepareStaticResultResidualSource(),row=plan.files[0];
  const archived=gunzipSync(readFileSync(new URL('../source-profiles/static-result-residuals/original.mjs.gz',import.meta.url)),{maxOutputLength:131072}).toString('utf8');
  assert.equal(row.before,archived);
  assert.notEqual(row.after,row.before);
  assertStaticResultResidualSourceComposition(plan,{[row.path]:{after:archived}},{[row.path]:{after:row.current}});
  assert.throws(()=>deriveStaticResultResidualSource(ownershipCompiler(),archived+'\n'),/complete original checker/);
  assert.throws(()=>deriveStaticResultResidualSource(ownershipCompiler(),row.after),/complete original checker/);
});

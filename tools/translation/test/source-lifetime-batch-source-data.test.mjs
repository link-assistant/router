import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareSourceLifetimeRefusalBatches,prepareBatchedSourceLifetimeRefusalBatches} from '../prepare-source-lifetime-refusal-batches.mjs';

test('explicit complete lifetime-source batch preserves every original source, metadata, trace and native binding', {timeout:60000}, () => {
  const original=prepareSourceLifetimeRefusalBatches(),batched=prepareBatchedSourceLifetimeRefusalBatches();
  assert.equal(original.schema,'source-lifetime-refusal-batch-source-v1');
  assert.equal(batched.schema,'batched-source-lifetime-refusal-source-v1');
  assert.equal(batched.files.length,3);
  assert.deepEqual(batched.inputs,original.inputs);
  assert.deepEqual(batched.files,original.files);
  for(const field of ['typescriptVersion','ordinaryCheckerSelectionUnchanged','failedPhaseReturnsProgram','newAcrossInvocationCache','semanticAuthority','executableAdmission'])assert.equal(batched[field],original[field]);
});

// Complete run credentials/policy source. SOURCE ONLY; UNRUN.
import test from 'node:test';import assert from 'node:assert/strict';
import {prepareNativeRunCredentialSources} from '../prepare-native-run-credential-sources.mjs';
test('seven shared run equations retain seven physical native inputs both phases and complete inverses',{timeout:60000},()=>{
 const plan=prepareNativeRunCredentialSources();assert.equal(plan.files.length,7);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.nativeInputs.length,7);for(const row of plan.nativeInputs){assert.equal(row.source,row.originalSource);assert.equal(row.sourceAuthority,false);assert.equal(row.semanticAuthority,false);assert.equal(row.namespaceAuthority,false);}assert.equal(plan.receivingExecuted,false);assert.equal(plan.rustExecuted,false);
});

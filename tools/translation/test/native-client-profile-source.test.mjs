// Full original settings/profile construction source. SOURCE ONLY; UNRUN.
import test from 'node:test';import assert from 'node:assert/strict';
import {prepareNativeClientProfileSources} from '../prepare-native-client-profile-sources.mjs';
test('five paired profile equations retain six complete native inputs both phases and full inverses',{timeout:60000},()=>{
 const plan=prepareNativeClientProfileSources();assert.equal(plan.files.length,5);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.nativeInputs.length,6);for(const row of plan.nativeInputs){assert.equal(row.source,row.originalSource);assert.equal(row.sourceAuthority,false);assert.equal(row.semanticAuthority,false);assert.equal(row.namespaceAuthority,false);}assert.equal(plan.receivingExecuted,false);assert.equal(plan.rustExecuted,false);
});

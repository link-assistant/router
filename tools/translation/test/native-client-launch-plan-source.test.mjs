// Complete compiler/native policy source. SOURCE ONLY; UNRUN.
import test from 'node:test';import assert from 'node:assert/strict';
import {prepareNativeClientLaunchPlanSources} from '../prepare-native-client-launch-plan-sources.mjs';
test('seven complete policy/preflight equations retain both phases native originals and exact source inverses',{timeout:60000},()=>{
 const plan=prepareNativeClientLaunchPlanSources();assert.equal(plan.files.length,7);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.nativeInputs.length,2);for(const row of plan.nativeInputs){assert.equal(row.source,row.originalSource);assert.equal(row.sourceAuthority,false);assert.equal(row.semanticAuthority,false);assert.equal(row.namespaceAuthority,false);}assert.equal(plan.receivingExecuted,false);assert.equal(plan.rustExecuted,false);
});

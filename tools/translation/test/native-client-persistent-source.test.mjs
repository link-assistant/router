// Independent source construction/provenance cases. SOURCE ONLY; UNRUN.
import test from 'node:test';import assert from 'node:assert/strict';
import {prepareNativeClientPersistentSources} from '../prepare-native-client-persistent-sources.mjs';
const limits={timeout:60000};
test('nine paired implementation equations and complete actual native inputs retain CST phases originals and inverses',limits,()=>{const plan=prepareNativeClientPersistentSources();assert.equal(plan.files.length,9);assert.equal(plan.nativeInputs.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}for(const row of plan.nativeInputs){assert.equal(row.sourceAuthority,false);assert.equal(row.semanticAuthority,false);assert.ok(row.concreteSyntax);}assert.equal(plan.rustExecuted,false);assert.equal(plan.receivingExecuted,false);});

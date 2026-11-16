// Whole source-history DATA only; no compiler or translator execution. UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {visitOpaqueReceivingResourceSourceEquations} from '../opaque-receiving-resource-20261101-history.mjs';
test('bounded receiving source copies retain complete parent custody and exact two-phase inverses',{timeout:60000,concurrency:false},()=>{
 let events=0;const result=visitOpaqueReceivingResourceSourceEquations(event=>{events++;assert.equal(event.history.inverse,event.history.before);assert.deepEqual(event.history.trace.map(row=>row.phase),['language','repository']);assert.equal(event.sourceAuthority,false);assert.equal(event.semanticAuthority,false);return null;});
 assert.equal(result.copyRows,3);assert.equal(result.additionRows,3);assert.equal(result.sourceInstalled,false);assert.equal(result.executionEvidence,'UNRUN');assert.ok(result.parentVisited>0);assert.ok(events>result.visited);const files=new Map(result.copyCustody.map(row=>[row.path,row.source]));assert.equal(files.size,result.copyCustody.length);for(const name of ['opaque-receiving-resource-history-20261101.test.mjs','opaque-receiving-bounded-body-20261101.test.mjs','opaque-body-literal-inverse-20261101.test.mjs','opaque-native-candidates-20261101.test.mjs'])assert.ok(files.has('tools/translation/test/'+name),name);
});

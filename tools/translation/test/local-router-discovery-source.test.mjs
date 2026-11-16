// Complete source equations and physical native inputs. SOURCE ONLY; UNRUN.
import test from 'node:test';import assert from 'node:assert/strict';
import {prepareLocalRouterDiscoverySources} from '../prepare-local-router-discovery-sources.mjs';
test('nine paired discovery and configure equations retain original current source both phases and full inverses',{timeout:60000},()=>{
 const plan=prepareLocalRouterDiscoverySources();assert.equal(plan.files.length,9);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.nativeInputs.length,2);for(const row of plan.nativeInputs){assert.equal(row.originalSource,row.source);assert.equal(row.sourceAuthority,false);assert.equal(row.semanticAuthority,false);assert.equal(row.namespaceAuthority,false);}assert.equal(plan.rustExecuted,false);assert.equal(plan.receivingExecuted,false);
});

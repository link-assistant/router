// Complete source history regression SOURCE; deliberately UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareFixedWrappingErrorExitSources} from '../prepare-fixed-wrapping-error-exits-sources.mjs';
test('two complete source equations retain primary error handling every final source fence and cleanup in both phases',{timeout:60000},()=>{
 const plan=prepareFixedWrappingErrorExitSources();assert.equal(plan.files.length,2);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});

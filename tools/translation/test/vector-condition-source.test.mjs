// Complete conditional source equations. ALL UNRUN.
import test from 'node:test';import assert from 'node:assert/strict';
import {prepareVectorConditionSources} from '../prepare-vector-condition-sources.mjs';
const limits={timeout:60000};
test('five complete compiler equations retain ordered phases originals and exact inverses',limits,()=>{const plan=prepareVectorConditionSources();assert.equal(plan.files.length,5);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});

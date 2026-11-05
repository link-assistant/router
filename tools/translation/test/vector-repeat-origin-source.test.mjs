// Complete source-origin composition cases. SOURCE ONLY; ALL UNRUN.
import test from 'node:test';import assert from 'node:assert/strict';
import {prepareVectorRepeatOriginSources} from '../prepare-vector-repeat-origin-sources.mjs';
import {checkedOwnedVectorTail} from '../js-to-rust/owned-vector-origin-tail.mjs';
const limits={timeout:60000};
test('three complete equations preserve both phases and whole source inverses',limits,()=>{const plan=prepareVectorRepeatOriginSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});
test('DATA traversal never qualifies mutation foreign tails or unbounded bindings',limits,()=>{
 const scalar={kind:'bool'},ret={kind:'array',element:scalar,rustOwnership:{kind:'owned',source:'Vec'}},array={k:'array',type:ret,items:[],compatibilityCore:{id:'router-core-vector-list-v1'}},checked={k:'let',name:'seed',value:{k:'bool',type:scalar,value:true},body:array,type:ret,mutable:false};let count=0;assert.equal(checkedOwnedVectorTail({body:checked,ret},type=>{assert.equal(type,scalar);count++;}),array);assert.equal(count,1);
 assert.throws(()=>checkedOwnedVectorTail({body:{...checked,mutable:true},ret},()=>{}),/immutable/);assert.throws(()=>checkedOwnedVectorTail({body:{...checked,body:{k:'call',type:ret}},ret},()=>{}),/array tail/);let body=array;for(let at=0;at<65;at++)body={...checked,name:'seed'+at,body};assert.throws(()=>checkedOwnedVectorTail({body,ret},()=>{}),/bounded/);
});

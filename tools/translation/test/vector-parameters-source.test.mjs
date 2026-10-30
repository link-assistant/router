// Complete parameter substitution source and boundary cases. ALL UNRUN.
import test from 'node:test';import assert from 'node:assert/strict';
import {prepareVectorParameterSources} from '../prepare-vector-parameter-sources.mjs';
import {validateVectorParameters,vectorScalarBounds} from '../js-to-rust/owned-vector-parameter-values.mjs';
const limits={timeout:60000};
test('six compiler equations retain both phases full originals and complete inverse source',limits,()=>{const plan=prepareVectorParameterSources();assert.equal(plan.files.length,6);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});
test('closed native widths and Boolean guards validate unused arguments too',limits,()=>{
 const domains=['u8','u16','u32','u64','u128','usize','i8','i16','i32','i64','i128','isize'];
 for(const type of domains){const bounds=vectorScalarBounds(type),item={vectorOrigin:{},params:[{name:'seed',type}]};for(const value of [bounds.minimum,bounds.maximum])assert.doesNotThrow(()=>validateVectorParameters(item,new Map([['seed',value]])));for(const value of [bounds.minimum-1n,bounds.maximum+1n,0,'0',null,true])assert.throws(()=>validateVectorParameters(item,new Map([['seed',value]])));}
 const item={vectorOrigin:{},params:[{name:'flag',type:'bool'}]};for(const value of [true,false])validateVectorParameters(item,new Map([['flag',value]]));for(const value of [0n,0,'false',null,undefined])assert.throws(()=>validateVectorParameters(item,new Map([['flag',value]])));
});

// A real canonical project must expose its existing namespace boundaries when
// diagnostics are requested. No generated output or executable claim changes.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateProject} from '../project.mjs';

const source='pub fn value(v:u8)->u8{v}';
const options={entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source};
const phases=['json-context','external-bindings','derive-inputs','default-source',
 'clone-source','tool-attributes','complete-bindings'];

test('canonical diagnostics report each namespace boundary and preserve complete products',
 {timeout:60000},()=>{
 const plain=translateProject(options),records=[];
 const traced=translateProject({...options,progress:row=>records.push(row)});
 assert.deepEqual(traced.meta,plain.meta);
 assert.equal(traced.javascript,plain.javascript);
 assert.equal(traced.typescript,plain.typescript);
 const actual=records.filter(row=>row.stage==='namespace'&&row.state==='advance');
 assert.deepEqual(actual.map(row=>row.phase),phases);
 for(const row of actual){
  assert.equal(Object.isFrozen(row),true);
  assert.deepEqual(Object.keys(row).sort(),['entry','phase','schema','stage','state']);
  assert.equal(Object.values(row).every(value=>typeof value==='string'),true);
 }
 assert.ok(records.some(row=>row.stage==='namespace'&&row.state==='end'));
});

test('a canonical namespace observer error propagates before later compiler stages',
 {timeout:60000},()=>{
 for(const phase of phases){
  const sentinel=new Error('stop at '+phase),records=[];
  assert.throws(()=>translateProject({...options,progress:row=>{
   records.push(row);
   if(row.stage==='namespace'&&row.state==='advance'&&row.phase===phase)throw sentinel;
  }}),error=>error===sentinel);
  assert.equal(records.at(-1).phase,phase);
  assert.equal(records.some(row=>row.stage==='namespace'&&row.state==='end'),false);
  assert.equal(records.some(row=>['semantic-check','target-emit'].includes(row.stage)),false);
 }
});

test('canonical namespace diagnostics capture the original progress input once',
 {timeout:60000},()=>{
 const records=[];let reads=0;
 const input={...options,get progress(){
  reads++;assert.equal(reads,1);return row=>records.push(row);
 }};
 const actual=translateProject(input),plain=translateProject(options);
 assert.equal(reads,1);assert.equal(actual.javascript,plain.javascript);
 assert.equal(actual.typescript,plain.typescript);assert.deepEqual(actual.meta,plain.meta);
 assert.deepEqual(records.filter(row=>row.stage==='namespace'&&row.state==='advance')
  .map(row=>row.phase),phases);
});

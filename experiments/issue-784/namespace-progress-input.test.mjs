import test from 'node:test';
import assert from 'node:assert/strict';
import {translateProject} from '../../tools/translation/project.mjs';

const source='pub fn value(v:u8)->u8{v}';
const options={entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source};
const phases=['json-context','external-bindings','derive-inputs','default-source',
 'clone-source','tool-attributes','complete-bindings'];

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

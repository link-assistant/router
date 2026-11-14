// A real canonical project must expose its existing namespace boundaries when
// diagnostics are requested. No generated output or executable claim changes.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateProject} from '../project.mjs';
import {namespaceProgressObserver,namespaceProgressRequested} from '../translation-progress.mjs';

const source='pub fn value(v:u8)->u8{v}';
const options={entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source};
const phases=['json-context','external-bindings','derive-inputs','default-source',
 'clone-source','tool-attributes','complete-bindings'];

test('canonical diagnostics report each namespace boundary and preserve complete products',
 {timeout:60000},()=>{
 const plain=translateProject(options),records=[];
 const traced=translateProject({...options,progress:namespaceProgressObserver(row=>records.push(row))});
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
  assert.throws(()=>translateProject({...options,progress:namespaceProgressObserver(row=>{
   records.push(row);
   if(row.stage==='namespace'&&row.state==='advance'&&row.phase===phase)throw sentinel;
  })}),error=>error===sentinel);
  assert.equal(records.at(-1).phase,phase);
  assert.equal(records.some(row=>row.stage==='namespace'&&row.state==='end'),false);
  assert.equal(records.some(row=>['semantic-check','target-emit'].includes(row.stage)),false);
 }
});

test('canonical namespace diagnostics capture the original progress input once',
 {timeout:60000},()=>{
 const records=[];let reads=0;
 const input={...options,get progress(){
  reads++;assert.equal(reads,1);return namespaceProgressObserver(row=>records.push(row));
 }};
 const actual=translateProject(input),plain=translateProject(options);
 assert.equal(reads,1);assert.equal(actual.javascript,plain.javascript);
 assert.equal(actual.typescript,plain.typescript);assert.deepEqual(actual.meta,plain.meta);
 assert.deepEqual(records.filter(row=>row.stage==='namespace'&&row.state==='advance')
  .map(row=>row.phase),phases);
});

test('ordinary observers keep their event sequence and namespace opt-in stays private',
 {timeout:60000},()=>{
 const events=[],callback=row=>events.push(row);
 assert.equal(namespaceProgressRequested(callback),false);
 translateProject({...options,progress:callback});
 assert.equal(events.some(row=>row.stage==='namespace'&&row.state==='advance'),false);
 const observer=namespaceProgressObserver(callback);
 assert.equal(namespaceProgressRequested(observer),true);
 assert.equal(namespaceProgressRequested(callback),false);
 for(const value of [null,undefined,{},0,'callback']){
  assert.equal(namespaceProgressRequested(value),false);
  assert.throws(()=>namespaceProgressObserver(value),TypeError);
 }
 const getDescriptor=Object.getOwnPropertyDescriptor,define=Object.defineProperty;
 const add=getDescriptor(WeakSet.prototype,'add'),has=getDescriptor(WeakSet.prototype,'has');
 const failure=new Error('foreign WeakSet operation');let foreignCalls=0,registered;
 try{
  define(WeakSet.prototype,'add',{...add,value(){foreignCalls++;throw failure;}});
  define(WeakSet.prototype,'has',{...has,value(){foreignCalls++;throw failure;}});
  registered=namespaceProgressObserver(callback);
  assert.equal(namespaceProgressRequested(observer),true);
  assert.equal(namespaceProgressRequested(registered),true);
  assert.equal(namespaceProgressRequested(callback),false);
 }finally{define(WeakSet.prototype,'add',add);define(WeakSet.prototype,'has',has);}
 assert.equal(foreignCalls,0);
 const sentinel=new Error('callback apply failed');let applications=0;
 const hostile=new Proxy(()=>{}, {apply(){applications++;throw sentinel;},
  get(){throw new Error('callback property must not be read');}});
 const wrapped=namespaceProgressObserver(hostile);
 assert.equal(namespaceProgressRequested(wrapped),true);
 assert.throws(()=>wrapped({stage:'namespace'}),error=>error===sentinel);
 assert.equal(applications,1);
});

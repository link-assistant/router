// Structural orchestration cases only. Fake tokens do not qualify native ASTs.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createOrderedScalarHelperLayoutGraph20261104 as create} from '../ordered-scalar-helper-layout-graph-20261104.mjs';
const module=imports=>({functions:new Map(),exports:new Map(),imports});
test('a cyclic import layout uses one bounded FIFO frame without recursive resolution',{timeout:10000},()=>{
 const a={},b={},events=[],layout=new Map([[a,module([{file:b,path:'b'}])],[b,module([{file:a,path:'a'}])]]);let frame;
 frame=create({inspect(file,path){events.push('inspect:'+path);return layout.get(file);},resolve(job){events.push('import:'+job.path);frame.withSelection(job.file,job.path,()=>{});},current(){},charge(){}});
 frame.withSelection(a,'a',()=>events.push('selected'));assert.deepEqual(events,['inspect:a','import:b','inspect:b','import:a','selected']);frame.close();assert.throws(()=>frame.withSelection(a,'a',()=>{}),/expired/);
});
test('every root operation inspects fresh layouts and closes every source read',{timeout:10000},()=>{
 const file={};let inspections=0,checks=0;for(let at=0;at<2;at++){const frame=create({inspect(){inspections++;return module([]);},resolve(){},current(){checks++;},charge(){}});frame.withSelection(file,'module',()=>{});frame.close();}assert.equal(inspections,2);assert.ok(checks>=8);
});
test('caught import failures poison subsequent selection and closing with exact primaries',{timeout:10000},()=>{
 for(const primary of [false,0,'',null,undefined,Object.freeze({original:true})]){
  const file={},frame=create({inspect(){return module([{}]);},resolve(){throw primary;},current(){},charge(){}});let caught=false;
  try{frame.withSelection(file,'module',()=>{});}catch(error){caught=true;assert.strictEqual(error,primary);}assert.equal(caught,true);
  assert.throws(()=>frame.withSelection(file,'module',()=>{}),error=>error===primary);assert.throws(()=>frame.close(),error=>error===primary);assert.throws(()=>frame.withSelection(file,'module',()=>{}),/expired/);frame.close();
 }
});
test('all closing checks run and their failures preserve an existing callback primary',{timeout:10000},()=>{
 const primary=Object.freeze({native:'primary'});let reads=0,failClosing=false;const file={},frame=create({inspect(){return module([]);},resolve(){},current(){reads++;if(failClosing)throw false;},charge(){}});
 assert.throws(()=>frame.withSelection(file,'module',()=>{failClosing=true;throw primary;}),error=>error===primary);assert.ok(reads>=3);assert.throws(()=>frame.close(),error=>error===primary);assert.throws(()=>frame.withSelection(file,'module',()=>{}),/expired/);
});
test('same file with a competing path cannot reuse structural pointers',{timeout:10000},()=>{
 const file={},frame=create({inspect(){return module([]);},resolve(){},current(){},charge(){}});frame.withSelection(file,'first',()=>{});assert.throws(()=>frame.withSelection(file,'second',()=>{}),/competing/);assert.throws(()=>frame.close(),/competing/);
});
test('a long flat import chain stays iterative and the original file cap remains fatal',{timeout:10000},()=>{
 const files=Array.from({length:4097},()=>({})),indices=new Map(files.map((file,at)=>[file,at]));let frame;frame=create({inspect(file){const at=indices.get(file);return module(at<files.length-1?[{file:files[at+1],path:String(at+1)}]:[]);},resolve(job){frame.withSelection(job.file,job.path,()=>{});},current(){},charge(){}});
 assert.throws(()=>frame.withSelection(files[0],'0',()=>{}),/source-file bound/);assert.throws(()=>frame.close(),/source-file bound/);
});
test('ordinary callbacks returning asynchronous work cannot qualify a layout',{timeout:10000},()=>{
 const frame=create({inspect(){return module([{}]);},resolve(){return Promise.resolve(true);},current(){},charge(){}});assert.throws(()=>frame.withSelection({},'module',()=>{}),TypeError);assert.throws(()=>frame.close(),TypeError);
});

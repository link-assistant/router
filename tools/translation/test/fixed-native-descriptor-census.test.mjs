import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {runInNewContext} from 'node:vm';
import {createHash} from 'node:crypto';
import {fixedNativeDescriptorSourcePair,prepareFixedNativeDescriptorCensus} from '../prepare-fixed-native-descriptor-census.mjs';

const get=Object.getOwnPropertyDescriptor,define=Object.defineProperty,apply=Reflect.apply;
const names=['originalBatchedJsonIntrinsicsUnchanged','originalBatchedNamespaceTraversalIntrinsicsUnchanged','originalBatchedDataFreezeIntrinsicsUnchanged'];
const hash=value=>createHash('sha256').update(value).digest('hex');
const outcome=run=>{try{return {value:run()};}catch(error){return {error:{name:error.name,message:get(error,'message')?.value??null}};}};
const field=value=>Object.assign(Object.create(null),value);
function restore(owner,key,before){if(before)define(owner,key,before);else assert.equal(delete owner[key],true);}
async function fixture(t,{coldObserver=false}={}){
 const pair=fixedNativeDescriptorSourcePair(),actual=readFileSync(new URL('../original-json-intrinsics.mjs',import.meta.url),'utf8');assert.equal(actual,pair.after);
 const directory=mkdtempSync(join(tmpdir(),'router-fixed-native-census-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
 const modules={},saved=get(Object,'getOwnPropertyDescriptors'),tape=[];
 try{
  if(coldObserver)define(Object,'getOwnPropertyDescriptors',{...saved,value(...args){tape.push(args.length);return apply(saved.value,this,args);}});
  for(const [side,source]of [['before',pair.before],['current',actual]]){
   const path=join(directory,side+'.mjs');writeFileSync(path,source,{flag:'wx'});assert.equal(hash(readFileSync(path)),hash(source));modules[side]=await import(pathToFileURL(path).href);
  }
 }finally{define(Object,'getOwnPropertyDescriptors',saved);}
 const qualify=()=>{for(const side of ['before','current'])assert.equal(modules[side].originalPrivateParserExpectedCommonIntrinsicsUnchanged(),true);};
 return {pair,modules,tape,qualify};
}
function compare(f,install=()=>()=>{}){
 const reports={};for(const side of ['before','current']){
  reports[side]=[];for(const name of names){const tape=[],undo=install(tape);try{reports[side].push({name,result:outcome(()=>f.modules[side][name]()),tape});}finally{undo();}}
 }
 assert.deepEqual(reports.current,reports.before);return reports.current;
}

test('actual source producer preserves complete normal-Git baseline CST and inverse',{timeout:60000},()=>{
 const result=prepareFixedNativeDescriptorCensus(),row=result.files[0];assert.equal(row.before,row.after);assert.equal(row.original,row.inverse);assert.equal(result.newCaches,false);assert.equal(result.originalRetentionPolicyUnchanged,true);
 assert.equal(hash(row.original),'9c5255ac206087959f2cf2e2c3bd9eb9ad096a2d04648ff7bbdbaefee8cda219');assert.deepEqual(row.sequence.repositoryRules[0].edits,[]);
});
test('complete original and current native guards retain cold and initialized results',{timeout:60000},async t=>{
 const f=await fixture(t);for(const row of compare(f))assert.equal(row.result.value,true);f.qualify();for(const row of compare(f))assert.equal(row.result.value,true);
});
test('all fixed owner data and accessor kinds keep ordered flags and undefined distinctions',{timeout:60000},async t=>{
 const f=await fixture(t);f.qualify();
 for(const [owner,key,change]of [
  [Map.prototype,'get',before=>({...before,value:undefined})],
  [Map.prototype,'get',before=>({...before,writable:!before.writable})],
  [Map.prototype,'get',before=>({get:undefined,set:undefined,enumerable:before.enumerable,configurable:true})],
  [Map.prototype,'size',before=>({value:undefined,writable:false,enumerable:before.enumerable,configurable:true})],
  [Map.prototype,'size',before=>({...before,enumerable:!before.enumerable})],
  [Array.prototype,'fixedCensusExtra',()=>({value:1,configurable:true})],
 ]){
  const before=get(owner,key);compare(f,()=>{define(owner,key,field(change(before)));return ()=>restore(owner,key,before);});assert.deepEqual(get(owner,key),before);
 }
});
test('inherited writable data and accessors preserve the full fallback without invoking them',{timeout:60000},async t=>{
 const f=await fixture(t);f.qualify();const before=get(Object.prototype,'writable');
 for(const value of [false,true,undefined])for(const writable of [false,true])compare(f,()=>{define(Object.prototype,'writable',field({value,writable,configurable:true}));return ()=>restore(Object.prototype,'writable',before);});
 for(const mode of ['get','set','both','undefined']){
  const reports=compare(f,tape=>{const descriptor=field({configurable:true,get:undefined,set:undefined});if(mode==='get'||mode==='both')descriptor.get=()=>{tape.push('get');throw Error('unexpected inherited read');};if(mode==='set'||mode==='both')descriptor.set=()=>{tape.push('set');throw Error('unexpected inherited write');};define(Object.prototype,'writable',descriptor);return ()=>restore(Object.prototype,'writable',before);});
  for(const report of reports)assert.deepEqual(report.tape,[]);
 }
 assert.deepEqual(get(Object.prototype,'writable'),before);
});
test('live native replacements getters and key reorderings retain complete results and tapes',{timeout:60000},async t=>{
 const f=await fixture(t);f.qualify();
 for(const [owner,key]of [[Object,'getOwnPropertyDescriptors'],[Object,'getOwnPropertyDescriptor'],[Reflect,'ownKeys'],[String.prototype,'indexOf'],[RegExp.prototype,'exec']]){
  const before=get(owner,key);compare(f,tape=>{define(owner,key,field({get(){tape.push(key);throw Error('changed native');},configurable:true}));return ()=>define(owner,key,before);});
 }
 const owner=Map.prototype,key='get',keys=Reflect.ownKeys(owner),fields=keys.map(name=>get(owner,name));
 try{delete owner[key];define(owner,key,fields[keys.indexOf(key)]);compare(f);}finally{
  for(const name of Reflect.ownKeys(owner))assert.equal(delete owner[name],true);
  for(let at=0;at<keys.length;at++)define(owner,keys[at],fields[at]);
  assert.deepEqual(Reflect.ownKeys(owner),keys);for(let at=0;at<keys.length;at++)assert.deepEqual(get(owner,keys[at]),fields[at]);
 }
});
test('unknown native lazy stacks never produce a different formatter callback tape',{timeout:60000},async t=>{
 const f=await fixture(t);f.qualify();const before=get(Array.prototype,'stack'),prepare=get(Error,'prepareStackTrace');
 try{compare(f,tape=>{define(Error,'prepareStackTrace',field({value(){tape.push('prepare');return 'lazy';},writable:true,configurable:true}));Error.captureStackTrace(Array.prototype);return ()=>{restore(Array.prototype,'stack',before);restore(Error,'prepareStackTrace',prepare);};});}finally{restore(Array.prototype,'stack',before);restore(Error,'prepareStackTrace',prepare);}
});
test('cold observer and foreign native output realms remain conservative',{timeout:60000},async t=>{
 const observed=await fixture(t,{coldObserver:true});compare(observed);
 const saved=get(Object,'getOwnPropertyDescriptors'),foreign=runInNewContext('Object.getOwnPropertyDescriptors');let f;
 try{define(Object,'getOwnPropertyDescriptors',{...saved,value:foreign});f=await fixture(t);f.qualify();compare(f);}finally{define(Object,'getOwnPropertyDescriptors',saved);}
 compare(f);
});

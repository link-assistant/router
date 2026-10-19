import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {createCompletedDataFreezer,completedDataTraversalExceedsBudget} from '../private-data-freeze.mjs';
import {createPrivateFrozenJsonCache,privateFrozenJsonCacheFacts} from '../private-frozen-json.mjs';

const json=JSON.stringify,apply=Reflect.apply,descriptor=Object.getOwnPropertyDescriptor,define=Object.defineProperty;
const fixture=new URL('./fixtures/completed-json-budget/',import.meta.url),base=new URL('../',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('manifest.json',fixture),'utf8'));
const originals=new Map();
for(const row of manifest.sources){const bytes=readFileSync(new URL(row.storedPath,fixture));assert.equal(bytes.length,row.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),row.sha256);originals.set(row.path,bytes.toString('utf8'));}
const directory=mkdtempSync(join(tmpdir(),'router-completed-json-budget-'));
after(()=>rmSync(directory,{recursive:true,force:true}));
const original=originals.get('tools/translation/private-frozen-json.mjs'),relocations=[];
const relocated=original.replace(/\bfrom (['"])(\.\/[^'"]+)\1/g,(_all,quote,path)=>{const target=new URL(path,base).href;relocations.push({path,target});return 'from '+quote+target+quote;});
const oldPath=join(directory,'private-frozen-json-before.mjs');writeFileSync(oldPath,relocated,{flag:'wx'});
const old=await import(pathToFileURL(oldPath).href);
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const complete=createCompletedDataFreezer(freeze);
function aliases(depth,scalar=1){let value={value:scalar};for(let at=0;at<depth;at++)value={left:value,right:value};return value;}
const retain=(name,value)=>{const path=process.env.ROUTER_COMPLETED_JSON_BUDGET_VECTOR_DIR;if(path){mkdirSync(path,{recursive:true});writeFileSync(join(path,name+'.json.gz'),gzipSync(json(value,(_key,item)=>typeof item==='bigint'?{$bigint:item.toString()}:item)+'\n'),{flag:'wx'});}};
function census(root){const ids=new Map(),pending=[root],nodes=[];ids.set(root,0);for(let at=0;at<pending.length;at++){const item=pending[at],fields=[];for(const key of Reflect.ownKeys(item)){const field=descriptor(item,key),value=field.value;let selected;if(value!==null&&typeof value==='object'){if(!ids.has(value)){ids.set(value,pending.length);pending.push(value);}selected={node:ids.get(value)};}else selected={type:typeof value,value:typeof value==='bigint'?value.toString():value};fields.push({key,value:selected,enumerable:field.enumerable,writable:field.writable,configurable:field.configurable});}nodes.push({index:at,prototype:Object.getPrototypeOf(item)===Object.prototype?'Object.prototype':null,frozen:Object.isFrozen(item),fields});}return {root:0,nodes};}

test('complete before sources and private completed cost boundaries preserve scalar saturation without issuing positive authority',{timeout:15000},()=>{
 const restored=relocated.replace(/\bfrom (['"])(file:[^'"]+)\1/g,(whole,quote,target)=>{const row=relocations.find(row=>row.target===target);return row?'from '+quote+row.path+quote:whole;});assert.equal(restored,original);
 const below=complete(aliases(16)),above=complete(aliases(17)),fake=freeze(aliases(1));let calls=0;
 const observations=[];for(const [value,budget,wanted]of [[below,196606,true],[below,196607,false],[below,200000,false],[above,200000,true],[above,200001,false],[fake,0,false],[structuredClone(below),0,false],[null,0,false],[above,-1,false],[above,.5,false],[above,Infinity,false],[above,NaN,false],[above,{valueOf(){calls++;return 0;}},false]]){const actual=completedDataTraversalExceedsBudget(value,budget);observations.push({budgetType:typeof budget,budget:typeof budget==='number'?String(budget):null,wanted,actual});assert.equal(actual,wanted);}
 const proxy=new Proxy({},{get(){calls++;throw Error('proxy get');},ownKeys(){calls++;throw Error('proxy keys');}});assert.equal(completedDataTraversalExceedsBudget(proxy,0),false);assert.equal(calls,0);
 retain('01-full-source-and-cost-boundaries',{manifest,originals:[...originals],relocated,relocations,below:census(below),above:census(above),logicalCells:{below:3*2**16-1,above:3*2**17-1,saturation:200001},observations,calls});
});

test('completed oversized JSON misses retain complete ordinary bytes while admissible roots retain capture and hit behavior',{timeout:15000},()=>{
 const cache=createPrivateFrozenJsonCache(),legacy=old.createPrivateFrozenJsonCache(),below=complete(aliases(16)),above=complete(aliases(17));
 const before=privateFrozenJsonCacheFacts(),small=cache(below),middle=privateFrozenJsonCacheFacts();assert.equal(small,legacy(below));assert.equal(small,json(below));assert.ok(middle.captures>before.captures);assert.equal(middle.eligibilityMemo.completedBudgetRefusals,before.eligibilityMemo.completedBudgetRefusals);assert.equal(cache(below),small);const hit=privateFrozenJsonCacheFacts();assert.ok(hit.hits>middle.hits);
 const expected=legacy(above),actual=cache(above),after=privateFrozenJsonCacheFacts();assert.equal(actual,expected);assert.equal(actual,json(above));assert.equal(after.captures,hit.captures);assert.equal(after.eligibilityMemo.completedBudgetRefusals,hit.eligibilityMemo.completedBudgetRefusals+1);assert.equal(after.eligibilityMemo.captures,hit.eligibilityMemo.captures);assert.equal(after.eligibilityMemo.misses,hit.eligibilityMemo.misses);
 assert.equal(cache(above),actual);const repeated=privateFrozenJsonCacheFacts();assert.equal(repeated.eligibilityMemo.completedBudgetRefusals,after.eligibilityMemo.completedBudgetRefusals+1);
 retain('02-full-comparison-bytes-and-honest-telemetry',{below:census(below),above:census(above),small,expected,actual,before,middle,hit,after,repeated,scope:'traversal statistics intentionally differ; output bytes and existing cache limits do not'});
});

test('unknown costs and completed root eviction retain the full previous eligibility walk and exact bytes',{timeout:15000},()=>{
 const unknown=freeze(aliases(17)),cache=createPrivateFrozenJsonCache(),before=privateFrozenJsonCacheFacts();assert.equal(completedDataTraversalExceedsBudget(unknown,200000),false);const expected=old.createPrivateFrozenJsonCache()(unknown),actual=cache(unknown),after=privateFrozenJsonCacheFacts();assert.equal(actual,expected);assert.ok(after.eligibilityMemo.misses>before.eligibilityMemo.misses);assert.equal(after.eligibilityMemo.completedBudgetRefusals,before.eligibilityMemo.completedBudgetRefusals);
 const known=complete(aliases(17));assert.equal(completedDataTraversalExceedsBudget(known,200000),true);const churn=[];for(let at=0;at<1025;at++){const value={index:at};churn.push(value);complete(value);}assert.equal(completedDataTraversalExceedsBudget(known,200000),false);const prior=privateFrozenJsonCacheFacts(),replayed=cache(known),end=privateFrozenJsonCacheFacts();assert.equal(replayed,expected);assert.ok(end.eligibilityMemo.misses>prior.eligibilityMemo.misses);assert.equal(end.eligibilityMemo.completedBudgetRefusals,prior.eligibilityMemo.completedBudgetRefusals);
 retain('03-full-unknown-eviction-and-fallback',{unknown:census(unknown),known:census(known),churn,expected,actual,replayed,before,after,prior,end});
});

test('live native changes preserve complete ordinary callbacks and errors before any completed-cost shortcut',{timeout:15000},()=>{
 const value=complete(aliases(17)),big=complete(aliases(17,1n)),observations=[];
 for(const [owner,key]of [[JSON,'stringify'],[WeakMap.prototype,'get'],[Object,'getOwnPropertyDescriptor'],[Object,'freeze']]){
  function run(module){const cache=module.createPrivateFrozenJsonCache(),prior=descriptor(owner,key),tape=[];let actual,error,query;try{define(owner,key,{...prior,value:function(...args){tape.push({operation:key,firstSame:args[0]===value});return apply(prior.value,this,args);}});query=completedDataTraversalExceedsBudget(value,200000);try{actual=cache(value);}catch(cause){error={name:cause.name,message:cause.message};}}finally{define(owner,key,prior);}return {query,actual,error,tape};}
  const expected=run(old),actual=run({createPrivateFrozenJsonCache});retain('04-complete-hook-'+key,{key,value:census(value),expected,actual});assert.deepEqual(actual,expected);assert.equal(actual.query,false);if(key==='stringify')assert.equal(actual.tape.length,1);else assert.equal(actual.tape.length,0);observations.push({key,expected,actual});
 }
 function fail(cache){try{cache(big);return {accepted:true};}catch(error){return {accepted:false,name:error.name,message:error.message,stack:error.stack,nativeTypeError:error instanceof TypeError,prototypeName:Object.getPrototypeOf(error).name};}}
 const expected=fail(old.createPrivateFrozenJsonCache()),actual=fail(createPrivateFrozenJsonCache());retain('04-complete-BigInt-errors',{big:census(big),expected,actual,observations});assert.equal(actual.accepted,false);assert.equal(actual.nativeTypeError,true);assert.equal(actual.name,expected.name);assert.equal(actual.message,expected.message);assert.equal(actual.prototypeName,expected.prototypeName);
});

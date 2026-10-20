import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {gzipSync} from 'node:zlib';
import {createCompletedDataFreezer} from '../private-data-freeze.mjs';
import {createRetainedPrivateScalarCostStore,withRetainedPrivateNativeProofCostScope,withPrivateNativeProofCostScope,createScopedPrivateNativeProofJsonSerializer} from '../private-native-proof-json.mjs';
import {invocationLocalFreezerSourcePairs,prepareInvocationLocalFreezer} from '../prepare-invocation-local-freezer.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {relocateSourceModule} from './relocate-source-module.mjs';
const origin=new URL('../private-data-freeze.mjs',import.meta.url);
function retain(name,value){const dir=process.env.ROUTER_INVOCATION_FREEZER_VECTORS;if(dir){mkdirSync(dir,{recursive:true});writeFileSync(join(dir,name+'.json.gz'),gzipSync(JSON.stringify(value)+'\n'),{flag:'wx'});}}
function legacy(value){if(value&&typeof value==='object'){Object.values(value).forEach(legacy);Object.freeze(value);}return value;}
function census(value,seen=new Map()){
 if(value===null||typeof value!=='object')return {kind:typeof value,value:['bigint','symbol'].includes(typeof value)?String(value):value};
 if(seen.has(value))return {reference:seen.get(value)};
 const id=seen.size;seen.set(value,id);
 return {id,array:Array.isArray(value),nullPrototype:Object.getPrototypeOf(value)===null,frozen:Object.isFrozen(value),fields:Reflect.ownKeys(value).map(name=>{const d=Object.getOwnPropertyDescriptor(value,name);return {name:typeof name==='symbol'?String(name):name,enumerable:d.enumerable,configurable:d.configurable,...(Object.hasOwn(d,'value')?{writable:d.writable,value:census(d.value,seen)}:{get:!!d.get,set:!!d.set})};})};
}
async function before(t){
 const pair=invocationLocalFreezerSourcePairs().find(row=>row.path.endsWith('/private-data-freeze.mjs')),directory=mkdtempSync(join(tmpdir(),'router-invocation-freezer-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
 const relocated=relocateSourceModule(pair.original,origin.href);assert.equal(relocated.inverse,pair.original);
 const file=join(directory,'complete-original.mjs');writeFileSync(file,relocated.text);assert.equal(readFileSync(file,'utf8'),relocated.text);
 return (await import(pathToFileURL(file).href)).createCompletedDataFreezer;
}
function observe(factory,make){
 let fallbacks=0;const tape=[],value=make(tape),freeze=factory(value=>{fallbacks++;return legacy(value);});
 const first=freeze(value),second=freeze(value);assert.equal(first,value);assert.equal(second,value);
 return {fallbacks,tape,data:census(value)};
}

test('source producer retains both complete normal-Git originals and reparsed CST inverses',{timeout:60000},()=>{
 const proposal=prepareInvocationLocalFreezer();assert.equal(proposal.files.length,2);
 for(const row of proposal.files){assert.equal(row.before,row.after);assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.original);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.after);assert.equal(row.inverse,row.original);assert.deepEqual(row.trace.map(x=>x.phase),['language','repository']);}
 assert.equal(proposal.newAcrossInvocationCache,false);assert.equal(proposal.globalRetentionPolicyUnchanged,true);retain('complete-source-proposal',proposal);
});

test('whole immutable aliased DATA has the same descriptors and scalar JSON inside and outside a scope',{timeout:60000},async t=>{
 const old=await before(t),make=()=>{const shared={text:'é猫😀',values:[1,true,null]},nullOwner=Object.assign(Object.create(null),{shared});return {left:shared,right:shared,list:[nullOwner,shared],missing:undefined};};
 for(const scoped of [false,true]){const run=()=>{const baseline=observe(old,make),current=observe(createCompletedDataFreezer,make);assert.deepEqual(current,baseline);retain('complete-aliased-DATA-'+scoped,{baseline,current});};if(scoped)withRetainedPrivateNativeProofCostScope(run);else run();}
});

test('a caller-created arithmetic store cannot forge the private freezer cost record',{timeout:60000},()=>{
 const unrelated=createRetainedPrivateScalarCostStore(),other=createRetainedPrivateScalarCostStore();assert.equal(unrelated(),null);
 withRetainedPrivateNativeProofCostScope(()=>{
  const store=unrelated(),second=other();assert.ok(store);assert.ok(second);assert.notEqual(store,second);
  const child={value:7},value={child};store.values.set(value,1);store.values.set(child,1);
  const freeze=createCompletedDataFreezer(legacy);assert.equal(freeze(value),value);assert.ok(Object.isFrozen(value));assert.ok(Object.isFrozen(child));assert.equal(second.values.get(value),undefined);
 });assert.equal(unrelated(),null);
});

test('scope close throw nesting and Promise returns never reuse a closed invocation store',{timeout:60000},async()=>{
 const current=createRetainedPrivateScalarCostStore(),marker=new RangeError('exact scope marker'),value={};let first,inner,reads=0;
 withRetainedPrivateNativeProofCostScope(()=>{first=current();first.values.set(value,17);withRetainedPrivateNativeProofCostScope(()=>{inner=current();assert.notEqual(inner,first);assert.equal(inner.values.get(value),undefined);});assert.equal(current(),first);withPrivateNativeProofCostScope(()=>assert.equal(current(),first));});
 assert.equal(current(),null);assert.throws(()=>withRetainedPrivateNativeProofCostScope(()=>{assert.notEqual(current(),first);throw marker;}),error=>error===marker);assert.equal(current(),null);
 const thenable=withRetainedPrivateNativeProofCostScope(()=>({get then(){reads++;throw marker;}}));assert.equal(reads,0);assert.equal(typeof Object.getOwnPropertyDescriptor(thenable,'then').get,'function');assert.equal(current(),null);
 const promise=Promise.resolve(7);assert.equal(withRetainedPrivateNativeProofCostScope(()=>promise),promise);assert.equal(current(),null);assert.equal(await promise,7);
});

test('accessors proxies hidden fields sparse arrays and native fallback effects match the complete original',{timeout:60000},async t=>{
 const old=await before(t),models=[
  tape=>({first:{value:1},get later(){tape.push('getter');return {value:2};}}),
  tape=>new Proxy({value:1},{get(target,name,receiver){tape.push('get:'+String(name));return Reflect.get(target,name,receiver);},ownKeys(target){tape.push('keys');return Reflect.ownKeys(target);}}),
  ()=>Object.defineProperty({visible:1},'hidden',{value:{untouched:true}}),
  ()=>{const a=[];a[3]={value:7};return {a};},
  ()=>({value:1n,other:Symbol('independent')}),
 ];
 for(let index=0;index<models.length;index++)withRetainedPrivateNativeProofCostScope(()=>{const baseline=observe(old,models[index]),current=observe(createCompletedDataFreezer,models[index]);assert.deepEqual(current,baseline);retain('complete-fallback-'+index,{baseline,current});});
});

test('changed WeakMap intrinsics retain the exact legacy callback route without acquiring stored facts',{timeout:60000},async t=>{
 const old=await before(t),get=Object.getOwnPropertyDescriptor,define=Object.defineProperty,apply=Reflect.apply;
 for(const name of ['get','set']){const prior=get(WeakMap.prototype,name),rows=[];
  for(const factory of [old,createCompletedDataFreezer]){let calls=0,result;try{define(WeakMap.prototype,name,{...prior,value(...args){calls++;return apply(prior.value,this,args);}});withRetainedPrivateNativeProofCostScope(()=>{result=observe(factory,()=>({child:{value:1}}));});}finally{define(WeakMap.prototype,name,prior);}rows.push({calls,result});}
  assert.deepEqual(rows[1],rows[0]);retain('complete-live-WeakMap-'+name,rows);
 }
});

test('logical alias depth and cells still select the complete original fallback boundaries',{timeout:60000},async t=>{
 const old=await before(t),models=[];
 for(const depth of [16,17,18,159,160,161])models.push(()=>{let value={leaf:1};for(let at=0;at<depth;at++)value=at<18?{left:value,right:value}:{child:value};return value;});
 // These cases compare admission and the exact fallback identity without
 // expanding an intentionally repeated tree in the legacy recursive closure.
 for(let index=0;index<models.length;index++){const rows=[];for(const factory of [old,createCompletedDataFreezer])withRetainedPrivateNativeProofCostScope(()=>{let fallbacks=0;const value=models[index](),freeze=factory(input=>{fallbacks++;return input;});assert.equal(freeze(value),value);rows.push({fallbacks,rootFrozen:Object.isFrozen(value)});});assert.deepEqual(rows[1],rows[0]);retain('complete-logical-boundary-'+index,rows);}
});

test('frozen cost reuse preserves native JSON bytes and mutable descendants do not become immutable',{timeout:60000},()=>{
 const freeze=createCompletedDataFreezer(legacy),serial=createScopedPrivateNativeProofJsonSerializer(),mutable={values:[1,2]},shallow=Object.freeze({mutable});
 withRetainedPrivateNativeProofCostScope(()=>{const value=freeze({left:{values:Array(80).fill('猫😀')},missing:undefined});const expected=JSON.stringify(value);assert.equal(serial(value),expected);assert.equal(serial(value),expected);assert.equal(serial(shallow),JSON.stringify(shallow));mutable.values[0]=7;assert.equal(serial(shallow),JSON.stringify(shallow));assert.equal(Object.isFrozen(mutable),false);retain('complete-JSON-storage',{expected,actual:serial(value),mutable:serial(shallow)});});
});

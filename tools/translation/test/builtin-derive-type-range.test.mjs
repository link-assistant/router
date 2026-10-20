import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash,Hash} from 'node:crypto';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {captureOriginalBuiltinDeriveTypeRange,originalBuiltinDeriveTypeRangeFacts} from '../builtin-derive-type-range.mjs';
import {prepareBuiltinDeriveTypeRange} from '../prepare-builtin-derive-type-range.mjs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
const root=new URL('../../../',import.meta.url),inputs={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')},dependencies=loadDeriveDependencyProof(inputs);
const hash=value=>createHash('sha256').update(value).digest('hex');
const facts=name=>{const token=captureOriginalBuiltinDeriveTypeRange(dependencies,name);return {token,value:originalBuiltinDeriveTypeRangeFacts(token,dependencies,name)};};
test('all eight actual sibling derives have source-registered callback ranges and both PartialEq emissions',{timeout:60000},()=>{
 for(const name of ['Clone','Copy','Debug','PartialEq','Eq','PartialEq','Eq','Debug']){
  const {value}=facts(name);assert.equal(value.name,name);assert.equal(value.owner.name,name);assert.equal(value.forwards.length,name==='PartialEq'?2:1);
  assert.deepEqual(value.conditionalRange.emittedCallbackItemKinds,['ItemKind::Impl']);assert.deepEqual(value.conditionalRange.newEnclosingTypeBindings,[]);
  for(const callback of Object.values(value.callbacks)){assert.ok(callback.original.startsWith('fn '));assert.equal(callback.original.length,callback.span.end-callback.span.start);assert.equal(callback.sourceSha256.length,64);}
  assert.ok(value.rules.every(rule=>rule.completeCallbackRetained&&rule.original.length>0));assert.equal(value.callbacks.entry.path,value.owner.registration.callback[0]==='partial_eq'?'compiler/rustc_builtin_macros/src/deriving/cmp/partial_eq.rs':value.callbacks.entry.path);
 }
});
test('a conditional item range never selects actual caller attribute owners or closes generated hygiene',{timeout:60000},()=>{
 const {value}=facts('Debug');for(const key of ['callerOwnerResolved','generatedOuterAttributeOwnersResolved','macroExportExceptionClosed','completeGeneratedOutput','namespaceAuthority','runtimeAuthority','wholeCompilerExecuted'])assert.equal(value[key],false,key);
 assert.equal(value.conditionalRange.originalInputItemPreservationBySeparateDispatcherProved,false);assert.equal(value.independentObligations.length,4);assert.ok(value.independentObligations.some(row=>row.includes('MacroNS')));assert.ok(value.resolver.recipes.some(row=>row.role.includes('block restores')));
});
test('source and private token copies proxies reports and foreign dependencies cannot select this range',{timeout:60000},()=>{
 const {token,value}=facts('Clone'),foreign=loadDeriveDependencyProof(inputs);
 for(const candidate of [structuredClone(token),{...token},structuredClone(value),new Proxy(token,{})])assert.throws(()=>originalBuiltinDeriveTypeRangeFacts(candidate,dependencies,'Clone'),/copied/);
 assert.throws(()=>originalBuiltinDeriveTypeRangeFacts(token,foreign,'Clone'),/foreign/);assert.throws(()=>originalBuiltinDeriveTypeRangeFacts(token,dependencies,'Copy'),/changed/);
 assert.throws(()=>captureOriginalBuiltinDeriveTypeRange(structuredClone(dependencies),'Clone'),TypeError);assert.throws(()=>captureOriginalBuiltinDeriveTypeRange(dependencies,'UnregisteredDerive'),TypeError);assert.throws(()=>{value.conditionalRange.emittedCallbackItemKinds.push('ItemKind::Struct');},TypeError);
});
test('each read rehashes complete originals and reissues current range data',{timeout:60000},()=>{
 const {token,value}=facts('Eq'),current=originalBuiltinDeriveTypeRangeFacts(token,dependencies,'Eq');assert.notStrictEqual(value,current);assert.notStrictEqual(value.callbacks,current.callbacks);assert.deepEqual(value,current);
 const descriptor=Object.getOwnPropertyDescriptor(Hash.prototype,'update'),apply=Reflect.apply,observed=[];
 try{Object.defineProperty(Hash.prototype,'update',{...descriptor,value(value,...args){observed.push(value);return apply(descriptor.value,this,[value,...args]);}});assert.deepEqual(originalBuiltinDeriveTypeRangeFacts(token,dependencies,'Eq'),current);}finally{Object.defineProperty(Hash.prototype,'update',descriptor);}
 assert.ok(observed.some(source=>source===current.callbacks.entry.original));assert.ok(observed.some(source=>typeof source==='string'&&hash(source)===current.callbacks.entry.sourceSha256));
});
test('changed private source operations reject before executing an observable replacement callback',{timeout:60000},()=>{
 const {token}=facts('Copy');for(const [owner,key]of [[WeakMap.prototype,'get'],[WeakMap.prototype,'set'],[Object,'values'],[Object,'freeze']]){
  const before=Object.getOwnPropertyDescriptor(owner,key);let calls=0,error;
  try{Object.defineProperty(owner,key,{...before,value(){calls++;throw 'replacement callback';}});try{originalBuiltinDeriveTypeRangeFacts(token,dependencies,'Copy');}catch(value){error=value;}}finally{Object.defineProperty(owner,key,before);}
  assert.ok(error instanceof TypeError,key);assert.equal(calls,0,key);
 }
});
test('complete authored source uses native TypeScript AST copies and both reversible CST layers',{timeout:60000},()=>{
 const copy=prepareBuiltinDeriveTypeRange();assert.equal(copy.typescriptVersion,'5.9.3');assert.equal(copy.completeNativeAstCopy,true);assert.equal(copy.actual,readFileSync(new URL('../builtin-derive-type-range.mjs',import.meta.url),'utf8'));assert.equal(copy.originalSha256,hash(copy.original));assert.ok(copy.callbacks.length>=8);assert.deepEqual(copy.stages.map(stage=>stage.phase),['language','repository']);assert.ok(copy.stages.every(stage=>stage.completeInverse));assert.equal(copy.RustProgramExecuted,false);
});

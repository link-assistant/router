import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash,Hash} from 'node:crypto';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {originalMacroProducerKindSourcePlan,requireOriginalMacroProducerKindSourcePlan} from '../macro-producer-kind-source.mjs';
import {originalBuiltinDataItemTransferSourcePlan,requireOriginalBuiltinDataItemTransferSourcePlan} from '../builtin-data-item-transfers.mjs';
import {prepareBuiltinProducerSourceClosures} from '../prepare-builtin-producer-source-closures.mjs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
const root=new URL('../../../',import.meta.url),inputs={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')},dependencies=loadDeriveDependencyProof(inputs);
const hash=value=>createHash('sha256').update(value).digest('hex');
test('complete compiler inputs retain explicit-name replacement and all registered AttrLike callback kinds',{timeout:60000},()=>{
 const plan=originalMacroProducerKindSourcePlan(dependencies);assert.equal(plan.sources.length,18);assert.equal(plan.completeBodies.length,16);assert.ok(plan.completeBodies.every(row=>row.completeBodyChecked));
 for(const source of plan.sources){assert.equal(hash(source.source),source.sha256);assert.equal(Buffer.byteLength(source.source),source.bytes);}
 assert.equal(plan.attributeRegistration.entries.length,12);assert.equal(plan.attributeRegistration.directAttributes.length,2);assert.equal(plan.genericRanges.length,11);assert.equal(plan.exceptional.length,1);
 assert.ok(plan.recipes.some(row=>row.conclusion.includes('explicit original argument')));assert.ok(plan.recipes.some(row=>row.conclusion.includes('local procedural registration')));assert.ok(plan.retainedBranches.some(row=>row.includes('foreign procedural')));
 for(const key of ['producerUniverseClosed','dataItemEffectsClosed','namespaceAuthority','runtimeAuthority','wholeCompilerExecuted'])assert.equal(plan[key],false,key);
 assert.ok(plan.callbacks.macroUse.original.includes('ExternCrateLoadingMacroNotAtCrateRoot'));assert.ok(plan.callbacks.macroUse.original.includes('macro_use_prelude'));assert.ok(plan.callbacks.foreign.original.includes('LoadedMacro::ProcMacro(ext)'));
});
test('copied plans proxies frozen reports and foreign dependency issuers cannot select producer facts',{timeout:60000},()=>{
 const value=originalMacroProducerKindSourcePlan(dependencies),foreign=loadDeriveDependencyProof(inputs);for(const copy of [{...value},structuredClone(value),new Proxy(value,{})])assert.throws(()=>requireOriginalMacroProducerKindSourcePlan(copy,dependencies),/copied|foreign/);
 assert.throws(()=>requireOriginalMacroProducerKindSourcePlan(value,foreign),/foreign/);assert.throws(()=>originalMacroProducerKindSourcePlan(structuredClone(dependencies)),TypeError);
 assert.throws(()=>{value.attributeRegistration.entries.push({name:'arbitrary'});},TypeError);
});
test('each current producer read rehashes whole source inputs instead of using a prior source or verdict cache',{timeout:60000},()=>{
 const value=originalMacroProducerKindSourcePlan(dependencies),fresh=originalMacroProducerKindSourcePlan(dependencies);assert.notStrictEqual(value,fresh);assert.notStrictEqual(value.sources,fresh.sources);assert.deepEqual(value.sources,fresh.sources);
 const descriptor=Object.getOwnPropertyDescriptor(Hash.prototype,'update'),apply=Reflect.apply,observed=[];try{Object.defineProperty(Hash.prototype,'update',{...descriptor,value(value,...args){observed.push(value);return apply(descriptor.value,this,[value,...args]);}});requireOriginalMacroProducerKindSourcePlan(value,dependencies);}finally{Object.defineProperty(Hash.prototype,'update',descriptor);}
 for(const source of value.sources)assert.ok(observed.includes(source.source),source.path);
});
test('conditional data routes account for every actual attribute registration without granting caller or token origins',{timeout:60000},()=>{
 const value=originalBuiltinDataItemTransferSourcePlan(dependencies);assert.equal(value.rules.length,23);assert.ok(value.rules.every(row=>row.completeBodyChecked||row.completeDominatingPrefixChecked));assert.equal(value.legacyAttributes.length,12);assert.equal(value.directAttributes.length,2);
 assert.ok(value.legacyAttributes.every(row=>row.rules.length&&row.rules.every(Boolean)));assert.ok(value.directAttributes.every(row=>row.rules.length===5));assert.equal(value.genericDerives.length,11);assert.ok(value.coercePointee.completeDominatingPrefixChecked);
 assert.deepEqual(value.possibleOuterItems,['same original data item','ItemKind::Impl']);assert.deepEqual(value.conditions.genericParameters,[]);assert.deepEqual(value.conditions.nestedCfgAttributes,[]);assert.deepEqual(value.conditions.rootFnTokens,[]);assert.equal(value.conditions.interpolatedTokens,false);
 for(const key of ['callerConditionsJoined','foreignProceduralProvidersExcluded','originalItemTokenOriginJoined','namespaceAuthority','runtimeAuthority','wholeCompilerExecuted'])assert.equal(value[key],false,key);
 assert.strictEqual(requireOriginalBuiltinDataItemTransferSourcePlan(value,dependencies),value);assert.throws(()=>requireOriginalBuiltinDataItemTransferSourcePlan({...value},dependencies),/copied/);
});
test('changed private owners reject before replacement JSON WeakMap and freeze callbacks execute',{timeout:60000},()=>{
 const value=originalMacroProducerKindSourcePlan(dependencies);for(const [owner,key]of [[JSON,'parse'],[WeakMap.prototype,'get'],[WeakMap.prototype,'set'],[Object,'freeze']]){
  const before=Object.getOwnPropertyDescriptor(owner,key);let calls=0,error;try{Object.defineProperty(owner,key,{...before,value(){calls++;throw 'replacement callback';}});try{requireOriginalMacroProducerKindSourcePlan(value,dependencies);}catch(value){error=value;}}finally{Object.defineProperty(owner,key,before);}
  assert.ok(error instanceof TypeError,key);assert.equal(calls,0,key);
 }
});
test('complete finite producer and data transfer programs use native TS copies and ordered reversible CST layers',{timeout:60000},()=>{
 const values=prepareBuiltinProducerSourceClosures();assert.equal(values.length,2);for(const value of values){assert.equal(value.typescriptVersion,'5.9.3');assert.equal(value.completeNativeAstCopy,true);assert.equal(value.original,value.actual);assert.equal(value.actual,readFileSync(new URL('../'+value.path.split('/').at(-1),import.meta.url),'utf8'));assert.equal(hash(value.original),value.originalSha256);assert.deepEqual(value.stages.map(row=>row.phase),['language','repository']);assert.ok(value.stages.every(row=>row.completeInverse));assert.equal(value.RustProgramExecuted,false);}
});

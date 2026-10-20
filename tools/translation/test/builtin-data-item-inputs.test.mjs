import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash,Hash} from 'node:crypto';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {captureOriginalExternalTraitPackage,originalExternalTraitPackageInputs} from '../extensions/external-trait-sources.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {captureOriginalBuiltinDataItemInput,originalBuiltinDataItemInputFacts,originalBuiltinDataInputSourcePlan} from '../builtin-data-item-inputs.mjs';
import {prepareBuiltinDataItemInputs} from '../prepare-builtin-data-item-inputs.mjs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
const root=new URL('../../../',import.meta.url),inputs={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')},dependencies=loadDeriveDependencyProof(inputs),packageToken=captureOriginalExternalTraitPackage(dependencies,'base64'),pin=originalExternalTraitPackageInputs(packageToken).sources.find(row=>row.path==='src/engine/mod.rs'),items=sourceItems(pin.source).filter(row=>['struct','enum'].includes(row.term));
const capture=item=>captureOriginalBuiltinDataItemInput(dependencies,packageToken,pin.path,item.start,item.end),facts=token=>originalBuiltinDataItemInputFacts(token,dependencies,packageToken),hash=value=>createHash('sha256').update(value).digest('hex');
test('actual two Engine sibling inputs join their private package sources and every conditional data precondition',{timeout:60000},()=>{
 assert.equal(items.length,2);for(const item of items){const value=facts(capture(item));assert.equal(value.data.name,item.name);assert.equal(value.source,pin.path);assert.equal(value.sourceSha256,hash(pin.source));assert.equal(value.original,pin.source.slice(item.start,item.end));assert.equal(value.sourceInputConditionsJoined,true);assert.equal(value.originalItemTokenOriginJoined,true);assert.equal(value.sourcePlan.equations.length,13);assert.deepEqual(value.joinedConditions.genericParameters,[]);assert.deepEqual(value.joinedConditions.nestedCfgAttributes,[]);assert.deepEqual(value.joinedConditions.rootFnTokens,[]);assert.equal(value.joinedConditions.interpolatedTokens,false);assert.equal(value.joinedConditions.originalInputUnmutated,true);for(const key of ['callbackSelected','foreignProceduralProvidersExcluded','namespaceAuthority','runtimeAuthority','wholeCompilerExecuted'])assert.equal(value[key],false,key);}
});
test('native original Item field projections use actual macro expansions and complete P forwarding',{timeout:60000},()=>{
 const value=originalBuiltinDataInputSourcePlan();assert.equal(value.sources.length,5);assert.ok(value.equations.every(row=>row.completeBodyChecked));assert.equal(value.fieldProjection.itemProjections.length,2);assert.equal(value.fieldProjection.forwarding.length,2);
 for(const row of value.fieldProjection.itemProjections){assert.ok(row.completeBodyChecked);assert.ok(row.selected.includes('Item'));assert.ok(row.definition);assert.ok(row.expansion);}assert.ok(value.fieldProjection.forwarding.every(row=>row.completeBodyChecked));
 assert.ok(value.callbacks.lazy.original.includes('node_replacements.is_empty()'));assert.ok(value.callbacks.capture.original.includes('definite_capture_mode'));assert.ok(value.callbacks.make.original.includes('AttrTokenTree::Token(token, spacing)'));
});
test('private source input reports copies proxies changed spans and foreign dependencies cannot issue a data input',{timeout:60000},()=>{
 const token=capture(items[0]),value=facts(token),foreign=loadDeriveDependencyProof(inputs);for(const copy of [{...token},structuredClone(token),new Proxy(token,{}),value])assert.throws(()=>facts(copy),/copied|foreign/);
 assert.throws(()=>originalBuiltinDataItemInputFacts(token,foreign,packageToken),/foreign/);assert.throws(()=>originalBuiltinDataItemInputFacts(token,dependencies,{...packageToken}),/foreign/);assert.throws(()=>captureOriginalBuiltinDataItemInput(dependencies,packageToken,pin.path,items[0].start+1,items[0].end),/absent/);
 assert.throws(()=>captureOriginalBuiltinDataItemInput(dependencies,packageToken,'src/engine/mod.rs',items[0].start,items[1].end),/absent/);assert.throws(()=>{value.joinedConditions.itemKinds.push('Fn');},TypeError);
});
test('current input reads freshly rehash the complete package source and native source originals',{timeout:60000},()=>{
 const token=capture(items[1]),value=facts(token),descriptor=Object.getOwnPropertyDescriptor(Hash.prototype,'update'),apply=Reflect.apply,seen=[];let fresh;
 try{Object.defineProperty(Hash.prototype,'update',{...descriptor,value(value,...args){seen.push(value);return apply(descriptor.value,this,[value,...args]);}});fresh=facts(token);}finally{Object.defineProperty(Hash.prototype,'update',descriptor);}
 assert.notStrictEqual(value,fresh);assert.deepEqual(value,fresh);assert.ok(seen.includes(pin.source));for(const source of value.sourcePlan.sources)assert.ok(seen.includes(source.source),source.path);
});
test('changed live cold and hash-installed native JSON owners refuse before replacement callbacks',{timeout:60000},async()=>{
 const token=capture(items[0]),parse=Object.getOwnPropertyDescriptor(JSON,'parse');let calls=0,error,cold;
 try{Object.defineProperty(JSON,'parse',{...parse,value(){calls++;throw 'replacement';}});try{facts(token);}catch(value){error=value;}cold=await import('../builtin-data-item-inputs.mjs?cold-json-data-input');try{cold.captureOriginalBuiltinDataItemInput(dependencies,packageToken,pin.path,items[0].start,items[0].end);}catch(value){assert.ok(value instanceof TypeError);}}finally{Object.defineProperty(JSON,'parse',parse);}assert.ok(error instanceof TypeError);assert.equal(calls,0);
 const update=Object.getOwnPropertyDescriptor(Hash.prototype,'update'),apply=Reflect.apply;error=null;try{Object.defineProperty(Hash.prototype,'update',{...update,value(value,...args){const result=apply(update.value,this,[value,...args]);Object.defineProperty(JSON,'parse',{...parse,value(){calls++;throw 'replacement';}});return result;}});try{facts(token);}catch(value){error=value;}}finally{Object.defineProperty(Hash.prototype,'update',update);Object.defineProperty(JSON,'parse',parse);}assert.ok(error instanceof TypeError);assert.equal(calls,0);
});
test('complete data input program copies through native TS and both ordered CST layers with inverses',{timeout:60000},()=>{
 const value=prepareBuiltinDataItemInputs();assert.equal(value.typescriptVersion,'5.9.3');assert.equal(value.completeNativeAstCopy,true);assert.equal(value.original,value.actual);assert.equal(value.actual,readFileSync(new URL('../builtin-data-item-inputs.mjs',import.meta.url),'utf8'));assert.equal(hash(value.original),value.originalSha256);assert.deepEqual(value.stages.map(row=>row.phase),['language','repository']);assert.ok(value.stages.every(row=>row.completeInverse));assert.equal(value.RustProgramExecuted,false);
});

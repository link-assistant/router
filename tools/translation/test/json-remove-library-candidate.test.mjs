import testCase from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync,copyFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {resolveModuleGraph} from '../project.mjs';
import {resolveModuleBindings} from '../module-bindings.mjs';
import {registeredStandardHostBindings} from '../standard-host-bindings.mjs';
import {originalSourceModuleItems} from '../source-module-views.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {withMutableJsonParameterCandidate,deriveMutableJsonRemovePlan} from '../mutable-json-loan-meta-candidate.mjs';
import {originalJsonRemoveLibrarySources} from '../json-edit-source-owner-candidate.mjs';
import {emitJsonRemoveLibraryCandidate,serializeCheckedJsonRemoveFlow,reparseCheckedJsonRemoveFlow} from '../emit-json-remove-library-candidate.mjs';
import {createJsonEditSlot,withJsonEdit,jsonEditSnapshot} from '../json-edit-candidate-runtime.mjs';
import {json_macro_object,json_macro_array,json_macro_u64,json_macro_null,json_macro_bool,json_macro_string} from '../json-macro-runtime.mjs';
import {jsonEditFrontierSourceData} from '../prepare-json-edit-leaf-candidate.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';

const test=(name,run)=>testCase(name,{timeout:60000},run),root=fileURLToPath(new URL('../../../',import.meta.url));
const source='use serde_json::Value; pub fn remove(root: &mut Value, key: &str) { if let Some(object) = root.as_object_mut() { object.remove(key); } }';
const hash=value=>createHash('sha256').update(value).digest('hex');
const cargo=()=>({manifest:readFileSync(resolve(root,'rust/Cargo.toml'),'utf8'),lock:readFileSync(resolve(root,'Cargo.lock'),'utf8')});
function context(text=source,path='src/lib.rs'){
 const graph=resolveModuleGraph({entry:path,paths:[path],readSource:()=>text,compilationProfile:PRODUCTION_PROFILE}),module=graph.modules.find(row=>row.path.length===0),bindings=resolveModuleBindings({modules:graph.modules,externalModules:registeredStandardHostBindings(),compilationProfile:PRODUCTION_PROFILE}),item=originalSourceModuleItems(module).find(row=>row.term==='fn'&&row.name==='remove');
 return {modules:graph.modules,module,scopes:bindings.scopes,compilationProfile:PRODUCTION_PROFILE,functionSpan:{start:item.start,end:item.end}};
}
function artifact(text=source){return withMutableJsonParameterCandidate(context(text),handle=>emitJsonRemoveLibraryCandidate(handle,deriveMutableJsonRemovePlan(handle),{root,cargo:cargo()}));}
const integer=value=>json_macro_u64(BigInt(value)),object=entries=>json_macro_object(entries),asModule=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');

test('real pinned Value Map Option public routes complete bodies and both Map alternatives are retained',()=>{
 const plan=originalJsonRemoveLibrarySources(cargo());assert.equal(plan.semanticAuthority,false);assert.equal(plan.applicationAdmission,false);assert.equal(plan.wholeNamespaceClosure,false);assert.equal(plan.editions.library.edition,'2021');assert.equal(plan.editions.caller.edition,'2024');assert.equal(plan.methods.asObject.signature,'fnas_object_mut(&mutself)->Option<&mutMap<String,Value>>');assert.ok(plan.methods.remove.body.includes('self.map.remove(key)'));assert.deepEqual(plan.mapAlternatives.map(row=>row.condition).sort(),['active','inactive']);assert.equal(plan.prelude.coreSome.leaf.segments.join('::'),'crate::option::Option::Some');
 for(const row of plan.sources){assert.equal(hash(row.source),row.sha256);assert.equal(transportConcreteSyntaxMeta(row.concreteMeta).source,row.source);}for(const selected of [plan.methods.asObject,plan.methods.remove,plan.declaration,plan.mapDeclaration,...plan.publicRoutes]){const input=plan.sources.find(row=>row.path===selected.path);assert.equal(input.source.slice(selected.span.start,selected.span.end),selected.source);}
 assert.ok(plan.untranslatedNativeBoundary.some(row=>row.includes('BTreeMap')));
});

test('copied feature flags wrong manifests changed lock and source-looking owner records issue no library authority',()=>{
 const original=cargo();for(const input of [{...original,features:['std']},{...original,manifest:original.manifest+'\n'},{...original,lock:original.lock+'\n'},{manifest:original.manifest,lock:'',sourceInputsVerified:true}])assert.throws(()=>originalJsonRemoveLibrarySources(input));
 const data=originalJsonRemoveLibrarySources(original);assert.throws(()=>originalJsonRemoveLibrarySources({...data,semanticAuthority:true}));assert.equal(data.applicationAdmission,false);
});

test('full checked flow wire reparses only against the current genuine private source-bound plan',()=>{
 let closed,plan,wire;withMutableJsonParameterCandidate(context(),handle=>{closed=handle;plan=deriveMutableJsonRemovePlan(handle);wire=serializeCheckedJsonRemoveFlow(handle,plan);const flow=reparseCheckedJsonRemoveFlow(handle,plan,wire);assert.equal(flow.source.source,source);assert.equal(flow.domain.fullOriginalFunctionDomainEquivalent,false);for(const mutate of [data=>{data.instructions[0].key.parameter='other';},data=>{data.domain.maxJsonNodes=999999;},data=>{data.source.source+=' ';}]){const data=JSON.parse(wire);mutate(data);assert.throws(()=>reparseCheckedJsonRemoveFlow(handle,plan,JSON.stringify(data)));}assert.throws(()=>reparseCheckedJsonRemoveFlow(handle,{...plan},wire),/complete remove-body plan/u);});assert.throws(()=>reparseCheckedJsonRemoveFlow(closed,plan,wire),/closed or foreign/u);
});

test('explicit emitted unit leaf executes bounded nonobjects missing Unicode and prototype-looking keys with paired private loans',async()=>{
 const plan=artifact(),leaf=await import(asModule(plan.artifacts[0].source));assert.equal(plan.libraryAbi,'owned-json-edit-slot-remove-unit-v1');assert.equal(plan.executableCoverageGain,0);assert.equal(plan.defaultCompilerAdmission,false);assert.equal(plan.fullOriginalFunctionDomainEquivalent,false);assert.deepEqual(plan.cargoInputs.map(row=>row.path),['Cargo.toml','rust/Cargo.toml','Cargo.lock']);
 const values=[json_macro_null(),json_macro_bool(true),integer(7),json_macro_string('text'),json_macro_array([json_macro_null(),object([['a',integer(1)]])]),object([]),object([['',integer(1)],['__proto__',integer(2)],['é',json_macro_array([integer(3)])],['😀',object([['nested',json_macro_bool(true)]])]])];
 for(const value of values)for(const key of ['missing','','__proto__','é','😀']){const expected=value.$==='Object'?object(value.field0.entries.filter(entry=>entry.key!==key).map(entry=>[entry.key,entry.value])):value,slot=createJsonEditSlot(value);assert.equal(withJsonEdit(slot,loan=>leaf.remove(loan,key)),undefined);assert.deepEqual(jsonEditSnapshot(slot),expected);}assert.throws(()=>leaf.remove({schema:'owned-json-edit-loan-candidate-v1'},'a'),/closed, foreign or suspended/u);
 const reversed=artifact(source.replace('root: &mut Value, key: &str','key: &str, root: &mut Value')),swapped=await import(asModule(reversed.artifacts[0].source)),slot=createJsonEditSlot(object([['é',integer(1)],['other',integer(2)]]));assert.equal(withJsonEdit(slot,loan=>swapped.remove('é',loan)),undefined);assert.deepEqual(jsonEditSnapshot(slot),object([['other',integer(2)]]));
 for(const output of plan.artifacts){const proposal=output.proposal;assert.equal(output.source,proposal.after);assert.equal(proposal.inverse,proposal.before);assert.deepEqual(proposal.stages.map(row=>row.phase),['language','repository']);for(const row of proposal.stages){assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.after);assert.equal(row.inverse,row.before);assert.equal(row.completeInverse,true);}assert.equal(proposal.nativeCopies.length,2);}
});

test('actual emitted declaration strict-compiles and executes a complete client while raw Values cannot stand in for loans',async t=>{
 const plan=artifact(),directory=mkdtempSync(join(tmpdir(),'router-json-remove-library-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));for(const row of plan.artifacts)writeFileSync(join(directory,row.path),row.source);
 const runtime=JSON.stringify(resolve(root,'tools/translation/json-edit-candidate-runtime.mjs')),values=JSON.stringify(resolve(root,'tools/translation/json-macro-runtime.mjs')),client='import {remove} from "./remove-library-candidate.mjs";\nimport {createJsonEditSlot,withJsonEdit,jsonEditSnapshot} from '+runtime+';\nimport {json_macro_object,json_macro_u64} from '+values+';\nconst input=json_macro_object([["a",json_macro_u64(1n)],["b",json_macro_u64(2n)]]);\nconst slot=createJsonEditSlot(input);\nwithJsonEdit(slot,loan=>remove(loan,"a"));\nexport const result=jsonEditSnapshot(slot);\n';writeFileSync(join(directory,'client.mts'),client);
 const require=createRequire(new URL('../../../js/package.json',import.meta.url)),compiler=process.env.ROUTER_TRANSLATION_TSC??process.execPath,prefix=process.env.ROUTER_TRANSLATION_TSC===undefined?[require.resolve('typescript/bin/tsc')]:[],args=['--strict','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(directory,'compiled')];
 execFileSync(compiler,[...prefix,...args,join(directory,'client.mts')],{encoding:'utf8',timeout:20000,maxBuffer:4*1024*1024});copyFileSync(join(directory,'remove-library-candidate.mjs'),join(directory,'compiled/remove-library-candidate.mjs'));const compiled=await import(pathToFileURL(join(directory,'compiled/client.mjs')));assert.deepEqual(compiled.result,object([['b',integer(2)]]));
 writeFileSync(join(directory,'bad.mts'),client.replace('withJsonEdit(slot,loan=>remove(loan,"a"));','remove(input,"a");'));let failure;try{execFileSync(compiler,[...prefix,...args,'--noEmit',join(directory,'bad.mts')],{encoding:'utf8',timeout:20000,maxBuffer:4*1024*1024});}catch(error){failure=error;}assert.ok(failure);assert.match(failure.stdout,/TS2345/u);assert.match(failure.stdout,/loanBrand|JsonEditLoan/u);
});

test('bounded domain is explicit and oversized dense values and excessive depth stay outside the paired ABI',()=>{
 const plan=artifact();assert.equal(plan.domain.maxJsonNodes,4096);assert.equal(plan.domain.maxJsonDepth,32);assert.equal(plan.domain.maxDenseEntries,4096);assert.equal(plan.domain.rustAcceptsLargerValues,true);assert.deepEqual(plan.runtimeDomainSelections.map(row=>row.limit),[4096,32,4096]);
 assert.throws(()=>createJsonEditSlot(Object.freeze({$:'Array',field0:Object.freeze(Array.from({length:4096},json_macro_null))})));let deep=json_macro_null();for(let depth=0;depth<33;depth++)deep=Object.freeze({$:'Array',field0:Object.freeze([deep])});assert.throws(()=>createJsonEditSlot(deep));assert.equal(plan.applicationAdmission,false);assert.ok(plan.remainingJoins.some(row=>row.includes('caller')));
});

test('real retained complete application parent and changed operation remain unadmitted rather than becoming library coverage',()=>{
 const packet=jsonEditFrontierSourceData(),parent=packet.completePhysicalSources.find(row=>row.path==='rust/src/thinking/apply.rs');assert.ok(parent);assert.throws(()=>withMutableJsonParameterCandidate(context(parent.source,parent.path),handle=>emitJsonRemoveLibraryCandidate(handle,deriveMutableJsonRemovePlan(handle),{root,cargo:cargo()})));
 assert.throws(()=>artifact(source.replace('object.remove(key);','object.clear();')),/closed complete source remove body/u);const oracle=readFileSync(resolve(root,'rust/tests/json_remove_library_candidate.rs'),'utf8');assert.ok(oracle.includes('original_rust_accepts_values_outside_the_js_bounded_abi'));assert.equal(packet.executableGainMeasured,0);
});

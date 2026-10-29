// Automatic native-to-paired module discovery cases. SOURCE ONLY; ALL UNRUN.
// Qualified scalar local annotation and receiving fixed point. ALL UNRUN.
// Pure primitive source-unit bulk cases. SOURCE ONLY; ALL UNRUN.
// JSON-input primitive return families. SOURCE ONLY; ALL UNRUN.
// Owned canonical JSON return shape batches. SOURCE ONLY; ALL UNRUN.
// Borrowed native string input family. SOURCE ONLY; ALL UNRUN.
// Exact native integer parameters in JSON-vector units. ALL UNRUN.
// Standard JSON optional reader bulk source cases. ALL UNRUN.
// Whole JSON copy/control native synchronization independent cases. ALL UNRUN.
// Independent source re-entry of bounded native JSON locals. ALL UNRUN.
// Independent actual original JSON-vector reverse source; ALL UNRUN.
// Independent actual parameterized reverse cases. SOURCE ONLY; ALL UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {rustPackageSourcePath} from '../../repository-layout.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE as facade,ROUTER_CORE_PRIMITIVES_SOURCE as primitives,ROUTER_CORE_RANGES_SOURCE as ranges,ROUTER_CORE_BASE64_SOURCE as base64,ROUTER_CORE_JSON_COLLECTIONS_SOURCE as collections} from '../../router-core-source-data.mjs';
import {ownedCoreRuntimeSources} from '../owned-vector-candidate-source.mjs';
import {prepareOwnedVectorCandidateSources} from '../prepare-owned-vector-candidate.mjs';
import {createOwnedVectorCandidateContext,translateOwnedVectorCandidate,parseOwnedVectorCandidateMeta,emitOwnedVectorCandidateRust,prepareOwnedVectorCandidateRuntime,evaluateOwnedVectorCandidate} from '../owned-vector-candidate.mjs';
const ROOT=fileURLToPath(new URL('../../../../',import.meta.url)),JS='app/src/list.mjs',TS='typed/src/list.mts',limits={timeout:60000},C='crate::translation_core::';
const original=path=>readFileSync(join(ROOT,rustPackageSourcePath(ROOT,path)),'utf8');
function data(rust,source,typed){return {runtimeRoot:'app/runtime',declarationRoot:'typed/runtime',vectorBindings:[{javascriptPath:JS,javascriptName:'values',rustPath:'src/lib.rs',rustName:'values'}],files:[...ownedCoreRuntimeSources('app/runtime','typed/runtime'),{path:'src/lib.rs',source:'pub mod translation_core;\n'+rust},{path:'src/translation_core.rs',source:facade},{path:'src/translation_core/primitives.rs',source:primitives},{path:'src/translation_core/ranges.rs',source:ranges},{path:'src/translation_core/base64.rs',source:base64},{path:'src/translation_core/json_collections.rs',source:collections},{path:'Cargo.toml',source:original('Cargo.toml')},{path:'Cargo.lock',source:original('Cargo.lock')},{path:JS,source},{path:TS,source:typed}]};}
function translate(rust,source,typed){const input=data(rust,source,typed),context=createOwnedVectorCandidateContext(input),result=translateOwnedVectorCandidate(source,{context,sourcePath:JS,typescriptOutputPath:'typed/src/reverse.mts'});return {input,context,result};}
function write(root,path,source){mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),source);}
async function targets(t,row){
 const folder=mkdtempSync(join(tmpdir(),'owned-vector-candidate-'));t.after(()=>rmSync(folder,{recursive:true,force:true}));
 for(const file of row.input.files.filter(file=>/\.(?:mjs|mts|ts)$/u.test(file.path)))write(folder,file.path,file.source);
 for(const file of row.input.files.filter(file=>file.path.startsWith('typed/runtime/')&&file.path.endsWith('.mts')))write(folder,'app/runtime/'+file.path.slice('typed/runtime/'.length),file.source);
 write(folder,'typed/src/reverse.mts',row.result.typescript);
 execFileSync(process.execPath,[join(ROOT,'js/node_modules/typescript/bin/tsc'),'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--rootDir',folder,'--outDir',join(folder,'out'),join(folder,TS),join(folder,'typed/src/reverse.mts')],{cwd:ROOT,encoding:'utf8',stdio:'pipe',timeout:20000});
 for(const file of row.input.files.filter(file=>file.path.startsWith('app/runtime/'))){write(folder,'out/'+file.path,file.source);write(folder,'out/typed/runtime/'+file.path.slice('app/runtime/'.length),file.source);}
 const javascript=await import(pathToFileURL(join(folder,JS)).href),typed=await import(pathToFileURL(join(folder,'out/typed/src/list.mjs')).href),reverse=await import(pathToFileURL(join(folder,'out/typed/src/reverse.mjs')).href),runtime=await prepareOwnedVectorCandidateRuntime(row.result.program);
 return [(...args)=>javascript.values(...args),(...args)=>typed.values(...args),(...args)=>reverse.values(...args),(...args)=>evaluateOwnedVectorCandidate(row.result.program,'values',args,runtime)];
}


import {json_macro_null as nullValue,json_macro_string as stringValue,json_macro_array as arrayValue} from '../../json-macro-runtime.mjs';
import {prepareVectorJsonReverseSources} from '../../prepare-vector-json-reverse-sources.mjs';
const T=C+'Json',typeImport='import type {JsonValue} from "../runtime/json-macro-runtime.mjs";\n';
function pair(rust,body,{args='',typedArgs='',imports=''}={}){return translate(rust,imports+'export function values('+args+'){'+body+'}',typeImport+imports+'export function values('+typedArgs+'):readonly JsonValue[]{'+body+'}');}

import {BOUNDED_JSON_CORE_SOURCE} from '../../bounded-json-core-source-data.mjs';
import {prepareVectorJsonOriginLocalsSources} from '../../prepare-vector-json-origin-locals-sources.mjs';
const B='crate::translation_json_core::';
function nativePair(rust,body,{args='',typedArgs='',imports=''}={}){const source=imports+'export function values('+args+'){'+body+'}',typed=typeImport+imports+'export function values('+typedArgs+'):readonly JsonValue[]{'+body+'}',input=data(rust,source,typed);input.files.find(row=>row.path==='src/lib.rs').source='pub mod translation_json_core;\n'+input.files.find(row=>row.path==='src/lib.rs').source;input.files.push({path:'src/translation_json_core.rs',source:BOUNDED_JSON_CORE_SOURCE});const context=createOwnedVectorCandidateContext(input),result=translateOwnedVectorCandidate(source,{context,sourcePath:JS,typescriptOutputPath:'typed/src/reverse.mts'});return {input,context,result};}
import {proposeOwnedVectorNativeSynchronization} from '../owned-vector-native-synchronization.mjs';
import {requestedNativeJsonVectorTree,actualNativeJsonVectorTree} from '../owned-vector-native-json-control.mjs';
import {prepareVectorNativeJsonControlSources} from '../../prepare-vector-native-json-control-sources.mjs';
import {translateProject} from '../../project.mjs';
import {PRODUCTION_PROFILE} from '../../cfg-profile.mjs';
import {jsonMacroDependencyProfile} from '../../json-macro-inputs.mjs';
import {deriveDependencyProfile} from '../../derive-dependencies.mjs';
import {verifyTypedTargets} from '../../test/typed-targets.mjs';
function sync(row,javascript=false){return proposeOwnedVectorNativeSynchronization(row.input,{sourcePath:JS,typescriptPath:TS,...(javascript?{javascript:row.input.files.find(file=>file.path===JS).source}:{typescript:row.result.typescript})});}
function forward(row,proposal,change=source=>source){const files=new Map(row.input.files.map(file=>[file.path,file.source]));for(const edit of proposal.rustEdits)files.set(edit.path,change(edit.after));const dependencies={manifest:files.get('Cargo.toml'),lock:files.get('Cargo.lock')};return translateProject({entry:'src/lib.rs',paths:[...files.keys()].filter(path=>path.endsWith('.rs')),readSource:path=>files.get(path),compilationProfile:PRODUCTION_PROFILE,cargoManifest:dependencies.manifest,jsonMacroDependencies:jsonMacroDependencyProfile(dependencies).proof,deriveDependencies:deriveDependencyProfile(dependencies).proof});}
import {prepareVectorJsonStandardOptionsSources} from '../../prepare-vector-json-standard-options-sources.mjs';
import {nativeJsonOptionalReaderSource} from '../owned-vector-json-predicate-native.mjs';
import {ownedJsonReaderOperation,ownedJsonOptionalPayload} from '../owned-json-source.mjs';
import {json_macro_object as objectValue,json_macro_bool as boolValue,json_macro_u64 as unsignedValue,json_macro_i64 as signedValue} from '../../json-macro-runtime.mjs';
import {JSON_FIELDS_NATIVE_SOURCE} from '../../json-fields-native-source.mjs';
import {prepareVectorJsonIntegerInputsSources} from '../../prepare-vector-json-integer-inputs-sources.mjs';
import {prepareVectorJsonStringInputsSources} from '../../prepare-vector-json-string-inputs-sources.mjs';
import {prepareVectorJsonOwnedValuesSources} from '../../prepare-vector-json-owned-values-sources.mjs';
import {originalJsonOwnedValueDomain} from '../owned-vector-json-native.mjs';
import {prepareVectorJsonScalarReturnsSources} from '../../prepare-vector-json-scalar-returns-sources.mjs';
import {originalJsonScalarDomain} from '../owned-vector-json-native.mjs';
import {preparePrimitiveScalarUnitsSources} from '../../prepare-primitive-scalar-units-sources.mjs';
import {originalPrimitiveScalarDomain} from '../owned-vector-json-native.mjs';


import {proposeOwnedNativeBulkDiscovery} from '../owned-native-bulk-discovery.mjs';
import {proposeOwnedNativeBulkSynchronization} from '../owned-native-bulk-composition.mjs';
import {selectNativeProjectionClosure} from '../owned-native-projection-closure.mjs';
import {prepareNativeHelperClosureSources} from '../../prepare-native-helper-closure-sources.mjs';
function graphUnit(name,tree){return {name,rust:name,kind:'primitive-scalar',parameters:[],returns:'bool',tree:[[],tree]};}
test('automatic closure includes same-module selected helper callees and nested calls',limits,()=>{
 const rust='pub fn leaf(flag:bool,value:u64)->u64 { if flag { value } else { 1_u64 } }\npub fn middle(flag:bool,value:u64)->u64 { leaf(flag,value) }\npub fn top(flag:bool,value:u64)->bool { middle(flag,leaf(flag,value)) >= 1_u64 }',input=data(rust,'','');input.vectorBindings=[];
 const discovered=proposeOwnedNativeBulkDiscovery(input),module=discovered.modules.find(row=>row.bindings.some(binding=>binding.rustName==='top'));assert.ok(module);assert.deepEqual(module.bindings.map(row=>row.rustName).sort(),['leaf','middle','top']);const javascript=module.outputs.find(row=>row.path.endsWith('.mjs')).after;assert.match(javascript,/middle\(flag, leaf\(flag, value\)\)/);
 const composed=proposeOwnedNativeBulkSynchronization(input);assert.equal(composed.composedNativeSourceRechecked,true);assert.equal(composed.runtimeParity,false);assert.equal(composed.rustExecuted,false);
});
test('recursive missing unsupported and excessive expanded helper graphs preserve refusals',limits,()=>{
 const cycle=selectNativeProjectionClosure([graphUnit('a',['source-call','b',[]]),graphUnit('b',['source-call','a',[]]),graphUnit('safe',['bool',true])]);assert.deepEqual(cycle.admitted,['safe']);assert.equal(cycle.refusals.length,2);const missing=selectNativeProjectionClosure([graphUnit('caller',['source-call','absent',[]])]);assert.deepEqual(missing.admitted,[]);
 const rows=[graphUnit('f0',['bool',true])];for(let index=1;index<20;index++)rows.push(graphUnit('f'+index,['and',['source-call','f'+(index-1),[]],['source-call','f'+(index-1),[]]]));const expanded=selectNativeProjectionClosure(rows);assert.ok(expanded.refusals.some(row=>row.reason.includes('work')));assert.equal(expanded.semanticAuthority,false);assert.equal(expanded.crossInvocationCache,false);
});
test('incoming-depth refusal does not become a saved false refusal for a shallower subtree',limits,()=>{
 const rows=[graphUnit('f0',['bool',true])];for(let index=1;index<35;index++)rows.push(graphUnit('f'+index,['source-call','f'+(index-1),[]]));const result=selectNativeProjectionClosure([...rows].reverse());assert.ok(result.refusals.some(row=>row.name==='f34'));assert.ok(result.admitted.includes('f31'));assert.ok(result.admitted.includes('f0'));
});
test('helper source inventory excludes cross-module calls and unknown native ABI families',limits,()=>{
 const rust='pub mod helpers { pub fn leaf(flag:bool)->bool { flag } }\npub fn cross(flag:bool)->bool { crate::helpers::leaf(flag) }\npub fn alien(value:u32)->u32 { value }\npub fn safe(flag:bool)->bool { flag }',input=data(rust,'','');input.vectorBindings=[];const plan=proposeOwnedNativeBulkDiscovery(input);assert.ok(plan.refusals.some(row=>row.name==='cross'&&row.sourcePreserved));assert.ok(plan.refusals.some(row=>row.name==='alien'&&row.sourcePreserved));assert.ok(plan.modules.some(row=>row.bindings.some(binding=>binding.rustName==='safe')));assert.equal(plan.productionSelected,false);
});
test('fresh source-call namespace and signature changes never reuse the old inventory',limits,()=>{
 const input=data('pub fn leaf(flag:bool)->bool { flag }\npub fn top(flag:bool)->bool { leaf(flag) }','','');input.vectorBindings=[];const before=proposeOwnedNativeBulkDiscovery(input);assert.ok(before.modules.some(row=>row.bindings.some(binding=>binding.rustName==='top')));const changed=structuredClone(input);changed.files.find(row=>row.path==='src/lib.rs').source=changed.files.find(row=>row.path==='src/lib.rs').source.replace('pub fn leaf(flag:bool)->bool { flag }','pub fn leaf(flag:u32)->u32 { flag }');const next=proposeOwnedNativeBulkDiscovery(changed);assert.equal(next.modules.some(row=>row.bindings.some(binding=>binding.rustName==='top')),false);
});
test('five helper inventory closure and receiving projection equations keep exact source phases',limits,()=>{const plan=prepareNativeHelperClosureSources();assert.equal(plan.files.length,5);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});

test('actual helper names that collide with receiving parameters acquire recorded hygienic aliases',limits,()=>{const input=data('pub fn helper(flag:bool)->bool { flag }\npub fn caller(helper:bool,native_function_helper:bool)->bool { self::helper(helper) }','','');input.vectorBindings=[];const plan=proposeOwnedNativeBulkDiscovery(input),module=plan.modules.find(row=>row.bindings.some(binding=>binding.rustName==='caller'));assert.ok(module);const helper=module.bindings.find(binding=>binding.rustName==='helper');assert.match(helper.javascriptName,/^native_function_helper_[0-9]+$/u);assert.ok(module.outputs.find(row=>row.path.endsWith('.mjs')).after.includes(helper.javascriptName+'(helper)'));assert.equal(plan.runtimeParity,false);});

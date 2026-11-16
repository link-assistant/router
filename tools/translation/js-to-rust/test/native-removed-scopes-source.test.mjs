// Removed inline native scope lifecycle source drafts. ALL UNRUN.
// Empty module lifecycle source drafts. ALL UNRUN.
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


import {proposeOwnedNativeBulkSynchronization} from '../owned-native-bulk-composition.mjs';
import {proposeOwnedVectorBulkModuleSynchronization} from '../owned-vector-bulk-module-synchronization.mjs';
import {prepareVectorBulkModuleSources} from '../../prepare-vector-bulk-module-sources.mjs';
function adopted(){
 const input=data('pub mod alpha { pub fn count()->u64 { 0_u64 } }\npub mod bravo { pub fn enabled()->bool { true } }','','');input.vectorBindings=[];const first=proposeOwnedNativeBulkSynchronization(input),files=new Map(input.files.map(row=>[row.path,row.source]));for(const row of first.nativeEdits)files.set(row.path,row.after);for(const row of first.outputs)files.set(row.path,row.after);return {input:{...input,vectorBindings:first.modules.flatMap(row=>row.bindings),files:[...files].map(([path,source])=>({path,source}))},modules:first.modules};
}
function edit(api,authority){const requests=[];for(const module of api.modules.filter(row=>row.rustSource==='src/lib.rs')){const sourcePath=module.bindings[0].javascriptPath,typescriptPath=sourcePath.replace('app/','typed/').replace(/\.mjs$/u,'.mts'),path=authority==='javascript'?sourcePath:typescriptPath,row=api.input.files.find(row=>row.path===path),after=row.source.replace('return 0n;','return 9n;').replace('return true;','return false;');assert.notEqual(after,row.source);row.source=after;requests.push({sourcePath,typescriptPath,[authority]:after});}return requests;}

import {proposeOwnedNativeBulkModuleRefresh} from '../owned-native-bulk-module-refresh.mjs';
import {prepareNativeBulkRefreshSources} from '../../prepare-native-bulk-refresh-sources.mjs';
function routes(api){return api.modules.filter(row=>row.rustSource==='src/lib.rs').map(module=>{const sourcePath=module.bindings[0].javascriptPath;return {sourcePath,typescriptPath:sourcePath.replace('app/','typed/').replace(/\.mjs$/u,'.mts')};});}

import {prepareNativeEmptyModulesSources} from '../../prepare-native-empty-modules-sources.mjs';
import {nativeEmptyModuleRoute,prepareEmptyNativeModulePair} from '../owned-native-empty-modules.mjs';
function emptyAlpha(api){const source=api.input.files.find(row=>row.path==='src/lib.rs'),next=source.source.replace(/pub fn count\(\)->u64\s*\{[^{}]*\}/u,'');assert.notEqual(next,source.source);source.source=next;return api;}
function installRefresh(input,proposal){const next=structuredClone(input);for(const row of [...proposal.nativeEdits,...proposal.outputs])next.files.find(file=>file.path===row.path).source=row.after;next.vectorBindings=proposal.modules.flatMap(row=>row.bindings);return next;}
function durableRoutes(plan){return plan.modules.map(row=>({sourcePath:row.javascriptPath,typescriptPath:row.typescriptPath,nativeRoute:{rustPath:row.rustSource,module:row.module}}));}

import {prepareNativeRemovedScopesSources} from '../../prepare-native-removed-scopes-sources.mjs';
function removeAlpha(api){const source=api.input.files.find(row=>row.path==='src/lib.rs'),begin=source.source.indexOf('pub mod alpha {'),end=source.source.indexOf('\npub mod bravo',begin);assert.ok(begin>=0&&end>begin);source.source=source.source.slice(0,begin)+source.source.slice(end);return api;}
test('removed inline native scopes clear their receiving pair only through the fresh actual parent view',limits,()=>{const api=removeAlpha(adopted()),plan=proposeOwnedNativeBulkModuleRefresh(api.input,routes(api)),removed=plan.modules.find(row=>row.module[0]==='alpha');assert.ok(removed);assert.deepEqual(removed.bindings,[]);assert.equal(plan.outputs.find(row=>row.path===removed.javascriptPath).after,'');assert.equal(plan.outputs.find(row=>row.path===removed.typescriptPath).after,'');const input=installRefresh(api.input,plan),again=proposeOwnedNativeBulkModuleRefresh(input,durableRoutes(plan));assert.deepEqual(again.nativeEdits,[]);assert.ok(again.outputs.every(row=>row.before===row.after));assert.equal(again.runtimeParity,false);assert.equal(again.rustExecuted,false);});
test('removed module coordinates can later restore functions from actual new native source',limits,()=>{const api=removeAlpha(adopted()),first=proposeOwnedNativeBulkModuleRefresh(api.input,routes(api)),input=installRefresh(api.input,first),source=input.files.find(row=>row.path==='src/lib.rs');source.source+='\npub mod alpha {pub fn returned()->u32{7_u32}}\n';const plan=proposeOwnedNativeBulkModuleRefresh(input,durableRoutes(first)),module=plan.modules.find(row=>row.module[0]==='alpha');assert.ok(module.bindings.some(row=>row.rustName==='alpha.returned'));assert.ok(plan.outputs.find(row=>row.path===module.javascriptPath).after.includes('function returned('));assert.equal(plan.nativeInstalled,false);});
test('nested removed scope uses the closest actual original parent rather than a guessed file prefix',limits,()=>{const input=data('pub mod outer {pub mod child {pub fn value()->bool{true}} pub fn kept()->u64{1_u64}}','','');input.vectorBindings=[];const adopted=proposeOwnedNativeBulkSynchronization(input),files=new Map(input.files.map(row=>[row.path,row.source]));for(const row of [...adopted.nativeEdits,...adopted.outputs])files.set(row.path,row.after);const source=files.get('src/lib.rs'),begin=source.indexOf('pub mod child {'),end=source.indexOf('pub fn kept',begin);assert.ok(begin>=0&&end>begin);files.set('src/lib.rs',source.slice(0,begin)+source.slice(end));const installed={...input,vectorBindings:adopted.modules.flatMap(row=>row.bindings),files:[...files].map(([path,source])=>({path,source}))},requests=adopted.modules.map(module=>{const sourcePath=module.bindings[0].javascriptPath;return {sourcePath,typescriptPath:sourcePath.replace('app/','typed/').replace(/\.mjs$/u,'.mts')};}),plan=proposeOwnedNativeBulkModuleRefresh(installed,requests);assert.ok(plan.modules.some(row=>JSON.stringify(row.module)==='["outer","child"]'&&row.bindings.length===0));assert.ok(plan.modules.some(row=>JSON.stringify(row.module)==='["outer"]'&&row.bindings.some(row=>row.rustName==='outer.kept')));});
test('retained declarations imports macros and unproved attributes block inferred removed-scope absence',limits,()=>{for(const replacement of ['#[cfg(any())] pub mod alpha {}','pub use bravo as alpha;','unknown_module_expansion!();','#[unknown_owner] pub mod bravo_extra {}']){const api=removeAlpha(adopted()),source=api.input.files.find(row=>row.path==='src/lib.rs');source.source+='\n'+replacement;assert.throws(()=>proposeOwnedNativeBulkModuleRefresh(api.input,routes(api)));}});
test('three removed-scope source equations preserve full inverse and fixed phases',limits,()=>{const plan=prepareNativeRemovedScopesSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});

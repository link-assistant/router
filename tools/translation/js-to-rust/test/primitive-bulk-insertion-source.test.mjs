// Composed receiving-authoritative primitive function insertion drafts. ALL UNRUN.
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

import {preparePrimitiveBulkInsertionSources} from '../../prepare-primitive-bulk-insertion-sources.mjs';
function emptyRecorded({both=true}={}){const api=emptyAlpha(adopted());if(both){const source=api.input.files.find(row=>row.path==='src/lib.rs'),next=source.source.replace(/pub fn enabled\(\)->bool\s*\{[^{}]*\}/u,'');assert.notEqual(next,source.source);source.source=next;}const plan=proposeOwnedNativeBulkModuleRefresh(api.input,routes(api));return {input:installRefresh(api.input,plan),modules:plan.modules};}
function insertRequests(api,authority){return api.modules.map(module=>{const request={sourcePath:module.javascriptPath,typescriptPath:module.typescriptPath};if(module.bindings.length===0){request.nativeRoute={rustPath:module.rustSource,module:module.module};request[authority]=authority==='javascript'?'/** @param {boolean} value */\nexport function restored(value){return value;}':'export function restored(value:boolean):boolean{return value;}';}else request[authority]=api.input.files.find(row=>row.path===(authority==='javascript'?module.javascriptPath:module.typescriptPath)).source;return request;});}
function applyBulk(input,plan){const next=structuredClone(input),files=new Map(next.files.map(row=>[row.path,row.source]));for(const row of [...plan.nativeEdits,...plan.outputs])files.set(row.path,row.after);next.files=[...files].map(([path,source])=>({path,source}));next.vectorBindings=plan.modules.flatMap(row=>row.bindings);return next;}
for(const authority of ['javascript','typescript'])test('bulk '+authority+' inserts independent primitive functions in two empty modules sharing one native file',limits,async()=>{const api=emptyRecorded(),plan=proposeOwnedVectorBulkModuleSynchronization(api.input,insertRequests(api,authority));assert.equal(plan.nativeEdits.length,1);assert.equal(plan.nativeEdits[0].path,'src/lib.rs');assert.ok(plan.modules.every(row=>row.newNativeFunctions));assert.deepEqual(plan.modules.flatMap(row=>row.bindings.map(binding=>binding.rustName)).sort(),['alpha.restored','bravo.restored']);assert.ok(plan.nativeEdits[0].functions.every(row=>row.inserted));assert.equal(plan.nativeEdits[0].functions.length,2);const next=applyBulk(api.input,plan),context=createOwnedVectorCandidateContext(next);for(const module of plan.modules){const source=next.files.find(row=>row.path===module.javascriptPath).source,result=translateOwnedVectorCandidate(source,{context,sourcePath:module.javascriptPath,typescriptOutputPath:module.typescriptPath}),runtime=await prepareOwnedVectorCandidateRuntime(result.program);for(const value of [true,false])assert.equal(evaluateOwnedVectorCandidate(result.program,'restored',[value],runtime),value);}const requests=plan.modules.map(row=>({sourcePath:row.javascriptPath,typescriptPath:row.typescriptPath,[authority]:next.files.find(file=>file.path===(authority==='javascript'?row.javascriptPath:row.typescriptPath)).source})),again=proposeOwnedVectorBulkModuleSynchronization(next,requests);assert.deepEqual(again.nativeEdits,[]);assert.ok(again.modules.every(row=>!row.newNativeFunctions));assert.equal(plan.runtimeParity,false);assert.equal(plan.rustExecuted,false);});
test('native insertion and existing receiving function updates compose at original disjoint source spans',limits,()=>{const api=emptyRecorded({both:false}),requests=insertRequests(api,'javascript'),existing=requests.find(row=>!row.nativeRoute);assert.ok(existing);existing.javascript=existing.javascript.replace('return true;','return false;');const plan=proposeOwnedVectorBulkModuleSynchronization(api.input,requests);assert.equal(plan.nativeEdits.length,1);assert.ok(plan.modules.some(row=>row.newNativeFunctions));assert.ok(plan.modules.some(row=>!row.newNativeFunctions));assert.ok(plan.nativeEdits[0].after.includes('false'));assert.equal(new Set(plan.outputs.map(row=>row.path)).size,plan.outputs.length);});
test('duplicate primitive insertion requests and supplied native edit authority flags refuse',limits,()=>{const api=emptyRecorded(),requests=insertRequests(api,'typescript');assert.throws(()=>proposeOwnedVectorBulkModuleSynchronization(api.input,[requests[0],requests[0]]));assert.throws(()=>proposeOwnedVectorBulkModuleSynchronization(api.input,requests.map(row=>({...row,nativeInsertion:{at:0,expected:'',replacement:'injected'}}))));});
test('three complete primitive bulk insertion equations preserve source inverses and fixed phases',limits,()=>{const plan=preparePrimitiveBulkInsertionSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});

test('unchanged canonical empty units retain fresh absence checks while another unit inserts functions',limits,()=>{const api=emptyRecorded(),requests=insertRequests(api,'javascript');requests[1].javascript='';const plan=proposeOwnedVectorBulkModuleSynchronization(api.input,requests);assert.equal(plan.modules.filter(row=>row.newNativeFunctions).length,1);assert.equal(plan.modules.filter(row=>row.bindings.length===0).length,1);assert.equal(plan.nativeEdits.length,1);assert.equal(plan.nativeEdits[0].functions.length,1);assert.equal(plan.outputs.filter(row=>row.after==='').length,2);assert.equal(plan.runtimeParity,false);});

// Actual bounded runtime export re-entry and source synchronization. ALL UNRUN.
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
import {prepareVectorJsonRuntimeReentrySources} from '../../prepare-vector-json-runtime-reentry-sources.mjs';
import {BOUNDED_JSON_RUNTIME_OPERATIONS} from '../bounded-json-runtime-operations.mjs';
import {json_macro_object as objectValue,json_macro_bool as boolValue,json_macro_u64 as unsignedValue,json_macro_i64 as signedValue} from '../../json-macro-runtime.mjs';
const aliases='import {router_vector_json_copy as copy,router_vector_json_validate as validate,router_vector_json_with_field as update,router_vector_json_build_null as blank,router_vector_json_build_bool as boolean,router_vector_json_build_string as text,router_vector_json_build_u64 as unsigned,router_vector_json_build_i64 as signed,router_vector_json_build_i64_unsigned as checkedSigned,router_vector_json_build_array as array,router_vector_json_build_object as object,router_vector_json_build_fields as fields} from "../runtime/json-update-runtime.mjs";\n';
function aliasPair(body){return nativePair('pub fn values(seed:&'+T+',flag:bool)->Vec<'+T+'>{'+C+'vec!['+B+'json_checked_copy(seed)]}',body,{args:'seed,flag',typedArgs:'seed:JsonValue,flag:boolean',imports:aliases});}
test('all actual bounded runtime exports re-enter both script authorities and reproduce through the fresh native target',limits,async()=>{
 const body='validate(seed);const receipt=validate(seed);const copied=copy(seed);const items=[copied,blank(),boolean(flag),text("Ω😀"),unsigned(4n),signed(3n),checkedSigned(5n),object()];const nested=array(items);const keys=array([text("held")]);const record=fields(keys,[nested]);return [update(record,"more",seed)];';for(const javascript of [false,true]){const row=aliasPair(body),proposal=sync(row,javascript),project=forward(row,proposal);assert.ok(proposal.rustEdits[0].after.includes('let __ro_discard_'));assert.ok(proposal.rustEdits[0].after.includes(': ::std::vec::Vec<crate::translation_core::Json> ='));await verifyTypedTargets(project,api=>{const seed=stringValue('input'),nested=arrayValue([seed,nullValue(),boolValue(true),stringValue('Ω😀'),unsignedValue(4n),signedValue(3n),signedValue(5n),objectValue([])]),record=objectValue([['held',nested],['more',seed]]);assert.deepEqual(api.values(seed,true),[record]);},{childTimeoutMs:20000});assert.deepEqual(parseOwnedVectorCandidateMeta(row.result.meta,{context:row.context}),row.result.program);}
});
test('actual bounded validation statements retain their order before an empty result',limits,async t=>{
 const row=aliasPair('validate(seed);return [];');assert.equal(row.result.program[0].body[0].kind,'effect');assert.equal(row.result.program[0].body[0].value.type,'unit');const proposal=sync(row),item=row.result.program[0],project=forward(row,proposal),entry=project.executableDeclarations.find(row=>row.qualifiedName==='values');assert.ok(entry);assert.deepEqual(actualNativeJsonVectorTree(entry.checkedSource().declaration,item,entry.lower()),requestedNativeJsonVectorTree(item));for(const run of (await targets(t,row)).slice(2)){assert.deepEqual(run(nullValue(),false),[]);assert.throws(()=>run({$:'Array',field0:Array.from({length:4096},()=>nullValue())},false));}
});
test('empty builder vectors receive native owned JSON annotations and move exactly once',limits,async()=>{
 const row=aliasPair('const empty=[];const result=array(empty);return [result];'),proposal=sync(row);assert.ok(proposal.rustEdits[0].after.includes('json_build_array('));await verifyTypedTargets(forward(row,proposal),api=>assert.deepEqual(api.values(nullValue(),false),[arrayValue([])]),{childTimeoutMs:20000});assert.throws(()=>aliasPair('const list=[seed];const consumed=array(list);return list;'));assert.throws(()=>aliasPair('const list=[seed];const first=array(list);return [array(list)];'));
});
test('mutually exclusive branch moves remain separate while scalar JSON values stay reusable',limits,async()=>{
 const row=aliasPair('const list=[seed];if(flag){return [array(list),copy(seed)];}else{return list;}'),proposal=sync(row);await verifyTypedTargets(forward(row,proposal),api=>{const seed=stringValue('Ω');assert.deepEqual(api.values(seed,true),[arrayValue([seed]),seed]);assert.deepEqual(api.values(seed,false),[seed]);},{childTimeoutMs:20000});
});
test('a public operation table cannot replace actual complete native module and source joins',limits,()=>{
 assert.equal(Object.keys(BOUNDED_JSON_RUNTIME_OPERATIONS).length,12);for(const row of Object.values(BOUNDED_JSON_RUNTIME_OPERATIONS)){assert.ok(Object.isFrozen(row));assert.ok(Object.isFrozen(row.args));}assert.throws(()=>BOUNDED_JSON_RUNTIME_OPERATIONS.router_vector_json_validate.args.push('bool'));const source=aliases+'export function values(){return [blank()];}',typed=typeImport+aliases+'export function values():readonly JsonValue[]{return [blank()];}',row=nativePair('pub fn values()->Vec<'+T+'>{'+C+'vec![]}','return [blank()];',{imports:aliases});for(const mode of ['missing','changed']){const input=structuredClone(row.input);if(mode==='missing'){input.files=input.files.filter(file=>file.path!=='src/translation_json_core.rs');input.files.find(file=>file.path==='src/lib.rs').source=input.files.find(file=>file.path==='src/lib.rs').source.replace('pub mod translation_json_core;\n','');}else input.files.find(file=>file.path==='src/translation_json_core.rs').source+='\n// changed';assert.throws(()=>translateOwnedVectorCandidate(source,{context:createOwnedVectorCandidateContext(input),sourcePath:JS,typescriptOutputPath:TS}));}
});
test('five complete runtime alias equations retain exact originals and both rule phases',limits,()=>{const plan=prepareVectorJsonRuntimeReentrySources();assert.equal(plan.files.length,5);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});

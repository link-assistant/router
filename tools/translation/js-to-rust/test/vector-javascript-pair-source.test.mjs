// Independent JavaScript-authoritative vector source cases. ALL UNRUN.
// Independent native source synchronization cases. ALL UNRUN.
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


import {proposeOwnedVectorNativeSynchronization} from '../owned-vector-native-synchronization.mjs';
import {prepareVectorNativeSyncSources} from '../../prepare-vector-native-sync-sources.mjs';
import {translateProject} from '../../project.mjs';
import {PRODUCTION_PROFILE} from '../../cfg-profile.mjs';
import {jsonMacroDependencyProfile} from '../../json-macro-inputs.mjs';
import {deriveDependencyProfile} from '../../derive-dependencies.mjs';
import {verifyTypedTargets} from '../../test/typed-targets.mjs';
function sync(row){return proposeOwnedVectorNativeSynchronization(row.input,{sourcePath:JS,typescriptPath:TS,typescript:row.result.typescript});}
function forward(input,proposal){const files=new Map(input.files.map(row=>[row.path,row.source]));for(const edit of proposal.rustEdits)files.set(edit.path,edit.after);const dependencies={manifest:files.get('Cargo.toml'),lock:files.get('Cargo.lock')};return translateProject({entry:'src/lib.rs',paths:[...files.keys()].filter(path=>path.endsWith('.rs')),readSource:path=>files.get(path),compilationProfile:PRODUCTION_PROFILE,cargoManifest:dependencies.manifest,jsonMacroDependencies:jsonMacroDependencyProfile(dependencies).proof,deriveDependencies:deriveDependencyProfile(dependencies).proof});}

import {prepareOwnedVectorJavaScriptPair} from '../owned-vector-javascript-pair.mjs';
import {proposeOwnedVectorModuleReinput} from '../owned-vector-module-reinput.mjs';
import {prepareVectorJavaScriptPairSources} from '../../prepare-vector-javascript-pair-sources.mjs';

test('edited JavaScript body retains exact source comments and derives only written native header annotations',limits,()=>{
 const source='// : bigint must stay a comment\nexport function values(seed){const held=seed;return [held,0n];}',typed='export function values(seed:bigint):readonly bigint[]{return [seed];}',pair=prepareOwnedVectorJavaScriptPair(JS,source,TS,typed);assert.equal(pair.javascript.source,source);assert.ok(pair.typescript.source.includes('seed: bigint'));assert.ok(pair.typescript.source.includes(': readonly bigint[]'));assert.ok(pair.typescript.source.includes('const held=seed;return [held,0n]'));assert.equal(pair.functions[0].parameters[0].name,'seed');
});
test('JavaScript-first edit propagates through paired meta and actual native source substitution',limits,async()=>{
 const row=translate('pub fn values(seed:u8)->Vec<u8>{'+C+'vec![seed]}','export function values(seed){return [seed];}','export function values(seed:bigint):readonly bigint[]{return [seed];}'),javascript='export function values(seed){const held=seed;return [255n,held,0n];}',proposal=proposeOwnedVectorNativeSynchronization(row.input,{sourcePath:JS,typescriptPath:TS,javascript});assert.equal(proposal.rustEdits.length,1);assert.equal(proposal.nativeInstalled,false);await verifyTypedTargets(forward(row.input,proposal),api=>{for(const seed of [0n,255n])assert.deepEqual(api.values(seed),[255n,seed,0n]);},{childTimeoutMs:20000});
});
test('JavaScript-authoritative conditions use the actual unchanged typed input domains',limits,async()=>{
 const row=translate('pub fn values(flag:bool,seed:u8)->Vec<u8>{if flag{'+C+'vec![seed]}else{'+C+'vec![]}}','export function values(flag,seed){if(flag){return [seed];}else{return [];}}','export function values(flag:boolean,seed:bigint):readonly bigint[]{if(flag){return [seed];}else{return [];}}'),javascript='export function values(flag,seed){if(!flag){return [seed,seed];}else{return [255n];}}',proposal=proposeOwnedVectorNativeSynchronization(row.input,{sourcePath:JS,typescriptPath:TS,javascript});await verifyTypedTargets(forward(row.input,proposal),api=>{assert.deepEqual(api.values(false,7n),[7n,7n]);assert.deepEqual(api.values(true,7n),[255n]);},{childTimeoutMs:20000});
});
test('actual JSON type-only imports survive header transplantation without erasing current runtime imports',limits,()=>{
 const baseline='import type {JsonValue} from "../runtime/json-macro-runtime.mjs";export function values(seed:JsonValue):readonly JsonValue[]{return [seed];}',javascript='import {json_macro_null as blank} from "../runtime/json-macro-runtime.mjs";export function values(seed){return [blank(),seed];}',pair=prepareOwnedVectorJavaScriptPair(JS,javascript,TS,baseline);assert.equal(pair.javascript.source,javascript);assert.ok(pair.typescript.source.includes('import type {JsonValue}'));assert.ok(pair.typescript.source.includes('json_macro_null as blank'));const row=translate('pub fn values(seed:'+C+'Json)->Vec<'+C+'Json>{'+C+'vec![seed]}','export function values(seed){return [seed];}',baseline),proposal=proposeOwnedVectorModuleReinput(row.input,{sourcePath:JS,typescriptPath:TS,javascript});assert.equal(proposal.requestedSource.language,'JavaScript');assert.equal(proposal.requestedSource.source,javascript);assert.equal(proposal.nativeInstalled,false);
});
test('renamed missing default destructured and extra function headers require explicit independent written types',limits,()=>{
 const typed='export function values(seed:bigint):readonly bigint[]{return [seed];}';for(const javascript of ['export function values(other){return [other];}','export function values(){return [];}','export function values(seed=0n){return [seed];}','export function values({seed}){return [seed];}','export function other(seed){return [seed];}','export function values(seed){return [seed];}export function extra(){return [];}'])assert.throws(()=>prepareOwnedVectorJavaScriptPair(JS,javascript,TS,typed));
});
test('copied annotation names and simultaneous authorities cannot bypass fresh native source semantics',limits,()=>{
 const row=translate('pub fn values(seed:u8)->Vec<u8>{'+C+'vec![seed]}','export function values(seed){return [seed];}','export function values(seed:bigint):readonly bigint[]{return [seed];}');assert.throws(()=>proposeOwnedVectorModuleReinput(row.input,{sourcePath:JS,typescriptPath:TS,javascript:'export function values(seed){return [true];}'}));assert.throws(()=>proposeOwnedVectorModuleReinput(row.input,{sourcePath:JS,typescriptPath:TS,javascript:row.input.files.find(file=>file.path===JS).source,typescript:row.result.typescript}));
});
test('four complete JavaScript authority equations retain native original source and two phase order',limits,()=>{const plan=prepareVectorJavaScriptPairSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});

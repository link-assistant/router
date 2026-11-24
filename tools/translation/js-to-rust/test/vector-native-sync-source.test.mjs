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

test('edited boolean vector values and cardinality reproduce through the actual whole forward target in both script languages',limits,async()=>{
 const row=translate('pub fn values()->Vec<bool>{'+C+'vec![true]}','export function values(){return [false,true,false];}','export function values():readonly boolean[]{return [false,true,false];}'),proposal=sync(row);assert.equal(proposal.rustEdits.length,1);assert.ok(proposal.rustEdits[0].after.includes(C+'vec![false, true, false]'));assert.equal(proposal.selectedNativeSourceRechecked,true);assert.equal(proposal.nativeInstalled,false);assert.equal(proposal.nativeFreshnessQualified,false);await verifyTypedTargets(forward(row.input,proposal),api=>assert.deepEqual(api.values(),[false,true,false]),{childTimeoutMs:20000});
});
test('integer native domains and receiving input aliases preserve exact values and source header binders',limits,async()=>{
 for(const [type,low,high]of [['u8',0n,255n],['i8',-128n,127n],['u128',0n,340282366920938463463374607431768211455n],['isize',-9223372036854775808n,9223372036854775807n]]){
  const row=translate('pub fn values(native_seed:'+type+')->Vec<'+type+'>{'+C+'vec![native_seed]}','export function values(incoming){return [incoming,'+low+'n,'+high+'n];}','export function values(incoming:bigint):readonly bigint[]{return [incoming,'+low+'n,'+high+'n];}'),proposal=sync(row);assert.ok(proposal.rustEdits[0].after.includes('__ro_vector_input_0:'+type));assert.ok(proposal.rustEdits[0].after.includes('->Vec<'+type+'>'));await verifyTypedTargets(forward(row.input,proposal),api=>{for(const seed of [low,high])assert.deepEqual(api.values(seed),[seed,low,high]);},{childTimeoutMs:20000});
 }
});
test('all bound units change in one source proposal and unrelated declarations retain exact bytes',limits,async()=>{
 const rust='pub fn values()->Vec<u8>{'+C+'vec![1u8]}\npub fn other()->Vec<bool>{'+C+'vec![true]}\npub fn untouched()->u8{7u8}',js='export function values(){return [255n,0n];}export function other(){return [false];}',typed='export function values():readonly bigint[]{return [255n,0n];}export function other():readonly boolean[]{return [false];}',input=data(rust,js,typed);input.vectorBindings.push({javascriptPath:JS,javascriptName:'other',rustPath:'src/lib.rs',rustName:'other'});const context=createOwnedVectorCandidateContext(input),result=translateOwnedVectorCandidate(js,{context,sourcePath:JS,typescriptOutputPath:TS}),proposal=sync({input,context,result});assert.equal(proposal.selectedFunctions.length,2);assert.equal(proposal.rustEdits.length,1);assert.ok(proposal.rustEdits[0].after.endsWith('pub fn untouched()->u8{7u8}'));await verifyTypedTargets(forward(input,proposal),api=>{assert.deepEqual(api.values(),[255n,0n]);assert.deepEqual(api.other(),[false]);assert.equal(api.untouched(),7n);},{childTimeoutMs:20000});
});
test('complete native and script histories retain exact original bytes and neither proposal grants installation',limits,()=>{
 const row=translate('pub fn values(seed:u8)->Vec<u8>{'+C+'vec![seed]}','export function values(seed){return [];}','export function values(seed:bigint):readonly bigint[]{return [];}'),proposal=sync(row);for(const edit of proposal.rustEdits){assert.equal(edit.before,row.input.files.find(file=>file.path===edit.path).source);assert.equal(edit.inverse,edit.before);assert.equal(edit.history.inverse,edit.before);}for(const edit of proposal.files)assert.equal(edit.inverse,row.input.files.find(file=>file.path===edit.path).source);assert.equal(proposal.wholeRouterSynchronization,false);assert.equal(proposal.receivingExecuted,false);assert.equal(proposal.rustExecuted,false);assert.deepEqual(proposal.trace.map(row=>row.phase),['language','language','repository']);
});
test('forged-input options remain outside the native source proposal',limits,()=>{
 const row=translate('pub fn values(flag:bool)->Vec<bool>{if flag{'+C+'vec![true]}else{'+C+'vec![]}}','export function values(flag){if(flag){return [true];}else{return [];}}','export function values(flag:boolean):readonly boolean[]{if(flag){return [true];}else{return [];}}');assert.throws(()=>proposeOwnedVectorNativeSynchronization(row.input,{sourcePath:JS,typescriptPath:TS,typescript:row.result.typescript,allowUnchecked:true}));
});
test('four complete native vector synchronization equations keep source originals and language/repository order',limits,()=>{const plan=prepareVectorNativeSyncSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});

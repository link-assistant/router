// Independent source-qualified native f64 vector cases. ALL UNRUN.
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

import {actualNativeVectorTree,requestedNativeVectorTree} from '../owned-vector-native-control.mjs';
import {prepareVectorNativeF64Sources} from '../../prepare-vector-native-f64-sources.mjs';

test('native finite literal decimals preserve negative zero subnormal and maximum values through both complete forward targets',limits,async()=>{
 const body='return [-0,0,5e-324,1.7976931348623157e308,-1.7976931348623157e308];',row=translate('pub fn values()->Vec<f64>{'+C+'vec![1.0_f64]}','export function values(){'+body+'}','export function values():readonly number[]{'+body+'}'),proposal=sync(row);assert.ok(proposal.rustEdits[0].after.includes('-0.0_f64'));await verifyTypedTargets(forward(row.input,proposal),api=>{const values=api.values();assert.equal(Object.is(values[0],-0),true);assert.equal(Object.is(values[1],0),true);assert.equal(values[2],Number.MIN_VALUE);assert.equal(values[3],Number.MAX_VALUE);assert.equal(values[4],-Number.MAX_VALUE);},{childTimeoutMs:20000});
});
test('actual f64 arguments retain nonfinite Number values and bool-selected complete vector branches',limits,async()=>{
 const body='if(!flag){return [seed,seed,-0];}else{return [];}',row=translate('pub fn values(flag:bool,seed:f64)->Vec<f64>{if flag{'+C+'vec![seed]}else{'+C+'vec![]}}','export function values(flag,seed){'+body+'}','export function values(flag:boolean,seed:number):readonly number[]{'+body+'}'),proposal=sync(row);await verifyTypedTargets(forward(row.input,proposal),api=>{for(const seed of [NaN,Infinity,-Infinity,-0,Number.MIN_VALUE,Number.MAX_VALUE]){const values=api.values(false,seed);assert.equal(Object.is(values[0],seed),true);assert.equal(Object.is(values[1],seed),true);assert.equal(Object.is(values[2],-0),true);assert.deepEqual(api.values(true,seed),[]);}},{childTimeoutMs:20000});
});
test('projection distinguishes actual signed-zero literals and refuses erased/f32 input domains',limits,()=>{
 const row=translate('pub fn values(seed:f64)->Vec<f64>{'+C+'vec![seed]}','export function values(seed){return [seed,-0];}','export function values(seed:number):readonly number[]{return [seed,-0];}'),proposal=sync(row),item=row.result.program[0],actual=forward(row.input,proposal).executableDeclarations.find(row=>row.qualifiedName==='values').checkedSource().declaration;assert.deepEqual(actualNativeVectorTree(actual,item),requestedNativeVectorTree(item));const zero=structuredClone(actual);zero.body.items[1].value='0';assert.notDeepEqual(actualNativeVectorTree(zero,item),requestedNativeVectorTree(item));const erased=structuredClone(actual);erased.params[0].type={kind:'float'};assert.throws(()=>actualNativeVectorTree(erased,item));const narrow=structuredClone(actual);narrow.params[0].type={kind:'float',rustPrimitiveName:'f32',rustSourceType:true};assert.throws(()=>actualNativeVectorTree(narrow,item));
});
test('JavaScript-authority f64 edits use the same native literal and header source rules',limits,async()=>{
 const row=translate('pub fn values(seed:f64)->Vec<f64>{'+C+'vec![seed]}','export function values(seed){return [seed];}','export function values(seed:number):readonly number[]{return [seed];}'),proposal=proposeOwnedVectorNativeSynchronization(row.input,{sourcePath:JS,typescriptPath:TS,javascript:'export function values(seed){return [0,-0,seed];}'});await verifyTypedTargets(forward(row.input,proposal),api=>assert.deepEqual(api.values(1.25),[0,-0,1.25]),{childTimeoutMs:20000});
});
test('two complete native f64 equations retain full source originals inverses and declared phases',limits,()=>{const plan=prepareVectorNativeF64Sources();assert.equal(plan.files.length,2);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});

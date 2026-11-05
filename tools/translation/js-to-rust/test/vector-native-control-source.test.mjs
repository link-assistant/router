// Independent native conditional vector source cases. ALL UNRUN.
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

import {requestedNativeVectorTree,actualNativeVectorTree} from '../owned-vector-native-control.mjs';
import {prepareVectorNativeControlSources} from '../../prepare-vector-native-control-sources.mjs';

test('bool input alias negation short-circuit and nested else-if reproduce all native branch results',limits,async()=>{
 const rust='pub fn values(first:bool,second:bool,seed:u8)->Vec<u8>{if first{'+C+'vec![seed]}else{'+C+'vec![]}}',body='const saved=left;if(saved&&!right){return [seed,255n];}else if(right||!saved){return [];}else{return [0n];}',row=translate(rust,'export function values(left,right,seed){'+body+'}','export function values(left:boolean,right:boolean,seed:bigint):readonly bigint[]{'+body+'}'),proposal=sync(row);assert.ok(proposal.rustEdits[0].after.includes('&&'));assert.ok(proposal.rustEdits[0].after.includes('||'));assert.ok(proposal.rustEdits[0].after.includes('if '));await verifyTypedTargets(forward(row.input,proposal),api=>{for(const left of [false,true])for(const right of [false,true])for(const seed of [0n,255n])assert.deepEqual(api.values(left,right,seed),left&&!right?[seed,255n]:right||!left?[]:[0n]);},{childTimeoutMs:20000});
});
test('bool output conditions preserve the actual input and both literal branch alternatives',limits,async()=>{
 const body='if(flag){return [flag,false];}else{return [true,flag];}',row=translate('pub fn values(original:bool)->Vec<bool>{if original{'+C+'vec![original]}else{'+C+'vec![]}}','export function values(flag){'+body+'}','export function values(flag:boolean):readonly boolean[]{'+body+'}'),proposal=sync(row);await verifyTypedTargets(forward(row.input,proposal),api=>{assert.deepEqual(api.values(true),[true,false]);assert.deepEqual(api.values(false),[true,false]);},{childTimeoutMs:20000});const actual=forward(row.input,proposal).executableDeclarations.find(row=>row.qualifiedName==='values').checkedSource().declaration;const expected=proposeOwnedVectorNativeSynchronization(row.input,{sourcePath:JS,typescriptPath:TS,typescript:row.result.typescript});assert.equal(expected.selectedNativeSourceRechecked,true);assert.equal(actual.body.k,'if');
});
test('projection compares condition structure as well as leaf literals and preserves all return domains',limits,()=>{
 const body='if(left&&!right){return [seed];}else{return [];}';const row=translate('pub fn values(left:bool,right:bool,seed:u8)->Vec<u8>{if left{'+C+'vec![seed]}else{'+C+'vec![]}}','export function values(left,right,seed){'+body+'}','export function values(left:boolean,right:boolean,seed:bigint):readonly bigint[]{'+body+'}'),item=row.result.program[0],expected=requestedNativeVectorTree(item),proposal=sync(row),actual=forward(row.input,proposal).executableDeclarations.find(row=>row.qualifiedName==='values').checkedSource().declaration;assert.deepEqual(actualNativeVectorTree(actual,item),expected);const changed=structuredClone(actual);changed.body.cond.op='or';assert.notDeepEqual(actualNativeVectorTree(changed,item),expected);const mistyped=structuredClone(actual);mistyped.params[0].type={kind:'fixed',bits:8,signed:false,rustPrimitiveName:'u8'};assert.throws(()=>actualNativeVectorTree(mistyped,item));
});
test('unbounded or partial native control shapes cannot be accepted as vector return trees',limits,()=>{
 const row=translate('pub fn values()->Vec<bool>{'+C+'vec![false]}','export function values(){return [true];}','export function values():readonly boolean[]{return [true];}'),item=row.result.program[0],proposal=sync(row),actual=forward(row.input,proposal).executableDeclarations.find(row=>row.qualifiedName==='values').checkedSource().declaration;for(const body of [{k:'let'},{k:'call'},{k:'if',cond:{k:'var',name:'unknown',type:{kind:'bool'}},then:actual.body,else:actual.body}])assert.throws(()=>actualNativeVectorTree({...actual,body},item));
});
test('three complete native control equations retain full source inverses and the two declared phases',limits,()=>{const plan=prepareVectorNativeControlSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});

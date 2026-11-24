// Independent unbounded owned String native vector source cases. ALL UNRUN.
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
import {checkOriginalQualifiedStringToOwned} from '../../qualified-string-owned-source.mjs';
import {prepareVectorNativeOwnedTextSources} from '../../prepare-vector-native-owned-text-sources.mjs';
const Q='::std::borrow::ToOwned::to_owned';
test('actual owned String inputs copy each output position through a qualified standard call',limits,async()=>{
 const row=translate('pub fn values(seed:String)->Vec<String>{'+C+'vec![seed]}','export function values(seed){return [seed,seed,"Ω😀"];}', 'export function values(seed:string):readonly string[]{return [seed,seed,"Ω😀"];}'),proposal=sync(row);assert.ok(proposal.rustEdits[0].after.includes(Q+'(&__ro_vector_input_0)'));assert.ok(!proposal.rustEdits[0].after.includes('<::std::string::String as'));await verifyTypedTargets(forward(row.input,proposal),api=>{for(const seed of ['', 'Ω😀','x'.repeat(1048577)])assert.deepEqual(api.values(seed),[seed,seed,'Ω😀']);},{childTimeoutMs:20000});
});
test('owned literal allocation empty returns and bool-selected input copies share the same whole-source projection',limits,async()=>{
 const texts=['','\u0000\n\t','Ω😀'],body='if(flag){return [seed,'+texts.map(value=>JSON.stringify(value)).join(',')+'];}else{return [];}',row=translate('pub fn values(flag:bool,seed:String)->Vec<String>{if flag{'+C+'vec![seed]}else{'+C+'vec![]}}','export function values(flag,seed){'+body+'}','export function values(flag:boolean,seed:string):readonly string[]{'+body+'}'),proposal=sync(row);assert.ok(proposal.rustEdits[0].after.includes(Q+'("")'));await verifyTypedTargets(forward(row.input,proposal),api=>{assert.deepEqual(api.values(true,'seed'),['seed',...texts]);assert.deepEqual(api.values(false,'seed'),[]);},{childTimeoutMs:20000});
});
test('JavaScript-authority owned text edits retain the original native String domain and complete inverses',limits,async()=>{
 const row=translate('pub fn values(seed:String)->Vec<String>{'+C+'vec![seed]}','export function values(seed){return [seed];}','export function values(seed:string):readonly string[]{return [seed];}'),proposal=proposeOwnedVectorNativeSynchronization(row.input,{sourcePath:JS,typescriptPath:TS,javascript:'export function values(seed){return ["",seed,seed];}'});assert.ok(proposal.rustEdits[0].after.includes('seed:String')||proposal.rustEdits[0].after.includes('__ro_vector_input_0:String'));assert.equal(proposal.rustEdits[0].inverse,proposal.rustEdits[0].before);await verifyTypedTargets(forward(row.input,proposal),api=>assert.deepEqual(api.values('Ω😀'),['','Ω😀','Ω😀']),{childTimeoutMs:20000});
});
test('native ownership projection rejects changed copy paths unknown receivers and erased String domains',limits,()=>{
 const row=translate('pub fn values(seed:String)->Vec<String>{'+C+'vec![seed]}','export function values(seed){return [seed];}','export function values(seed:string):readonly string[]{return [seed];}'),item=row.result.program[0],proposal=sync(row),actual=forward(row.input,proposal).executableDeclarations.find(row=>row.qualifiedName==='values').checkedSource().declaration;assert.deepEqual(actualNativeVectorTree(actual,item),requestedNativeVectorTree(item));const changed=structuredClone(actual);changed.body.items[0].sourceOwnershipOperation.qualifiedPath='custom::ToOwned';assert.throws(()=>actualNativeVectorTree(changed,item));const erased=structuredClone(actual);delete erased.params[0].type.rustOwnership;assert.throws(()=>actualNativeVectorTree(erased,item));let touched=false;assert.throws(()=>checkOriginalQualifiedStringToOwned(new Proxy({},{get(){touched=true;throw Error('foreign checker');}}),{k:'routerQualifiedStringToOwned',span:{start:0,end:1}},new Map(),[],null));assert.equal(touched,false);
});
test('direct qualified str and shared String calls keep their actual operand roles and reject extra reference layers',limits,()=>{
 const source='pub fn copied(value:&str)->String{'+Q+'(value)}pub fn owned(value:String)->String{'+Q+'(&value)}pub fn shared(value:&String)->String{'+Q+'(value)}',row=translate('pub fn values()->Vec<String>{'+C+'vec![String::from("native")]}','export function values(){return ["new"];}','export function values():readonly string[]{return ["new"];}'),inputs={...row.input,files:row.input.files.map(file=>file.path==='src/lib.rs'?{...file,source:'pub mod translation_core;\n'+source+'\n'+file.source.slice(file.source.indexOf('pub fn values'))}:file)};const result=forward(inputs,{rustEdits:[]});for(const name of ['copied','owned','shared'])assert.ok(result.executableDeclarations.some(row=>row.qualifiedName===name),name);
 const invalid={...inputs,files:inputs.files.map(file=>file.path==='src/lib.rs'?{...file,source:file.source+'pub fn bad(value:&str)->String{'+Q+'(&value)}'}:file)};assert.equal(forward(invalid,{rustEdits:[]}).executableDeclarations.some(row=>row.qualifiedName==='bad'),false);
});
test('four complete owned text/standard-call equations retain full source originals inverses and phase order',limits,()=>{const plan=prepareVectorNativeOwnedTextSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});

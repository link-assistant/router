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
test('shared and owned canonical JSON vectors synchronize complete native copies from either script authority',limits,async()=>{
 for(const shared of [false,true])for(const javascript of [false,true]){const row=nativePair('pub fn values(seed:'+(shared?'&':'')+T+')->Vec<'+T+'>{'+C+'vec!['+(shared?B+'json_checked_copy(seed)':'seed')+']}','return [seed,seed];',{args:'seed',typedArgs:'seed:JsonValue'}),proposal=sync(row,javascript);assert.equal(proposal.rustEdits.length,1);assert.equal(proposal.selectedNativeSourceRechecked,true);assert.equal(proposal.nativeInstalled,false);assert.ok(proposal.rustEdits[0].after.includes('crate::translation_json_core::json_validate('+(shared?'':'&')+'seed)'));assert.ok(proposal.rustEdits[0].after.includes('->Vec<'+T+'>'));await verifyTypedTargets(forward(row,proposal),api=>{const seed=arrayValue([nullValue()]),out=api.values(seed);assert.deepEqual(out,[seed,seed]);assert.notEqual(out[0],seed);assert.notEqual(out[0].field0,out[1].field0);assert.deepEqual(seed,arrayValue([nullValue()]));},{childTimeoutMs:20000});}
});
test('native validation precedes complete branches including empty owned results',limits,async()=>{
 const row=nativePair('pub fn values(seed:&'+T+',flag:bool)->Vec<'+T+'>{if flag{'+C+'vec!['+B+'json_checked_copy(seed)]}else{'+C+'vec![]}}','if(flag){const kept=seed;return [kept,seed];}else{return [];}',{args:'seed,flag',typedArgs:'seed:JsonValue,flag:boolean'}),proposal=sync(row),native=proposal.rustEdits[0].after;assert.ok(native.indexOf('json_validate(seed)')<native.indexOf('if flag'));await verifyTypedTargets(forward(row,proposal),api=>{assert.deepEqual(api.values(nullValue(),false),[]);assert.deepEqual(api.values(nullValue(),true),[nullValue(),nullValue()]);const malformed={$:'Array',field0:Array.from({length:4096},()=>nullValue())};assert.throws(()=>api.values(malformed,false));},{childTimeoutMs:20000});
});
test('ordered whole-body effects include unused JSON copies and repeated aliases',limits,()=>{
 const imports='import {router_core_json_copy as copied} from "../runtime/json-update-runtime.mjs";\n',row=nativePair('pub fn values(seed:&'+T+')->Vec<'+T+'>{'+C+'vec!['+B+'json_checked_copy(seed)]}','const ignored=copied(seed);const held=[seed];return held;',{args:'seed',typedArgs:'seed:JsonValue',imports}),proposal=sync(row),item=row.result.program[0],project=forward(row,proposal),entry=project.executableDeclarations.find(entry=>entry.qualifiedName==='values');assert.ok(entry);const expected=requestedNativeJsonVectorTree(item),actual=actualNativeJsonVectorTree(entry.checkedSource().declaration,item,entry.lower());assert.deepEqual(actual,expected);assert.equal(actual[0].filter(row=>row[0]==='copy').length,2);const changed=forward(row,proposal,source=>source.replace(/let ignored = [^;]+;/u,'')),other=changed.executableDeclarations.find(entry=>entry.qualifiedName==='values');assert.ok(other);assert.notDeepEqual(actualNativeJsonVectorTree(other.checkedSource().declaration,item,other.lower()),expected);
});
test('forged program metadata never enters native synchronization and all source equations retain complete inverses',limits,()=>{
 const row=nativePair('pub fn values()->Vec<'+T+'>{'+C+'vec![]}','return [];'),bad=structuredClone(row.input);bad.vectorBindings[0].rustName='absent';assert.throws(()=>proposeOwnedVectorNativeSynchronization(bad,{sourcePath:JS,typescriptPath:TS,typescript:row.result.typescript}));const proposal=sync(row);for(const edit of proposal.rustEdits){assert.equal(edit.inverse,edit.before);assert.equal(edit.history.inverse,edit.before);}assert.equal(proposal.receivingExecuted,false);assert.equal(proposal.runtimeParity,false);assert.equal(proposal.rustExecuted,false);const plan=prepareVectorNativeJsonControlSources();assert.equal(plan.files.length,3);for(const edit of plan.files){assert.equal(edit.current,edit.currentAfter);assert.equal(edit.inverse,edit.before);assert.deepEqual(edit.stages.map(stage=>stage.phase),['language','repository']);}
});

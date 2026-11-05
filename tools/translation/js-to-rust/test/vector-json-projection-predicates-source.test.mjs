// Actual canonical JSON string-key projection/predicate source. ALL UNRUN.
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
import {prepareVectorJsonProjectionPredicatesSources} from '../../prepare-vector-json-projection-predicates-sources.mjs';
import {nativeJsonPredicateSource} from '../owned-vector-json-predicate-native.mjs';
import {json_macro_object as objectValue,json_macro_bool as boolValue,json_macro_u64 as unsignedValue,json_macro_i64 as signedValue} from '../../json-macro-runtime.mjs';
import {serde_json_from_str as parseJson} from '../../extensions/json-runtime.mjs';
const predicates=['is_null','is_boolean','is_number','is_string','is_array','is_object','is_u64','is_i64','is_f64'],readerImports='import { '+predicates.map((name,index)=>'serde_json_value_'+name+' as predicate'+index).join(', ')+' } from "../runtime/json-runtime.mjs";\n',projectionImport='import {router_core_json_index_str as index} from "../runtime/json-update-runtime.mjs";\n',boolImport='import {json_macro_bool as boolean} from "../runtime/json-macro-runtime.mjs";\n';
function projected(body,{shared=true}={}){return nativePair('pub fn values(seed:'+(shared?'&':'')+T+')->Vec<'+T+'>{'+C+'vec!['+(shared?B+'json_checked_copy(seed)':'seed')+']}',body,{args:'seed',typedArgs:'seed:JsonValue',imports:readerImports+projectionImport+boolImport});}
test('all nine standard JSON predicates reproduce independent scalar classification from owned and shared inputs',limits,async()=>{
 const parsed=parseJson('1.5');assert.equal(parsed.$,'Ok');const cases=[[nullValue(),[true,false,false,false,false,false,false,false,false]],[boolValue(true),[false,true,false,false,false,false,false,false,false]],[stringValue('Ω😀'),[false,false,false,true,false,false,false,false,false]],[arrayValue([]),[false,false,false,false,true,false,false,false,false]],[objectValue([]),[false,false,false,false,false,true,false,false,false]],[unsignedValue(1n),[false,false,true,false,false,false,true,true,false]],[unsignedValue(18446744073709551615n),[false,false,true,false,false,false,true,false,false]],[signedValue(-1n),[false,false,true,false,false,false,false,true,false]],[parsed.field0,[false,false,true,false,false,false,false,false,true]]];for(const shared of [false,true]){const row=projected('return ['+predicates.map((_name,index)=>'boolean(predicate'+index+'(seed))').join(',')+'];',{shared}),proposal=sync(row);assert.ok(proposal.rustEdits[0].after.includes('::serde_json::Value::is_object('));await verifyTypedTargets(forward(row,proposal),api=>{for(const [value,expected]of cases)assert.deepEqual(api.values(value),expected.map(value=>boolValue(value)));},{childTimeoutMs:20000});}
});
test('borrowed string-key projections preserve canonical missing/wrong-kind null and independent owned output from both authorities',limits,async()=>{
 for(const javascript of [false,true]){const row=projected('const held=index(seed,"Ω😀");if(predicate3(held)){return [held,seed];}else{return [held];}',{shared:false}),proposal=sync(row,javascript);assert.ok(proposal.rustEdits[0].after.includes('crate::translation_core::json_index_str('));await verifyTypedTargets(forward(row,proposal),api=>{const seed=objectValue([['Ω😀',stringValue('text')]]),out=api.values(seed);assert.deepEqual(out,[stringValue('text'),seed]);assert.notEqual(out[1],seed);assert.deepEqual(api.values(objectValue([])),[nullValue()]);assert.deepEqual(api.values(arrayValue([])),[nullValue()]);assert.deepEqual(api.values(nullValue()),[nullValue()]);},{childTimeoutMs:20000});}
});
test('whole native comparison retains projection/predicate order and complete short-circuit boolean source',limits,()=>{
 const row=projected('const held=index(seed,"field");if(predicate5(seed)&&predicate3(held)){return [held];}else{return [];}'),proposal=sync(row),project=forward(row,proposal),entry=project.executableDeclarations.find(row=>row.qualifiedName==='values'),item=row.result.program[0];assert.ok(entry);assert.deepEqual(actualNativeJsonVectorTree(entry.checkedSource().declaration,item,entry.lower()),requestedNativeJsonVectorTree(item));assert.ok(proposal.rustEdits[0].after.includes(' && '));assert.equal(proposal.nativeInstalled,false);assert.equal(proposal.runtimeParity,false);assert.equal(proposal.rustExecuted,false);
});
test('copied predicate renderer remains source DATA and refuses arbitrary methods nested borrows and source injection',limits,()=>{
 assert.equal(nativeJsonPredicateSource('serde_json_value_is_null','&seed'),'::serde_json::Value::is_null(&seed)');for(const [name,arg]of [['serde_json_value_get_string','seed'],['serde_json_value_as_str','seed'],['serde_json_value_is_null','&&seed'],['serde_json_value_is_null','seed);unrelated()'],['unregistered','seed']])assert.throws(()=>nativeJsonPredicateSource(name,arg));const row=projected('return [boolean(predicate0(seed))];');assert.throws(()=>parseOwnedVectorCandidateMeta(row.result.meta.replaceAll('serde_json_value_is_null','serde_json_value_is_object'),{context:row.context}));
});
test('five complete projection/predicate equations retain all original source bytes and both phases',limits,()=>{const plan=prepareVectorJsonProjectionPredicatesSources();assert.equal(plan.files.length,5);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});

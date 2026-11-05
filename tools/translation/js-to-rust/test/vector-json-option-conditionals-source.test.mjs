// Optional scalar conditional composition. SOURCE ONLY; ALL UNRUN.
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
import {prepareVectorJsonOptionConditionalsSources} from '../../prepare-vector-json-option-conditionals-sources.mjs';
const conditionalRows=[['as_str','text','"fallback"'],['as_bool','boolean','false'],['as_u64','unsigned','0n'],['as_i64','signed','0n']],conditionalImports='import {json_macro_string as text,json_macro_bool as boolean,json_macro_u64 as unsigned,json_macro_i64 as signed} from "../runtime/json-macro-runtime.mjs";\nimport { '+conditionalRows.map((row,index)=>'serde_json_value_'+row[0]+' as read'+index).join(', ')+' } from "../runtime/json-runtime.mjs";\n';
function conditionalFixture(style=0){const bodies=conditionalRows.map((row,index)=>{const expression=style===0?'selected.$==="Some"?selected.field0:'+row[2]:style===1?'selected.$==="None"?'+row[2]+':selected.field0':'!(selected.$==="None")?selected.field0:'+row[2];return 'const selected=read'+index+'(seed);const chosen='+expression+';return ['+row[1]+'(chosen)];';}),source=conditionalImports+bodies.map((body,index)=>'export function conditional'+index+'(seed){'+body+'}').join('\n'),typed=typeImport+conditionalImports+bodies.map((body,index)=>'export function conditional'+index+'(seed:JsonValue):readonly JsonValue[]{'+body+'}').join('\n'),rust=bodies.map((_body,index)=>'pub fn conditional'+index+'(seed:&'+T+')->Vec<'+T+'>{'+C+'vec!['+B+'json_checked_copy(seed)]}').join('\n'),input=data(rust,source,typed);input.files.find(file=>file.path==='src/lib.rs').source='pub mod translation_json_core;\n'+input.files.find(file=>file.path==='src/lib.rs').source;input.files.push({path:'src/translation_json_core.rs',source:BOUNDED_JSON_CORE_SOURCE});input.vectorBindings=bodies.map((_body,index)=>({javascriptPath:JS,javascriptName:'conditional'+index,rustPath:'src/lib.rs',rustName:'conditional'+index}));const context=createOwnedVectorCandidateContext(input),result=translateOwnedVectorCandidate(source,{context,sourcePath:JS,typescriptOutputPath:TS});return {input,context,result};}
for(const style of [0,1,2])test('four scalar optional conditional domains preserve guard and numeric fallback style '+style,limits,async()=>{for(const javascript of [false,true]){const row=conditionalFixture(style),proposal=sync(row,javascript),project=forward(row,proposal);assert.ok(proposal.rustEdits[0].after.includes('if let ::std::option::Option::Some('));assert.equal(proposal.rustEdits[0].after.includes('unreachable!'),false);await verifyTypedTargets(project,api=>{const present=[stringValue('Ω😀'),boolValue(true),unsignedValue(18446744073709551615n),signedValue(-9223372036854775808n)],missing=[stringValue('fallback'),boolValue(false),unsignedValue(0n),signedValue(0n)];for(let index=0;index<conditionalRows.length;index++){const input=present[index],before=structuredClone(input);assert.deepEqual(api['conditional'+index](input),[input]);assert.deepEqual(input,before);for(const absent of [nullValue(),arrayValue([]),objectValue([])])assert.deepEqual(api['conditional'+index](absent),[missing[index]]);}},{childTimeoutMs:20000});for(let index=0;index<conditionalRows.length;index++){const entry=project.executableDeclarations.find(entry=>entry.qualifiedName==='conditional'+index);assert.ok(entry);assert.deepEqual(actualNativeJsonVectorTree(entry.checkedSource().declaration,row.result.program[index],entry.lower()),requestedNativeJsonVectorTree(row.result.program[index]));}assert.equal(proposal.runtimeParity,false);assert.equal(proposal.rustExecuted,false);}});
test('conditional Some bindings do not escape their source refinement or permit oversized signed fallbacks',limits,()=>{const row=conditionalFixture();for(const mode of ['wrong-arm','escape','i64-overflow']){const input=structuredClone(row.input),change=source=>mode==='wrong-arm'?source.replace('selected.$==="Some"?selected.field0:"fallback"','selected.$==="None"?selected.field0:"fallback"'):mode==='escape'?source.replace('return [text(chosen)];','return [text(selected.field0)];'):source.replace('selected.$==="Some"?selected.field0:0n;return [signed','selected.$==="Some"?selected.field0:18446744073709551615n;return [signed');for(const path of [JS,TS])input.files.find(file=>file.path===path).source=change(input.files.find(file=>file.path===path).source);assert.throws(()=>translateOwnedVectorCandidate(input.files.find(file=>file.path===JS).source,{context:createOwnedVectorCandidateContext(input),sourcePath:JS,typescriptOutputPath:TS}));}});
test('four complete optional conditional equations preserve originals and exact phase order',limits,()=>{const plan=prepareVectorJsonOptionConditionalsSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});

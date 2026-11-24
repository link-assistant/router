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
const integerImports='import {json_macro_u64 as unsigned,json_macro_i64 as signedJson} from "../runtime/json-macro-runtime.mjs";\nimport {router_core_json_index_usize as at} from "../runtime/json-update-runtime.mjs";\nimport {router_field_json_u64_field_or as unsignedField,router_field_json_i64_field_or as signedField} from "../runtime/json-fields-runtime.mjs";\n';
const integerBodies=[
 'return [unsigned(offset),signedJson(amount)];',
 'return [at(seed,offset)];',
 'const first=unsignedField(seed,"offset",offset);const second=signedField(seed,"amount",amount);return [unsigned(first),signedJson(second)];',
 'const chosen=flag?amount:0n;return [signedJson(chosen)];',
];
function integerFixture(){const source=integerImports+integerBodies.map((body,index)=>'export function integercase'+index+'(seed,offset,amount,flag){'+body+'}').join('\n'),typed=typeImport+integerImports+integerBodies.map((body,index)=>'export function integercase'+index+'(seed:JsonValue,offset:bigint,amount:bigint,flag:boolean):readonly JsonValue[]{'+body+'}').join('\n'),rust=integerBodies.map((_body,index)=>'pub fn integercase'+index+'(seed:&'+T+',offset:u64,amount:i64,flag:bool)->Vec<'+T+'>{'+C+'vec!['+B+'json_checked_copy(seed)]}').join('\n'),input=data(rust,source,typed);input.files.find(file=>file.path==='src/lib.rs').source='pub mod translation_json_core;\npub mod translation_json_fields_core;\n'+input.files.find(file=>file.path==='src/lib.rs').source;input.files.push({path:'src/translation_json_core.rs',source:BOUNDED_JSON_CORE_SOURCE},{path:'src/translation_json_fields_core.rs',source:JSON_FIELDS_NATIVE_SOURCE});input.vectorBindings=integerBodies.map((_body,index)=>({javascriptPath:JS,javascriptName:'integercase'+index,rustPath:'src/lib.rs',rustName:'integercase'+index}));const context=createOwnedVectorCandidateContext(input),result=translateOwnedVectorCandidate(source,{context,sourcePath:JS,typescriptOutputPath:TS});return {input,context,result};}
for(const javascript of [false,true])test('native u64/i64 parameter batch preserves source-derived domains and both authorities '+javascript,limits,async()=>{const row=integerFixture(),proposal=sync(row,javascript),project=forward(row,proposal);assert.equal(proposal.selectedFunctions.length,4);assert.ok(proposal.typescript.includes('offset < 0n'));assert.ok(proposal.typescript.includes('amount < -9223372036854775808n'));assert.ok(proposal.rustEdits[0].after.includes('crate::translation_json_fields_core::json_index_or_null'));await verifyTypedTargets(project,api=>{for(const offset of [0n,1n,18446744073709551615n])for(const amount of [-9223372036854775808n,0n,9223372036854775807n])for(const flag of [true,false]){const first=objectValue([['nested',arrayValue([stringValue('Ω😀')])]]),seed=arrayValue([first,stringValue('next')]),before=structuredClone(seed);assert.deepEqual(api.integercase0(seed,offset,amount,flag),[unsignedValue(offset),signedValue(amount)]);const out=api.integercase1(seed,offset,amount,flag);assert.deepEqual(out,[offset<2n?seed.field0[Number(offset)]:nullValue()]);if(offset===0n)assert.notEqual(out[0],first);assert.deepEqual(api.integercase2(nullValue(),offset,amount,flag),[unsignedValue(offset),signedValue(amount)]);assert.deepEqual(api.integercase2(objectValue([['offset',unsignedValue(7n)],['amount',signedValue(-9n)]]),offset,amount,flag),[unsignedValue(7n),signedValue(-9n)]);assert.deepEqual(api.integercase3(seed,offset,amount,flag),[signedValue(flag?amount:0n)]);assert.deepEqual(seed,before);}},{childTimeoutMs:20000});for(let index=0;index<4;index++){const entry=project.executableDeclarations.find(entry=>entry.qualifiedName==='integercase'+index);assert.ok(entry);assert.deepEqual(actualNativeJsonVectorTree(entry.checkedSource().declaration,row.result.program[index],entry.lower()),requestedNativeJsonVectorTree(row.result.program[index]));}assert.equal(proposal.runtimeParity,false);assert.equal(proposal.rustExecuted,false);});
test('private candidate runtime rejects every integer bound and primitive-kind violation',limits,async()=>{const row=integerFixture(),runtime=await prepareOwnedVectorCandidateRuntime(row.result.program);for(const [offset,amount]of [[-1n,0n],[18446744073709551616n,0n],[0n,-9223372036854775809n],[0n,9223372036854775808n],[1,0n],[0n,1],[true,0n],[0n,null]])assert.throws(()=>evaluateOwnedVectorCandidate(row.result.program,'integercase0',[nullValue(),offset,amount,true],runtime));assert.deepEqual(evaluateOwnedVectorCandidate(row.result.program,'integercase0',[nullValue(),0n,0n,true],runtime),[unsignedValue(0n),signedValue(0n)]);});
test('integer parameter admission refuses changed original width and incompatible paired keyword',limits,()=>{const row=integerFixture();for(const kind of ['width','keyword']){const input=structuredClone(row.input);if(kind==='width')input.files.find(file=>file.path==='src/lib.rs').source=input.files.find(file=>file.path==='src/lib.rs').source.replaceAll('offset:u64','offset:u32');else input.files.find(file=>file.path===TS).source=input.files.find(file=>file.path===TS).source.replaceAll('offset:bigint','offset:string');assert.throws(()=>translateOwnedVectorCandidate(input.files.find(file=>file.path===JS).source,{context:createOwnedVectorCandidateContext(input),sourcePath:JS,typescriptOutputPath:TS}));}});
test('five complete integer input equations retain full originals and exact two phases',limits,()=>{const plan=prepareVectorJsonIntegerInputsSources();assert.equal(plan.files.length,5);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});

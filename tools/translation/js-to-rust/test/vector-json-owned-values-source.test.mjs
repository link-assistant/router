// Owned canonical JSON return shape batches. SOURCE ONLY; ALL UNRUN.
// Borrowed native string input family. SOURCE ONLY; ALL UNRUN.
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
import {prepareVectorJsonStringInputsSources} from '../../prepare-vector-json-string-inputs-sources.mjs';
import {prepareVectorJsonOwnedValuesSources} from '../../prepare-vector-json-owned-values-sources.mjs';
import {originalJsonOwnedValueDomain} from '../owned-vector-json-native.mjs';
const valueImports='import {json_macro_null as blank,json_macro_bool as boolean,json_macro_string as text,json_macro_u64 as unsigned,json_macro_i64 as signedJson,json_macro_array as array,json_macro_object as object} from "../runtime/json-macro-runtime.mjs";\nimport {router_core_json_copy as copy,router_core_json_index_str as at} from "../runtime/json-update-runtime.mjs";\nimport {serde_json_value_get_string as get} from "../runtime/json-runtime.mjs";\nimport {router_field_json_owned_field_or_null as ownedField,router_field_json_u64_field_or as count} from "../runtime/json-fields-runtime.mjs";\n';
const builderBodies=['return blank();','return boolean(flag);','return text(key);','return unsigned(offset);','return signedJson(amount);','return copy(seed);'],composedBodies=[
 'return array([seed,text(key)]);',
 'return object([["input",seed],["key",text(key)]]);',
 'return ownedField(seed,key);',
 'const selected=get(seed,key);if(selected.$==="Some"){return copy(selected.field0);}else{return blank();}',
 'if(flag){return copy(seed);}else{return object([]);}',
 'const value=count(seed,key,offset);return unsigned(value);',
];
function valueFixture(bodies){const source=valueImports+bodies.map((body,index)=>'export function valuecase'+index+'(seed,flag,offset,amount,key){'+body+'}').join('\n'),typed=typeImport+valueImports+bodies.map((body,index)=>'export function valuecase'+index+'(seed:JsonValue,flag:boolean,offset:bigint,amount:bigint,key:string):JsonValue{'+body+'}').join('\n'),rust=bodies.map((_body,index)=>'pub fn valuecase'+index+'(seed:&'+T+',flag:bool,offset:u64,amount:i64,key:&str)->'+T+'{'+B+'json_checked_copy(seed)}').join('\n'),input=data(rust,source,typed);input.files.find(file=>file.path==='src/lib.rs').source='pub mod translation_json_core;\npub mod translation_json_fields_core;\n'+input.files.find(file=>file.path==='src/lib.rs').source;input.files.push({path:'src/translation_json_core.rs',source:BOUNDED_JSON_CORE_SOURCE},{path:'src/translation_json_fields_core.rs',source:JSON_FIELDS_NATIVE_SOURCE});input.vectorBindings=bodies.map((_body,index)=>({javascriptPath:JS,javascriptName:'valuecase'+index,rustPath:'src/lib.rs',rustName:'valuecase'+index}));const context=createOwnedVectorCandidateContext(input),result=translateOwnedVectorCandidate(source,{context,sourcePath:JS,typescriptOutputPath:TS});return {input,context,result};}
for(const javascript of [false,true])test('six owned JSON constructor return shapes preserve scalar ABI from authority '+javascript,limits,async()=>{const row=valueFixture(builderBodies),proposal=sync(row,javascript),project=forward(row,proposal);assert.equal(proposal.selectedFunctions.length,6);assert.ok(row.result.program.every(item=>item.vectorOrigin.kind==='json-value'&&item.returns==='json'));await verifyTypedTargets(project,api=>{const seed=objectValue([['nested',arrayValue([stringValue('Ω😀')])]]),before=structuredClone(seed);for(const flag of [true,false])for(const offset of [0n,18446744073709551615n])for(const amount of [-9223372036854775808n,0n,9223372036854775807n])for(const key of ['','Ω😀']){const expected=[nullValue(),boolValue(flag),stringValue(key),unsignedValue(offset),signedValue(amount),seed];for(let index=0;index<expected.length;index++)assert.deepEqual(api['valuecase'+index](seed,flag,offset,amount,key),expected[index]);assert.notEqual(api.valuecase5(seed,flag,offset,amount,key),seed);}assert.deepEqual(seed,before);},{childTimeoutMs:20000});for(let index=0;index<builderBodies.length;index++){const item=row.result.program[index],entry=project.executableDeclarations.find(entry=>entry.qualifiedName==='valuecase'+index),own=entry.checkedSource().declaration,lowered=entry.lower(),domain=originalJsonOwnedValueDomain(own,lowered);assert.equal(domain.kind,'json-value');assert.equal(domain.type,'json');assert.deepEqual(actualNativeJsonVectorTree(own,item,lowered),requestedNativeJsonVectorTree(item));}assert.equal(proposal.nativeInstalled,false);assert.equal(proposal.runtimeParity,false);assert.equal(proposal.rustExecuted,false);});
test('six composed owned JSON returns reuse builders fields options and complete branch controls',limits,async()=>{const row=valueFixture(composedBodies),proposal=sync(row),project=forward(row,proposal);await verifyTypedTargets(project,api=>{const child=objectValue([['nested',arrayValue([stringValue('Ω😀')])]]),seed=objectValue([['child',child],['count',unsignedValue(9n)],['null',nullValue()]]),before=structuredClone(seed);for(const flag of [true,false])for(const key of ['child','missing','null','count']){const args=[seed,flag,7n,-9n,key],entry=seed.field0.entries.find(entry=>entry.key===key);assert.deepEqual(api.valuecase0(...args),arrayValue([seed,stringValue(key)]));assert.deepEqual(api.valuecase1(...args),objectValue([['input',seed],['key',stringValue(key)]]));assert.deepEqual(api.valuecase2(...args),entry?.value??nullValue());assert.deepEqual(api.valuecase3(...args),entry?.value??nullValue());assert.deepEqual(api.valuecase4(...args),flag?seed:objectValue([]));assert.deepEqual(api.valuecase5(...args),unsignedValue(key==='count'?9n:7n));}assert.notEqual(api.valuecase2(seed,true,0n,0n,'child'),child);assert.deepEqual(seed,before);},{childTimeoutMs:20000});for(let index=0;index<composedBodies.length;index++){const entry=project.executableDeclarations.find(entry=>entry.qualifiedName==='valuecase'+index);assert.ok(entry);assert.deepEqual(actualNativeJsonVectorTree(entry.checkedSource().declaration,row.result.program[index],entry.lower()),requestedNativeJsonVectorTree(row.result.program[index]));}});
test('a second owned JSON synchronization reissues actual installed bodies including temporary owned vectors',limits,()=>{const row=valueFixture(composedBodies),first=sync(row),input=structuredClone(row.input);for(const edit of first.rustEdits)input.files.find(file=>file.path===edit.path).source=edit.after;input.files.find(file=>file.path===JS).source=first.javascript;input.files.find(file=>file.path===TS).source=first.typescript;const second=proposeOwnedVectorNativeSynchronization(input,{sourcePath:JS,typescriptPath:TS,javascript:first.javascript});assert.deepEqual(second.rustEdits,[]);assert.equal(second.javascript,first.javascript);assert.equal(second.typescript,first.typescript);assert.equal(second.runtimeParity,false);assert.equal(second.rustExecuted,false);});
test('scalar JSON native return cannot be confused with a source vector or borrowed return',limits,()=>{assert.throws(()=>valueFixture(['return [blank()];']));const row=valueFixture(['return copy(seed);']),input=structuredClone(row.input);input.files.find(file=>file.path==='src/lib.rs').source=input.files.find(file=>file.path==='src/lib.rs').source.replace('->'+T+'{'+B+'json_checked_copy(seed)}','->&'+T+'{seed}');assert.throws(()=>translateOwnedVectorCandidate(input.files.find(file=>file.path===JS).source,{context:createOwnedVectorCandidateContext(input),sourcePath:JS,typescriptOutputPath:TS}));});
test('eight complete owned JSON value equations retain full canonical validator copy and exact phases',limits,()=>{const plan=prepareVectorJsonOwnedValuesSources();assert.equal(plan.files.length,8);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});

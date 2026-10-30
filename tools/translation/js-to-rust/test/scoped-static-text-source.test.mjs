// Actual immutable static-text facts in family conditionals. ALL UNRUN.
// Reused Unicode/ASCII core operations and private JSON loan receipts. ALL UNRUN.
// Same-unit selected scalar call graph. SOURCE ONLY; ALL UNRUN.
// Pure primitive source-unit bulk cases. SOURCE ONLY; ALL UNRUN.
// JSON-input primitive return families. SOURCE ONLY; ALL UNRUN.
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
import {prepareVectorJsonScalarReturnsSources} from '../../prepare-vector-json-scalar-returns-sources.mjs';
import {originalJsonScalarDomain} from '../owned-vector-json-native.mjs';
import {preparePrimitiveScalarUnitsSources} from '../../prepare-primitive-scalar-units-sources.mjs';
import {originalPrimitiveScalarDomain} from '../owned-vector-json-native.mjs';
import {prepareOwnedSourceScalarCallsSources} from '../../prepare-owned-source-scalar-calls-sources.mjs';
import {assertScalarSourceCallClosure,assertScalarSourceCallSummaries,scalarSourceCallSummary} from '../owned-source-scalar-calls.mjs';
import {serializeOwnedCoreDocument} from '../owned-vector-candidate-document.mjs';
import {prepareVectorTextScalarCoreSources} from '../../prepare-vector-text-scalar-core-sources.mjs';
import {ownedVectorTextScalarOperation,ownedAsciiOperation} from '../owned-vector-text-scalars.mjs';
import {isGenuineRouterCoreScalarCall} from '../../router-core-scalars.mjs';
import {prepareScopedStaticTextSources} from '../../prepare-scoped-static-text-sources.mjs';
const staticImports='import {router_core_unicode_scalar_count as count,router_core_ascii_chars_in as ascii} from "../runtime/string-iterator-runtime.mjs";\nimport {serde_json_value_as_str as asText} from "../runtime/json-runtime.mjs";\nimport {json_macro_string as textValue} from "../runtime/json-macro-runtime.mjs";\n',staticRows=[
 {type:'bool',body:'const yes="Ω😀";const no="other";const chosen=flag?yes:no;return chosen===text;'},
 {type:'bool',body:'const value="Ω😀";const alias=value;const chosen=flag?alias:"other";return chosen===text;'},
 {type:'u64',body:'const yes="Ω😀";const no="a";const chosen=flag?yes:no;const alias=chosen;return count(alias);'},
 {type:'bool',body:'const first="ab";const second="cd";const chosen=flag?first:second;return ascii(text,chosen);'},
 {type:'u64',json:true,body:'const fallback="Ω😀";const value=asText(seed);if(value.$==="Some"){const chosen=flag?value.field0:fallback;return count(chosen);}else{return count(fallback);}'},
 {type:'json-list-owned',json:true,body:'const yes="Ω😀";const no="other";const chosen=flag?yes:no;return [textValue(chosen)];'},
];
function staticFixture(rows=staticRows){const native=type=>type==='u64'?'u64':type==='bool'?'bool':'Vec<'+T+'>',typedType=type=>type==='u64'?'bigint':type==='bool'?'boolean':'readonly JsonValue[]',source=staticImports+rows.map((row,index)=>'export function staticcase'+index+'('+(row.json?'seed,':'')+'text,alphabet,flag){'+row.body+'}').join('\n'),typed=typeImport+staticImports+rows.map((row,index)=>'export function staticcase'+index+'('+(row.json?'seed:JsonValue,':'')+'text:string,alphabet:string,flag:boolean):'+typedType(row.type)+'{'+row.body+'}').join('\n'),rust=rows.map((row,index)=>'pub fn staticcase'+index+'('+(row.json?'seed:&'+T+',':'')+'text:&str,alphabet:&str,flag:bool)->'+native(row.type)+'{'+(row.type==='json-list-owned'?C+'vec!['+B+'json_checked_copy(seed)]':row.type==='bool'?'false':'0_u64')+'}').join('\n'),input=data(rust,source,typed);input.files.find(file=>file.path==='src/lib.rs').source='pub mod translation_json_core;\n'+input.files.find(file=>file.path==='src/lib.rs').source;input.files.push({path:'src/translation_json_core.rs',source:BOUNDED_JSON_CORE_SOURCE});input.vectorBindings=rows.map((_row,index)=>({javascriptPath:JS,javascriptName:'staticcase'+index,rustPath:'src/lib.rs',rustName:'staticcase'+index}));const context=createOwnedVectorCandidateContext(input),result=translateOwnedVectorCandidate(source,{context,sourcePath:JS,typescriptOutputPath:TS});return {input,context,result};}
for(const javascript of [false,true])test('six actual static-alias conditional caller forms preserve loans and authority '+javascript,limits,async()=>{const row=staticFixture(),proposal=sync(row,javascript),project=forward(row,proposal);assert.equal(proposal.selectedFunctions.length,6);await verifyTypedTargets(project,api=>{for(const flag of [true,false])for(const text of ['','Ω😀','other','abc','cd']){const selected=flag?'Ω😀':'other';assert.equal(api.staticcase0(text,'',flag),selected===text);assert.equal(api.staticcase1(text,'',flag),selected===text);assert.equal(api.staticcase2(text,'',flag),flag?2n:1n);assert.equal(api.staticcase3(text,'',flag),Array.from(text).every(value=>value.codePointAt(0)<128&&(flag?'ab':'cd').includes(value)));const seed=stringValue(text),before=structuredClone(seed);assert.equal(api.staticcase4(seed,text,'',flag),flag?BigInt(Array.from(text).length):2n);assert.deepEqual(api.staticcase5(seed,text,'',flag),[stringValue(selected)]);assert.deepEqual(seed,before);}assert.equal(api.staticcase4(nullValue(),'','',true),2n);},{childTimeoutMs:20000});for(const item of row.result.program){const entry=project.executableDeclarations.find(entry=>entry.qualifiedName===item.vectorOrigin.original.qualifiedName);assert.ok(entry);assert.deepEqual(actualNativeJsonVectorTree(entry.checkedSource().declaration,item,entry.lower()),requestedNativeJsonVectorTree(item));}assert.equal(proposal.runtimeParity,false);assert.equal(proposal.rustExecuted,false);});
test('distinct dynamic string roots and mismatched scalar branches retain their refusals',limits,()=>{for(const body of ['const chosen=flag?text:alphabet;return chosen==="";','const chosen=flag?"safe":0n;return chosen==="safe";','const forged={asciiStaticLoan:true,root:null};const chosen=flag?forged:text;return chosen==="";'])assert.throws(()=>staticFixture([{type:'bool',body}]));});
test('static text alias facts are rederived from installed paired source at the next synchronization',limits,()=>{const row=staticFixture(),first=sync(row),input=structuredClone(row.input);for(const edit of first.rustEdits)input.files.find(file=>file.path===edit.path).source=edit.after;input.files.find(file=>file.path===JS).source=first.javascript;input.files.find(file=>file.path===TS).source=first.typescript;const second=proposeOwnedVectorNativeSynchronization(input,{sourcePath:JS,typescriptPath:TS,javascript:first.javascript});assert.deepEqual(second.rustEdits,[]);assert.equal(second.typescript,first.typescript);assert.equal(second.runtimeParity,false);});
test('two full static-text equations retain original source CST inverses and exact phases',limits,()=>{const plan=prepareScopedStaticTextSources();assert.equal(plan.files.length,2);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});

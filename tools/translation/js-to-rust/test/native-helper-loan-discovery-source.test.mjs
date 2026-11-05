// Automatic discovery uses complete independent readonly helper loan rules. ALL UNRUN.
// Genuine scalar helper JSON text loans, full source closure. ALL UNRUN.
// Fixed-width pure scalar unit rules, independent ABI boundaries. ALL UNRUN.
// Automatic native-to-paired module discovery cases. SOURCE ONLY; ALL UNRUN.
// Qualified scalar local annotation and receiving fixed point. ALL UNRUN.
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
import {ownedBulkRuntimeSources as ownedCoreRuntimeSources} from '../owned-vector-candidate-source.mjs';
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



import {prepareReadonlyTextHelpersSources} from '../../prepare-readonly-text-helpers-sources.mjs';
const helperImports='import {router_core_unicode_scalar_count as count,router_core_ascii_chars_in as ascii} from "../runtime/string-iterator-runtime.mjs";\nimport {serde_json_value_as_str as asText} from "../runtime/json-runtime.mjs";\nimport {json_macro_bool as boolean} from "../runtime/json-macro-runtime.mjs";\n';
function readonlyHelperFixture({callerFirst=false}={}){const rows=[
 {name:'helper_ascii',parameters:'text,alphabet',typed:'text:string,alphabet:string',returns:'boolean',rustParameters:'text:&str,alphabet:&str',rustReturn:'bool',body:'return ascii(text,alphabet);',native:C+'ascii_chars_in(text,alphabet)'},
 {name:'helper_count',parameters:'text',typed:'text:string',returns:'bigint',rustParameters:'text:&str',rustReturn:'u64',body:'return count(text);',native:'('+C+'unicode_scalar_count(text) as u64)'},
 {name:'helper_relay',parameters:'text,alphabet',typed:'text:string,alphabet:string',returns:'boolean',rustParameters:'text:&str,alphabet:&str',rustReturn:'bool',body:'return helper_ascii(text,alphabet);',native:'crate::helper_ascii(text,alphabet)'},
 {name:'caller_ascii',parameters:'seed,alphabet',typed:'seed:JsonValue,alphabet:string',returns:'boolean',rustParameters:'seed:&'+T+',alphabet:&str',rustReturn:'bool',body:'const value=asText(seed);if(value.$==="Some"){const text=value.field0;return helper_relay(text,alphabet);}else{return false;}',native:'false'},
 {name:'caller_count',parameters:'seed',typed:'seed:JsonValue',returns:'bigint',rustParameters:'seed:&'+T,rustReturn:'u64',body:'const value=asText(seed);if(value.$==="Some"){return helper_count(value.field0);}else{return 0n;}',native:'0_u64'},
 {name:'caller_vector',parameters:'seed,alphabet',typed:'seed:JsonValue,alphabet:string',returns:'readonly JsonValue[]',rustParameters:'seed:&'+T+',alphabet:&str',rustReturn:'Vec<'+T+'>',body:'const value=asText(seed);if(value.$==="Some"){return [boolean(helper_relay(value.field0,alphabet))];}else{return [];}',native:C+'vec![]'},
 ];if(callerFirst)rows.reverse();const source=helperImports+rows.map(row=>'export function '+row.name+'('+row.parameters+'){'+row.body+'}').join('\n'),typed=typeImport+helperImports+rows.map(row=>'export function '+row.name+'('+row.typed+'):'+row.returns+'{'+row.body+'}').join('\n'),rust=rows.map(row=>'pub fn '+row.name+'('+row.rustParameters+')->'+row.rustReturn+'{'+row.native+'}').join('\n'),input=data(rust,source,typed);input.files.find(file=>file.path==='src/lib.rs').source='pub mod translation_json_core;\n'+input.files.find(file=>file.path==='src/lib.rs').source;input.files.push({path:'src/translation_json_core.rs',source:BOUNDED_JSON_CORE_SOURCE});input.vectorBindings=rows.map(row=>({javascriptPath:JS,javascriptName:row.name,rustPath:'src/lib.rs',rustName:row.name}));const context=createOwnedVectorCandidateContext(input),result=translateOwnedVectorCandidate(source,{context,sourcePath:JS,typescriptOutputPath:TS});return {input,context,result};}

import {proposeOwnedNativeBulkSynchronization} from '../owned-native-bulk-composition.mjs';
import {proposeOwnedNativeBulkModuleRefresh} from '../owned-native-bulk-module-refresh.mjs';
import {prepareNativeHelperLoanDiscoverySources} from '../../prepare-native-helper-loan-discovery-sources.mjs';
function currentNativeOnly(){const row=readonlyHelperFixture({callerFirst:true}),first=sync(row),files=new Map(row.input.files.filter(file=>file.path!==JS&&file.path!==TS).map(file=>[file.path,file.source]));for(const edit of first.rustEdits)files.set(edit.path,edit.after);return {...row.input,vectorBindings:[],files:[...files].map(([path,source])=>({path,source}))};}
test('automatic whole-module discovery projects guarded JSON text helper calls with fresh private loans',limits,()=>{const input=currentNativeOnly(),proposal=proposeOwnedNativeBulkSynchronization(input),module=proposal.modules.find(row=>row.rustSource==='src/lib.rs');assert.ok(module);assert.equal(module.bindings.length,6);for(const name of ['helper_ascii','helper_count','helper_relay','caller_ascii','caller_count','caller_vector'])assert.ok(module.bindings.some(row=>row.rustName===name));const output=proposal.outputs.find(row=>row.path===module.bindings[0].javascriptPath);assert.ok(output.after.includes('helper_relay('));assert.ok(output.after.includes('.field0'));assert.equal(proposal.receivingExecuted,false);assert.equal(proposal.runtimeParity,false);assert.equal(proposal.rustExecuted,false);});
test('automatic readonly helper adoption and Rust refresh independently rejoin complete native and receiving sources',limits,()=>{const input=currentNativeOnly(),first=proposeOwnedNativeBulkSynchronization(input),files=new Map(input.files.map(row=>[row.path,row.source]));for(const edit of [...first.nativeEdits,...first.outputs])files.set(edit.path,edit.after);const installed={...input,vectorBindings:first.modules.flatMap(row=>row.bindings),files:[...files].map(([path,source])=>({path,source}))},module=first.modules.find(row=>row.rustSource==='src/lib.rs'),sourcePath=module.bindings[0].javascriptPath,typescriptPath=sourcePath.replace('app/','typed/').replace(/\.mjs$/u,'.mts'),again=proposeOwnedNativeBulkModuleRefresh(installed,[{sourcePath,typescriptPath}]);assert.deepEqual(again.nativeEdits,[]);assert.ok(again.outputs.every(row=>row.before===row.after));assert.equal(again.runtimeParity,false);});
test('automatic helper discovery cannot accept changed actual native scalar library source',limits,()=>{const input=currentNativeOnly();input.files.find(row=>row.path==='src/translation_core/primitives.rs').source+='\n// different original implementation';assert.throws(()=>proposeOwnedNativeBulkSynchronization(input));});
test('two complete discovery-connection equations preserve exact inverses and fixed phases',limits,()=>{const plan=prepareNativeHelperLoanDiscoverySources();assert.equal(plan.files.length,2);for(const file of plan.files){assert.equal(file.current,file.currentAfter);assert.equal(file.inverse,file.before);assert.deepEqual(file.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});

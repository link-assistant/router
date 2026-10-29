// Complete original AST early returns for native scalar/canonical JSON functions. ALL UNRUN.
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



import {prepareNativeGuardContinuationSources} from '../../prepare-native-guard-continuation-sources.mjs';
const guardImports='import {router_core_json_copy as copy} from "../runtime/json-update-runtime.mjs";\nimport {serde_json_value_as_str as asText} from "../runtime/json-runtime.mjs";\nimport {router_core_ascii_chars_in as ascii} from "../runtime/string-iterator-runtime.mjs";\n';
function guardFixture(){const rows=[
 {name:'boolean_guard',args:'flag',typed:'flag:boolean',nativeArgs:'flag:bool',returns:'boolean',nativeReturn:'bool',body:'if(flag){return true;}return false;',native:'false'},
 {name:'scalar_guard',args:'flag,value',typed:'flag:boolean,value:bigint',nativeArgs:'flag:bool,value:u32',returns:'bigint',nativeReturn:'u32',body:'if(flag){return value;}return 0n;',native:'0_u32'},
 {name:'owned_guard',args:'seed,flag',typed:'seed:JsonValue,flag:boolean',nativeArgs:'seed:&'+T+',flag:bool',returns:'JsonValue',nativeReturn:T,body:'if(flag){return copy(seed);}return copy(seed);',native:B+'json_checked_copy(seed)'},
 {name:'vector_guard',args:'seed,flag',typed:'seed:JsonValue,flag:boolean',nativeArgs:'seed:&'+T+',flag:bool',returns:'readonly JsonValue[]',nativeReturn:'Vec<'+T+'>',body:'if(flag){return [];}return [copy(seed)];',native:C+'vec![]'},
 {name:'helper_ascii',args:'text,alphabet',typed:'text:string,alphabet:string',nativeArgs:'text:&str,alphabet:&str',returns:'boolean',nativeReturn:'bool',body:'return ascii(text,alphabet);',native:C+'ascii_chars_in(text,alphabet)'},
 {name:'payload_guard',args:'seed,alphabet',typed:'seed:JsonValue,alphabet:string',nativeArgs:'seed:&'+T+',alphabet:&str',returns:'boolean',nativeReturn:'bool',body:'const value=asText(seed);if(value.$==="None"){return false;}return helper_ascii(value.field0,alphabet);',native:'false'},
 {name:'multiple_guards',args:'first,second,value',typed:'first:boolean,second:boolean,value:bigint',nativeArgs:'first:bool,second:bool,value:u32',returns:'bigint',nativeReturn:'u32',body:'if(first){return value;}if(second){return 1n;}return 0n;',native:'0_u32'},
 ],source=guardImports+rows.map(row=>'export function '+row.name+'('+row.args+'){'+row.body+'}').join('\n'),typed=typeImport+guardImports+rows.map(row=>'export function '+row.name+'('+row.typed+'):'+row.returns+'{'+row.body+'}').join('\n'),rust=rows.map(row=>'pub fn '+row.name+'('+row.nativeArgs+')->'+row.nativeReturn+'{'+row.native+'}').join('\n'),input=data(rust,source,typed);input.files.find(file=>file.path==='src/lib.rs').source='pub mod translation_json_core;\n'+input.files.find(file=>file.path==='src/lib.rs').source;input.files.push({path:'src/translation_json_core.rs',source:BOUNDED_JSON_CORE_SOURCE});input.vectorBindings=rows.map(row=>({javascriptPath:JS,javascriptName:row.name,rustPath:'src/lib.rs',rustName:row.name}));const context=createOwnedVectorCandidateContext(input),result=translateOwnedVectorCandidate(source,{context,sourcePath:JS,typescriptOutputPath:TS});return {input,context,result};}
const asciiGuardOracle=(text,alphabet)=>Array.from(text).every(char=>char.codePointAt(0)<128&&alphabet.includes(char));
for(const authority of ['javascript','typescript'])test('actual scalar and canonical JSON guard continuations preserve values roots and effects from '+authority,limits,async()=>{const row=guardFixture(),proposal=proposeOwnedVectorNativeSynchronization(row.input,{sourcePath:JS,typescriptPath:TS,[authority]:row.input.files.find(file=>file.path===(authority==='javascript'?JS:TS)).source}),project=forward(row,proposal),runtime=await prepareOwnedVectorCandidateRuntime(row.result.program);assert.equal(proposal.selectedFunctions.length,7);for(const item of row.result.program){const entry=project.executableDeclarations.find(entry=>entry.qualifiedName===item.javascript);assert.ok(entry);assert.deepEqual(actualNativeJsonVectorTree(entry.checkedSource().declaration,item,entry.lower()),requestedNativeJsonVectorTree(item));}await verifyTypedTargets(project,api=>{for(const flag of [true,false])for(const value of [0n,1n,4294967295n]){assert.equal(api.boolean_guard(flag),flag);assert.equal(api.scalar_guard(flag,value),flag?value:0n);for(const second of [true,false])assert.equal(api.multiple_guards(flag,second,value),flag?value:second?1n:0n);for(const seed of [nullValue(),arrayValue([stringValue('Ω😀')])]){const before=structuredClone(seed);assert.deepEqual(api.owned_guard(seed,flag),seed);assert.deepEqual(api.vector_guard(seed,flag),flag?[]:[seed]);assert.deepEqual(seed,before);}}for(const text of ['','abc','Ω😀','a\u0000'])for(const alphabet of ['','abc','Ω😀','a\u0000']){const seed=stringValue(text);assert.equal(api.payload_guard(seed,alphabet),asciiGuardOracle(text,alphabet));assert.equal(evaluateOwnedVectorCandidate(row.result.program,'payload_guard',[seed,alphabet],runtime),asciiGuardOracle(text,alphabet));}for(const seed of [nullValue(),arrayValue([]),objectValue([])])assert.equal(api.payload_guard(seed,''),false);},{childTimeoutMs:20000});assert.equal(proposal.runtimeParity,false);assert.equal(proposal.rustExecuted,false);});
test('value guards require terminating branches and a complete typed continuation',limits,()=>{const row=guardFixture();for(const [before,after]of [['if(flag){return true;}return false;','if(flag){return true;}'],['if(flag){return true;}return false;','if(flag){const seen=flag;}return false;'],['if(flag){return value;}return 0n;','if(flag){return value;}return true;']]){const input=structuredClone(row.input);input.files.find(file=>file.path===JS).source=input.files.find(file=>file.path===JS).source.replace(before,after);assert.throws(()=>proposeOwnedVectorNativeSynchronization(input,{sourcePath:JS,typescriptPath:TS,javascript:input.files.find(file=>file.path===JS).source}));}});
test('Some refinement cannot be forged by a nonterminating absence guard',limits,()=>{const row=guardFixture(),input=structuredClone(row.input);input.files.find(file=>file.path===JS).source=input.files.find(file=>file.path===JS).source.replace('if(value.$==="None"){return false;}','if(value.$==="None"){const absent=true;}');assert.throws(()=>proposeOwnedVectorNativeSynchronization(input,{sourcePath:JS,typescriptPath:TS,javascript:input.files.find(file=>file.path===JS).source}));});
test('two complete guard-generalization equations retain full originals and exact phases',limits,()=>{const plan=prepareNativeGuardContinuationSources();assert.equal(plan.files.length,2);for(const file of plan.files){assert.equal(file.current,file.currentAfter);assert.equal(file.inverse,file.before);assert.deepEqual(file.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});

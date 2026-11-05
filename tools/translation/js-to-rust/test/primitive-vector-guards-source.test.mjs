// Primitive vector original-AST guard and alias drafts. ALL UNRUN.
// Existing primitive vector families in bulk source discovery. ALL UNRUN.
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


import {proposeOwnedNativeBulkDiscovery} from '../owned-native-bulk-discovery.mjs';
import {proposeOwnedNativeBulkSynchronization} from '../owned-native-bulk-composition.mjs';
import {proposeOwnedNativeBulkModuleRefresh} from '../owned-native-bulk-module-refresh.mjs';
import {proposeOwnedVectorBulkModuleSynchronization} from '../owned-vector-bulk-module-synchronization.mjs';
import {prepareNativeVectorFamiliesSources} from '../../prepare-native-vector-families-sources.mjs';
import {nativeProjectionParameters,projectNativePrimitiveVectorFunction} from '../owned-native-vector-families.mjs';

import {preparePrimitiveVectorGuardsSources} from '../../prepare-primitive-vector-guards-sources.mjs';
import {actualNativeVectorTree,requestedNativeVectorTree} from '../owned-vector-native-control.mjs';
const widths=['u8','u16','u32','u64','u128','usize','i8','i16','i32','i64','i128','isize'];
const families=[...widths.map(type=>({name:'guard_'+type,native:type,typed:'bigint',value:'1_'+type,source:'1n',seed:7n})),{name:'guard_bool',native:'bool',typed:'boolean',value:'true',source:'true',seed:false},{name:'guard_float',native:'f64',typed:'number',value:'-0.0_f64',source:'-0',seed:1.5},{name:'guard_static',native:"&'static str",typed:'string',value:'"Ω😀"',source:'"Ω😀"',seed:''},{name:'guard_owned',native:'String',typed:'string',value:'::std::borrow::ToOwned::to_owned("Ω😀")',source:'"Ω😀"',seed:'source'}];
function fixture(){const rust=families.map(row=>'pub fn '+row.name+'(flag:bool,seed:'+row.native+')->Vec<'+row.native+'>{let guard=flag;'+(row.native==='String'?'':'let alias=seed;')+'if guard{return '+C+'vec!['+(row.native==='String'?'::std::borrow::ToOwned::to_owned(&seed)':'alias')+'];}'+C+'vec!['+row.value+']}').join('\n'),source=families.map(row=>'export function '+row.name+'(flag,seed){const guard=flag;const alias=seed;if(guard){return [alias];}return ['+row.source+'];}').join('\n'),typed=families.map(row=>'export function '+row.name+'(flag:boolean,seed:'+row.typed+'):readonly '+row.typed+'[]{const guard=flag;const alias=seed;if(guard){return [alias];}return ['+row.source+'];}').join('\n'),input=data(rust,source,typed);input.vectorBindings=families.map(row=>({javascriptPath:JS,javascriptName:row.name,rustPath:'src/lib.rs',rustName:row.name}));const context=createOwnedVectorCandidateContext(input),result=translateOwnedVectorCandidate(source,{context,sourcePath:JS,typescriptOutputPath:TS});return {input,context,result};}
function observations(row,proposal={rustEdits:[]}){const project=forward(row,proposal);for(const item of row.result.program){const entry=project.executableDeclarations.find(entry=>entry.qualifiedName===item.javascript);assert.ok(entry);assert.deepEqual(actualNativeVectorTree(entry.checkedSource().declaration,item),requestedNativeVectorTree(item));}return project;}
test('original primitive vector guards and immutable source aliases preserve all existing element families',limits,async()=>{const row=fixture(),project=observations(row);assert.equal(row.result.program.length,16);await verifyTypedTargets(project,api=>{for(const family of families){assert.deepEqual(api[family.name](true,family.seed),[family.seed]);const value=family.typed==='bigint'?1n:family.native==='bool'?true:family.native==='f64'?-0:'Ω😀';assert.deepEqual(api[family.name](false,family.seed),[value]);}},{childTimeoutMs:20000});});
for(const authority of ['javascript','typescript'])test('guarded primitive vector modules round trip from '+authority,limits,()=>{const row=fixture(),proposal=proposeOwnedVectorNativeSynchronization(row.input,{sourcePath:JS,typescriptPath:TS,[authority]:row.input.files.find(file=>file.path===(authority==='javascript'?JS:TS)).source});assert.equal(proposal.selectedFunctions.length,16);observations(row,proposal);assert.equal(proposal.rustExecuted,false);});
test('automatic discovery reads actual native guards rather than requiring canonical emitted bodies',limits,()=>{const row=fixture();row.input.files=row.input.files.filter(file=>file.path!==JS&&file.path!==TS);row.input.vectorBindings=[];const proposal=proposeOwnedNativeBulkDiscovery(row.input),module=proposal.modules.find(row=>row.rustSource==='src/lib.rs');assert.ok(module);assert.deepEqual(module.bindings.map(row=>row.rustName).sort(),families.map(row=>row.name).sort());assert.equal(module.originalOrderedBodiesReproduced,true);assert.equal(proposal.runtimeParity,false);assert.equal(proposal.rustExecuted,false);});
test('multiple vector guards retain original remaining statements and branch-local bindings',limits,()=>{const rust='pub fn values(first:bool,second:bool,seed:u8)->Vec<u8>{if first{return '+C+'vec![seed];}if second{return '+C+'vec![1_u8];}'+C+'vec![0_u8]}',source='export function values(first,second,seed){if(first){return [seed];}if(second){const one=1n;return [one];}return [0n];}',typed='export function values(first:boolean,second:boolean,seed:bigint):readonly bigint[]{if(first){return [seed];}if(second){const one=1n;return [one];}return [0n];}',row=translate(rust,source,typed);observations(row);observations(row,sync(row,true));});
test('missing continuations mutable native prefixes and discarded values retain refusals',limits,()=>{const input=fixture();for(const source of ['export function guard_u8(flag,seed){if(flag){return [seed];}}','export function guard_u8(flag,seed){if(seed){return [seed];}return [1n];}','export function guard_u8(flag,seed){if(flag){const copy=seed;}return [1n];}','export function guard_u8(flag,seed){if(flag){return [seed];}seed;return [1n];}'])assert.throws(()=>translateOwnedVectorCandidate(source,{context:input.context,sourcePath:JS,typescriptOutputPath:TS}));for(const body of ['let mut alias=seed;'+C+'vec![alias]','seed;'+C+'vec![seed]']){const native=data('pub fn values(flag:bool,seed:u8)->Vec<u8>{'+body+'}','','');native.vectorBindings=[];const proposal=proposeOwnedNativeBulkDiscovery(native);assert.ok(proposal.refusals.some(row=>row.name==='values'));assert.equal(proposal.modules.some(module=>module.bindings.some(row=>row.rustName==='values')),false);}});
test('six complete vector guard equations preserve source inverses and the fixed phase sequence',limits,()=>{const plan=preparePrimitiveVectorGuardsSources();assert.equal(plan.files.length,6);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});

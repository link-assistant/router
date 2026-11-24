// Complete native falling-branch continuation drafts. ALL UNRUN.
// Actual original native control observation and independent paired module checks. ALL UNRUN.
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




import {proposeOwnedNativeBulkDiscovery} from '../owned-native-bulk-discovery.mjs';
import {observeNativeFunctionControl} from '../owned-native-function-control.mjs';
import {prepareNativeFunctionControlSources} from '../../prepare-native-function-control-sources.mjs';

import {PRIMITIVE_BITWISE_TYPES} from '../../primitive-bitwise-types.mjs';
import {prepareNativeFallthroughControlSources} from '../../prepare-native-fallthrough-control-sources.mjs';
const fallthroughImports='import {router_vector_json_validate as validate,router_core_json_copy as copy} from "../runtime/json-update-runtime.mjs";\n';
function fallthroughFixture(){const rows=[...PRIMITIVE_BITWISE_TYPES.map(domain=>({name:'fall_'+domain.name,args:'flag,value',typed:'flag:boolean,value:bigint',nativeArgs:'flag:bool,value:'+domain.name,returns:'bigint',nativeReturn:domain.name,body:'if(flag){return value;}else{return value;}',native:'if flag {()}else{()} value'})),
 {name:'fall_bool',args:'flag,value',typed:'flag:boolean,value:boolean',nativeArgs:'flag:bool,value:bool',returns:'boolean',nativeReturn:'bool',body:'if(flag){return value;}else{return value;}',native:'if flag {()}else{()} value'},
 {name:'fall_unit',args:'flag',typed:'flag:boolean',nativeArgs:'flag:bool',returns:'void',nativeReturn:'()',body:'if(flag){return;}else{return;}',native:'if flag {()}else{()} ()'},
 {name:'fall_json',args:'flag,seed,other',typed:'flag:boolean,seed:JsonValue,other:JsonValue',nativeArgs:'flag:bool,seed:&'+T+',other:&'+T,returns:'JsonValue',nativeReturn:T,body:'if(flag){validate(seed);return copy(seed);}else{validate(other);return copy(seed);}',native:'if flag {'+B+'json_validate(seed);}else{'+B+'json_validate(other);}'+B+'json_checked_copy(seed)'},
 {name:'fall_vector',args:'flag,seed,other',typed:'flag:boolean,seed:JsonValue,other:JsonValue',nativeArgs:'flag:bool,seed:&'+T+',other:&'+T,returns:'readonly JsonValue[]',nativeReturn:'Vec<'+T+'>',body:'if(flag){validate(seed);return [copy(seed)];}else{validate(other);return [copy(seed)];}',native:'if flag {'+B+'json_validate(seed);}else{'+B+'json_validate(other);}'+C+'vec!['+B+'json_checked_copy(seed)]'},
 {name:'fall_scalar',args:'flag,seed,other',typed:'flag:boolean,seed:JsonValue,other:JsonValue',nativeArgs:'flag:bool,seed:&'+T+',other:&'+T,returns:'boolean',nativeReturn:'bool',body:'if(flag){validate(seed);return true;}else{validate(other);return true;}',native:'if flag {'+B+'json_validate(seed);}else{'+B+'json_validate(other);}true'},
 {name:'fall_nested',args:'first,second,value',typed:'first:boolean,second:boolean,value:bigint',nativeArgs:'first:bool,second:bool,value:u32',returns:'bigint',nativeReturn:'u32',body:'if(first){if(second){return value;}else{return value;}}else{if(second){return value;}else{return value;}}',native:'if first {()}else{()} if second {()}else{()} value'},
 {name:'fall_locals',args:'flag,value',typed:'flag:boolean,value:bigint',nativeArgs:'flag:bool,value:u32',returns:'bigint',nativeReturn:'u32',body:'if(flag){const alias=value;return alias;}else{const alias=value;return alias;}',native:'if flag {let alias=value;()}else{let alias=value;()} value'},
 ],source=fallthroughImports+rows.map(row=>'export function '+row.name+'('+row.args+'){'+row.body+'}').join('\n'),typed=typeImport+fallthroughImports+rows.map(row=>'export function '+row.name+'('+row.typed+'):'+row.returns+'{'+row.body+'}').join('\n'),rust=rows.map(row=>'pub fn '+row.name+'('+row.nativeArgs+')->'+row.nativeReturn+'{'+(row.nativeArgs.includes('seed:&')?B+'json_validate(seed);'+B+'json_validate(other);':'')+row.native+'}').join('\n'),input=data(rust,source,typed);input.files.find(file=>file.path==='src/lib.rs').source='pub mod translation_json_core;\n'+input.files.find(file=>file.path==='src/lib.rs').source;input.files.push({path:'src/translation_json_core.rs',source:BOUNDED_JSON_CORE_SOURCE});input.vectorBindings=rows.map(row=>({javascriptPath:JS,javascriptName:row.name,rustPath:'src/lib.rs',rustName:row.name}));const context=createOwnedVectorCandidateContext(input),result=translateOwnedVectorCandidate(source,{context,sourcePath:JS,typescriptOutputPath:TS});return {input,context,result,rows};}
function originalBodies(row,proposal={rustEdits:[]}){const project=forward(row,proposal);for(const item of row.result.program){const entry=project.executableDeclarations.find(entry=>entry.qualifiedName===item.javascript);assert.ok(entry);assert.deepEqual(actualNativeJsonVectorTree(entry.checkedSource().declaration,item,entry.lower()),requestedNativeJsonVectorTree(item));}return project;}
test('both falling native branches retain exactly one continuation on every selected path',limits,async()=>{const row=fallthroughFixture(),project=originalBodies(row);await verifyTypedTargets(project,api=>{for(const flag of [true,false]){for(const domain of PRIMITIVE_BITWISE_TYPES)for(const value of [0n,BigInt(domain.maximum)])assert.equal(api['fall_'+domain.name](flag,value),value);assert.equal(api.fall_bool(flag,true),true);assert.equal(api.fall_unit(flag),undefined);const seed=stringValue('Ω😀'),other=arrayValue([]);assert.deepEqual(api.fall_json(flag,seed,other),seed);assert.deepEqual(api.fall_vector(flag,seed,other),[seed]);assert.equal(api.fall_scalar(flag,seed,other),true);assert.equal(api.fall_locals(flag,7n),7n);for(const second of [true,false])assert.equal(api.fall_nested(flag,second,7n),7n);}},{childTimeoutMs:20000});});
for(const authority of ['javascript','typescript'])test('fallthrough source bodies synchronize from '+authority+' with complete original model joins',limits,()=>{const row=fallthroughFixture(),proposal=proposeOwnedVectorNativeSynchronization(row.input,{sourcePath:JS,typescriptPath:TS,[authority]:row.input.files.find(file=>file.path===(authority==='javascript'?JS:TS)).source});assert.equal(proposal.selectedFunctions.length,row.rows.length);originalBodies(row,proposal);assert.equal(proposal.rustExecuted,false);});
test('automatic discovery retains both falling branches and their branch-specific validation order',limits,()=>{const row=fallthroughFixture();row.input.files=row.input.files.filter(file=>file.path!==JS&&file.path!==TS);row.input.vectorBindings=[];const proposal=proposeOwnedNativeBulkDiscovery(row.input),module=proposal.modules.find(row=>row.rustSource==='src/lib.rs');assert.ok(module);assert.deepEqual(module.bindings.map(row=>row.rustName).sort(),row.rows.map(row=>row.name).sort());assert.equal(module.originalOrderedBodiesReproduced,true);assert.equal(proposal.runtimeParity,false);});
test('fallthrough normalization retains discarded-value dead-tail and tree-budget refusals',limits,()=>{for(const source of ['pub fn bad(flag:bool)->u8{if flag {1_u8;}else{()} 0_u8}','pub fn bad()->u8{return 1_u8;2_u8}']){const input=data(source,'','');input.vectorBindings=[];const proposal=proposeOwnedNativeBulkDiscovery(input);assert.ok(proposal.refusals.some(row=>row.name==='bad'));assert.equal(proposal.modules.some(module=>module.bindings.some(row=>row.rustName==='bad')),false);}const type={kind:'bool'},unit={k:'unit',type:{kind:'unit'}},condition={k:'lit',value:true,type};let body={k:'lit',value:true,type};for(let index=0;index<70;index++)body={k:'routerIf',cond:condition,then:unit,else:unit,body,type};assert.throws(()=>observeNativeFunctionControl({k:'fn',params:[],ret:type,body}));});
test('two complete fallthrough source equations preserve full inverse and fixed phases',limits,()=>{const plan=prepareNativeFallthroughControlSources();assert.equal(plan.files.length,2);for(const file of plan.files){assert.equal(file.current,file.currentAfter);assert.equal(file.inverse,file.before);assert.deepEqual(file.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});

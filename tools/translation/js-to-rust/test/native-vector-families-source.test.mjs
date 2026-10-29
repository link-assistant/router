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
const nativeWidths=['u8','u16','u32','u64','u128','usize','i8','i16','i32','i64','i128','isize'],integerRows=nativeWidths.map(type=>({name:'values_'+type,element:type,param:type,body:'if flag { '+C+'vec![seed,1_'+type+'] } else { '+C+'vec![0_'+type+'] }'})),vectorRows=[...integerRows,{name:'values_bool',element:'bool',param:'bool',body:'if flag { '+C+'vec![seed,true] } else { '+C+'vec![false] }'},{name:'values_float',element:'f64',param:'f64',body:'if flag { '+C+'vec![seed,-0.0_f64] } else { '+C+'vec![1.5_f64] }'},{name:'values_static',element:"&'static str",param:"&'static str",body:'if flag { '+C+'vec![seed,"Ω😀"] } else { '+C+'vec![""] }'},{name:'values_owned',element:'String',param:'String',body:'if flag { '+C+'vec![::std::borrow::ToOwned::to_owned(&seed),::std::borrow::ToOwned::to_owned("Ω😀")] } else { '+C+'vec![::std::borrow::ToOwned::to_owned("")] }'}];
function vectors(){const rust=vectorRows.map(row=>'pub fn '+row.name+'(flag:bool,seed:'+row.param+')->Vec<'+row.element+'> { '+row.body+' }').join('\n'),input=data(rust,'','');input.vectorBindings=[];return input;}
function install(input,proposal){const next=structuredClone(input),files=new Map(next.files.map(row=>[row.path,row.source]));for(const row of [...proposal.nativeEdits,...proposal.outputs])files.set(row.path,row.after);next.files=[...files].map(([path,source])=>({path,source}));next.vectorBindings=proposal.modules.flatMap(row=>row.bindings);return next;}
test('all existing primitive vector element families enter automatic source discovery',limits,()=>{const plan=proposeOwnedNativeBulkDiscovery(vectors()),module=plan.modules.find(row=>row.rustSource==='src/lib.rs');assert.ok(module);assert.deepEqual(module.bindings.map(row=>row.rustName).sort(),vectorRows.map(row=>row.name).sort());assert.ok(module.outputs.find(row=>row.path.endsWith('.mts')).after.includes('readonly bigint[]'));assert.ok(module.outputs.find(row=>row.path.endsWith('.mts')).after.includes('readonly number[]'));assert.ok(module.outputs.find(row=>row.path.endsWith('.mts')).after.includes('readonly string[]'));assert.equal(module.originalOrderedBodiesReproduced,true);assert.equal(plan.runtimeParity,false);assert.equal(plan.rustExecuted,false);});
test('primitive vector canonical native binders refresh through positional original-source joins',limits,()=>{const input=vectors(),first=proposeOwnedNativeBulkSynchronization(input),next=install(input,first),module=first.modules.find(row=>row.rustSource==='src/lib.rs'),sourcePath=module.bindings[0].javascriptPath,typescriptPath=sourcePath.replace('app/','typed/').replace(/\.mjs$/u,'.mts');assert.ok(next.files.find(row=>row.path==='src/lib.rs').source.includes('__ro_vector_input_0'));const refreshed=proposeOwnedNativeBulkModuleRefresh(next,[{sourcePath,typescriptPath}]);assert.deepEqual(refreshed.nativeEdits,[]);assert.ok(refreshed.outputs.every(row=>row.before===row.after));assert.equal(refreshed.composedNativeSourceRechecked,true);});
for(const authority of ['javascript','typescript'])test('automatic primitive vector module supports repeat '+authority+' authority',limits,()=>{const input=vectors(),first=proposeOwnedNativeBulkSynchronization(input),next=install(input,first),module=first.modules.find(row=>row.rustSource==='src/lib.rs'),sourcePath=module.bindings[0].javascriptPath,typescriptPath=sourcePath.replace('app/','typed/').replace(/\.mjs$/u,'.mts'),path=authority==='javascript'?sourcePath:typescriptPath,row=next.files.find(row=>row.path===path);row.source=row.source.replace('return [seed, 1n];','return [seed, 2n];');const plan=proposeOwnedVectorBulkModuleSynchronization(next,[{sourcePath,typescriptPath,[authority]:row.source}]);assert.ok(plan.nativeEdits.some(row=>row.path==='src/lib.rs'&&row.after.includes('2_u8')));assert.equal(plan.rustExecuted,false);});
test('only actual compiler vector binder spellings receive fresh portable parameter aliases',limits,()=>{const domain={kind:'primitive-vector',parameters:[{name:'u8'},{name:'bool'}]},params=nativeProjectionParameters({params:[{name:'__ro_vector_input_0'},{name:'native_input_0'}]},domain);assert.equal(params[0].name,'native_input_0_0');assert.equal(params[1].name,'native_input_0');assert.throws(()=>nativeProjectionParameters({params:[{name:'__ro_arbitrary'},{name:'flag'}]},domain));});
test('primitive source rules refuse mismatched elements nonfinite floats and overflow',limits,()=>{const base={name:'values',kind:'primitive-vector',returns:'vec:u8',element:{name:'u8',kind:'integer',bits:8,signed:false},parameters:[],tree:['vector',[['integer','256']]]};assert.throws(()=>projectNativePrimitiveVectorFunction(base));assert.throws(()=>projectNativePrimitiveVectorFunction({...base,tree:['vector',[['text','not an integer']]]}));assert.throws(()=>projectNativePrimitiveVectorFunction({...base,returns:'vec:f64',element:{name:'f64',kind:'float'},tree:['vector',[['float','Infinity']]]}));});
test('eight whole vector-family source equations keep exact inverse and two phases',limits,()=>{const plan=prepareNativeVectorFamiliesSources();assert.equal(plan.files.length,8);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});

test('prior receiving spellings preserve canonical vector argument names without issuing domains',limits,()=>{const own={params:[{name:'__ro_vector_input_0'},{name:'__ro_vector_input_1'}]},domain={kind:'primitive-vector',parameters:[{name:'bool'},{name:'u128'}]};assert.deepEqual(nativeProjectionParameters(own,domain,['flag','seed']),[{name:'flag',type:'bool'},{name:'seed',type:'u128'}]);assert.throws(()=>nativeProjectionParameters({params:[{name:'__ro_arbitrary'},{name:'__ro_vector_input_1'}]},domain,['flag','seed']));});

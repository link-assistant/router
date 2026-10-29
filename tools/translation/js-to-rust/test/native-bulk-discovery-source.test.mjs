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
import {projectNativeTreeModule} from '../owned-native-tree-source.mjs';
import {prepareNativeBulkDiscoverySources} from '../../prepare-native-bulk-discovery-sources.mjs';
const paths={javascriptPath:'app/src/translated/sample.mjs',typescriptPath:'typed/src/translated/sample.mts',runtimeRoot:'app/runtime'};
function observed(tree,{parameters=[],returns='bool',name='sample'}={}){return {name,parameters,returns,tree};}
test('finite native structural substitutions preserve scalar domains and qualified runtime imports',limits,()=>{
 const plan=projectNativeTreeModule([observed([[],['compare','lt','i64',['integer','i64','0'],['parameter',0]]],{parameters:[{name:'native_scalar_0',type:'i64'}]}),observed([[],['choose',['parameter',0],['parameter',1],['integer','u64','0']]],{name:'choose',returns:'u64',parameters:[{name:'flag',type:'bool'},{name:'amount',type:'u64'}]})],paths);
 assert.match(plan.typescript,/const native_scalar_0_[0-9]+: Parameters/);assert.match(plan.typescript,/json_macro_i64 as native_json_macro_i64/);assert.deepEqual(plan.trace.map(row=>row.phase),['language','repository']);assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
test('ordered owned producers inline once instead of inventing an extra variable copy',limits,()=>{
 const tree=[[['validate',[['parameter',0]]],['build-string',[['str','x']]],['copy',[['parameter',0]]],['build-array',[['vector',[['effect',1],['effect',2]]]]]],['effect',3]],plan=projectNativeTreeModule([observed(tree,{parameters:[{name:'value',type:'json-ref'}],returns:'json'})],paths);
 assert.match(plan.typescript,/return native_router_vector_json_build_array\(/);assert.equal((plan.typescript.match(/native_router_vector_json_copy\(value\)/gu)??[]).length,1);assert.equal(plan.runtimeParity,false);
});
test('dropped duplicated reordered and conditionally moved owned effects refuse',limits,()=>{
 const parameter={name:'value',type:'json-ref'},cases=[
  [[['validate',[['parameter',0]]],['copy',[['parameter',0]]]],['bool',true]],
  [[['validate',[['parameter',0]]],['copy',[['parameter',0]]]],['vector',[['effect',1],['effect',1]]]],
  [[['validate',[['parameter',0]]],['copy',[['parameter',0]]],['build-null',[]]],['vector',[['effect',2],['effect',1]]]],
  [[['validate',[['parameter',0]]],['copy',[['parameter',0]]]],['if',['bool',true],[[['validate',[['parameter',0]]],['copy',[['parameter',0]]]],['effect',1]],[[['validate',[['parameter',0]]],['copy',[['parameter',0]]]],['effect',1]]]],
 ];
 for(const tree of cases)assert.throws(()=>projectNativeTreeModule([observed(tree,{parameters:[parameter],returns:'json'})],paths));
});
test('model metadata proxies and accessors do not run during source proposal ingestion',limits,()=>{let touched=0;const unit=observed([[],['bool',true]]),accessor={};Object.defineProperty(accessor,'name',{enumerable:true,get(){touched++;throw Error('getter');}});assert.throws(()=>projectNativeTreeModule([accessor],paths));assert.throws(()=>projectNativeTreeModule([new Proxy(unit,{get(){touched++;throw Error('proxy');}})],paths));assert.equal(touched,0);});
test('bulk discovery derives original source bindings and both physical-language module proposals',limits,()=>{
 const rust='pub fn supported(flag:bool,left:u64,right:i64,key:&str)->bool { if flag { left == 1_u64 } else { right < 0_i64 } }\npub fn needs_more(value:u32)->u32 { value }',input=data(rust,'','');input.vectorBindings=[];
 const plan=proposeOwnedNativeBulkDiscovery(input),module=plan.modules.find(row=>row.bindings.some(binding=>binding.rustName==='supported'));assert.ok(module);assert.ok(module.outputs.some(row=>row.path.startsWith('app/src/translated/')&&row.path.endsWith('.mjs')));assert.ok(module.outputs.some(row=>row.path.startsWith('typed/src/translated/')&&row.path.endsWith('.mts')));assert.equal(module.originalOrderedBodiesReproduced,true);assert.ok(plan.refusals.some(row=>row.name==='needs_more'&&row.sourcePreserved));assert.equal(plan.productionSelected,false);assert.equal(plan.runtimeParity,false);assert.equal(plan.rustExecuted,false);
 for(const output of module.outputs){assert.equal(output.before,null);assert.equal(output.inverse,null);assert.ok(output.concreteSyntax);}
});
test('bulk discovery refuses existing target files and saved or injected authority',limits,()=>{
 const input=data('pub fn supported(flag:bool)->bool { flag }','','');input.vectorBindings=[];const first=proposeOwnedNativeBulkDiscovery(input),output=first.modules.flatMap(row=>row.outputs).find(row=>row.path.endsWith('.mjs'));assert.ok(output);const collision=structuredClone(input);collision.files.push({path:output.path,source:'export const previous = true;'});assert.throws(()=>proposeOwnedNativeBulkDiscovery(collision));assert.throws(()=>proposeOwnedNativeBulkDiscovery(input,{checkedProject:{}}));assert.throws(()=>proposeOwnedNativeBulkDiscovery(input,{javascriptRoot:'../escape'}));
 const changed=structuredClone(input);changed.files.find(row=>row.path==='src/translation_core/primitives.rs').source+='\n// current source changed';assert.throws(()=>proposeOwnedNativeBulkDiscovery(changed));
});
test('fresh bulk projections repeat their complete source proposals without saved checked results',limits,()=>{
 const input=data('pub fn supported(flag:bool,value:i64)->i64 { if flag { value } else { 0_i64 } }','','');input.vectorBindings=[];const first=proposeOwnedNativeBulkDiscovery(input),second=proposeOwnedNativeBulkDiscovery(input);assert.deepEqual(second,first);assert.equal(second.crossInvocationCache,false);assert.equal(second.nativeInstalled,false);
});
test('complete discovery source equations retain originals both phases and inverse source',limits,()=>{const plan=prepareNativeBulkDiscoverySources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});

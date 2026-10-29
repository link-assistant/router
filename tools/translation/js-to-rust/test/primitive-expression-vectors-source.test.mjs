// Primitive vector expression family, independent source cases. ALL UNRUN.
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



async function insertionTargets(t,row){
 const folder=mkdtempSync(join(tmpdir(),'owned-vector-candidate-'));t.after(()=>rmSync(folder,{recursive:true,force:true}));
 for(const file of row.input.files.filter(file=>/\.(?:mjs|mts|ts)$/u.test(file.path)))write(folder,file.path,file.source);
 for(const file of row.input.files.filter(file=>file.path.startsWith('typed/runtime/')&&file.path.endsWith('.mts')))write(folder,'app/runtime/'+file.path.slice('typed/runtime/'.length),file.source);
 write(folder,'typed/src/reverse.mts',row.result.typescript);
 execFileSync(process.execPath,[join(ROOT,'js/node_modules/typescript/bin/tsc'),'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--rootDir',folder,'--outDir',join(folder,'out'),join(folder,TS),join(folder,'typed/src/reverse.mts')],{cwd:ROOT,encoding:'utf8',stdio:'pipe',timeout:20000});
 for(const file of row.input.files.filter(file=>file.path.startsWith('app/runtime/'))){write(folder,'out/'+file.path,file.source);write(folder,'out/typed/runtime/'+file.path.slice('app/runtime/'.length),file.source);}
 const javascript=await import(pathToFileURL(join(folder,JS)).href),typed=await import(pathToFileURL(join(folder,'out/typed/src/list.mjs')).href),reverse=await import(pathToFileURL(join(folder,'out/typed/src/reverse.mjs')).href),runtime=await prepareOwnedVectorCandidateRuntime(row.result.program);
 return [(name,...args)=>javascript[name](...args),(name,...args)=>typed[name](...args),(name,...args)=>reverse[name](...args),(name,...args)=>evaluateOwnedVectorCandidate(row.result.program,name,args,runtime)];
}

import {PRIMITIVE_BITWISE_TYPES} from '../../primitive-bitwise-types.mjs';
import {proposeOwnedVectorBulkModuleSynchronization} from '../owned-vector-bulk-module-synchronization.mjs';
import {proposeOwnedNativeBulkDiscovery} from '../owned-native-bulk-discovery.mjs';
import {preparePrimitiveExpressionVectorSources} from '../../prepare-primitive-expression-vector-sources.mjs';
import {checkedPrimitiveExpressionVectorTail} from '../owned-primitive-expression-vectors.mjs';
const operatorImport='import {integerArithmetic as math} from "../runtime/primitive-operator-runtime.mjs";\n';
function fixture(domain,{guarded=false,aliases=false,unused=false,opposite=false}={}){
 const math=(operation,left='left',right='right')=>'math('+left+','+right+','+domain.bits+','+domain.signed+',"'+operation+'")',add=math('add'),mul=math('mul');
 const items=(opposite?[mul,add]:[add,mul]).join(','),elements=guarded?'[flag?'+add+':left,right]':'['+items+']',nativeElements=guarded?'[if flag {left+right}else{left},right]':opposite?'[left*right,left+right]':'[left+right,left*right]';
 const body=(unused?'const discarded=['+mul+'];':'')+(aliases?'const first='+elements+';const next=first;return next;':'return '+elements+';'),rust='pub fn values(left:'+domain.name+',right:'+domain.name+',flag:bool)->Vec<'+domain.name+'>{'+(unused?'let discarded=crate::translation_core::vec![left*right];':'')+(aliases?'let first=crate::translation_core::vec!'+nativeElements+';let next=first;next':'crate::translation_core::vec!'+nativeElements)+'}';
 return translate(rust,operatorImport+'export function values(left,right,flag){'+body+'}','import type {'+domain.alias+'} from "../runtime/primitive-operator-runtime.mjs";\n'+operatorImport+'export function values(left:'+domain.alias+',right:'+domain.alias+',flag:boolean):readonly '+domain.alias+'[]{'+body+'}');
}
for(const domain of PRIMITIVE_BITWISE_TYPES)test('actual Vec<'+domain.name+'> elements reuse checked arithmetic with both source directions',limits,async t=>{
 const row=fixture(domain),plan=proposeOwnedVectorNativeSynchronization(row.input,{sourcePath:JS,typescriptPath:TS,typescript:row.result.typescript});assert.equal(plan.selectedFunctions.length,1);assert.equal(row.result.program[0].vectorOrigin.kind,'primitive-expression-vector');assert.equal(plan.rustExecuted,false);
 for(const get of await insertionTargets(t,row)){assert.deepEqual(get('values',3n,2n,true),[5n,6n]);assert.throws(()=>get('values',BigInt(domain.maximum),2n,false),/attempt to add with overflow/u);}
 const project=forward(row,plan);await verifyTypedTargets(project,({typescript,javascript})=>{for(const target of [typescript,javascript])assert.deepEqual(target.values(3n,2n,true),[5n,6n]);});
});
test('every vector item retains evaluation and first-panic order',limits,async t=>{
 const domain=PRIMITIVE_BITWISE_TYPES.find(row=>row.name==='u8');
 for(const opposite of [false,true]){const row=fixture(domain,{opposite});proposeOwnedVectorNativeSynchronization(row.input,{sourcePath:JS,typescriptPath:TS,typescript:row.result.typescript});for(const get of await insertionTargets(t,row))assert.throws(()=>get('values',255n,2n,false),opposite?/attempt to multiply with overflow/u:/attempt to add with overflow/u);}
});
test('guarded vector items continue through later items without evaluating the unselected arm',limits,async t=>{
 const row=fixture(PRIMITIVE_BITWISE_TYPES.find(row=>row.name==='u8'),{guarded:true});proposeOwnedVectorNativeSynchronization(row.input,{sourcePath:JS,typescriptPath:TS,typescript:row.result.typescript});for(const get of await insertionTargets(t,row)){assert.deepEqual(get('values',255n,1n,false),[255n,1n]);assert.throws(()=>get('values',255n,1n,true),/attempt to add with overflow/u);}
});
test('linear owned vector aliases move once and dropped containers preserve element failures',limits,async t=>{
 for(const options of [{aliases:true},{unused:true}]){const row=fixture(PRIMITIVE_BITWISE_TYPES.find(row=>row.name==='u8'),options);proposeOwnedVectorNativeSynchronization(row.input,{sourcePath:JS,typescriptPath:TS,typescript:row.result.typescript});for(const get of await insertionTargets(t,row)){assert.deepEqual(get('values',3n,2n,false),[5n,6n]);if(options.unused)assert.throws(()=>get('values',255n,2n,false),/attempt to multiply with overflow/u);}}
});
test('Boolean vector expressions and pure conditional containers join actual native branches',limits,async t=>{
 const rust='pub fn values(left:bool,right:bool,flag:bool)->Vec<bool>{if flag {crate::translation_core::vec![left&&!right,left==right]}else{crate::translation_core::vec![right]}}',body='return flag?[left&&!right,left===right]:[right];',row=translate(rust,'export function values(left,right,flag){'+body+'}','export function values(left:boolean,right:boolean,flag:boolean):readonly boolean[]{'+body+'}');const plan=proposeOwnedVectorNativeSynchronization(row.input,{sourcePath:JS,typescriptPath:TS,typescript:row.result.typescript});assert.equal(plan.selectedFunctions.length,1);for(const get of await insertionTargets(t,row)){assert.deepEqual(get('values',true,false,true),[true,false]);assert.deepEqual(get('values',true,false,false),[false]);}
});
test('actual source helpers feed vector items and stay in the complete module closure',limits,async t=>{
 const domain=PRIMITIVE_BITWISE_TYPES.find(row=>row.name==='u8'),row=fixture(domain),native=row.input.files.find(row=>row.path==='src/lib.rs');native.source='pub mod translation_core;\npub fn helper(left:u8,right:u8)->u8{left+right}\npub fn values(left:u8,right:u8,flag:bool)->Vec<u8>{crate::translation_core::vec![helper(left,right),left*right]}';
 row.input.vectorBindings.push({javascriptPath:JS,javascriptName:'helper',rustPath:'src/lib.rs',rustName:'helper'});
 const source=operatorImport+'export function helper(left,right){return math(left,right,8,false,"add");}export function values(left,right,flag){return [helper(left,right),math(left,right,8,false,"mul")];}',typed='import type {RustU8} from "../runtime/primitive-operator-runtime.mjs";\n'+operatorImport+'export function helper(left:RustU8,right:RustU8):RustU8{return math(left,right,8,false,"add");}export function values(left:RustU8,right:RustU8,flag:boolean):readonly RustU8[]{return [helper(left,right),math(left,right,8,false,"mul")];}';
 row.input.files.find(file=>file.path===JS).source=source;row.input.files.find(file=>file.path===TS).source=typed;row.context=createOwnedVectorCandidateContext(row.input);row.result=translateOwnedVectorCandidate(source,{context:row.context,sourcePath:JS,typescriptOutputPath:'typed/src/reverse.mts'});const plan=proposeOwnedVectorBulkModuleSynchronization(row.input,[{sourcePath:JS,typescriptPath:TS,typescript:row.result.typescript}]);assert.equal(plan.modules[0].bindings.length,2);for(const get of await insertionTargets(t,row))assert.deepEqual(get('values',3n,2n,false),[5n,6n]);
});
test('discovery uses the whole actual expression family with production flags remaining false',limits,()=>{
 const row=fixture(PRIMITIVE_BITWISE_TYPES.find(row=>row.name==='u8')),plan=proposeOwnedNativeBulkDiscovery(row.input);assert.ok(plan.modules.some(module=>module.bindings.some(binding=>binding.rustName==='values')));assert.equal(plan.productionSelected,false);assert.equal(plan.nativeFreshnessQualified,false);assert.equal(plan.runtimeParity,false);
});
test('mixed widths spread holes borrowed vectors and reused moved containers are refused',limits,()=>{
 const domain=PRIMITIVE_BITWISE_TYPES.find(row=>row.name==='u8');
 for(const change of [body=>body.replace('return [','return [...'),body=>body.replace('return [','return [,'),body=>body.replace('return [','return [true,')]){
  const row=fixture(domain),source=change(row.input.files.find(file=>file.path===JS).source);assert.throws(()=>translateOwnedVectorCandidate(source,{context:row.context,sourcePath:JS,typescriptOutputPath:'typed/src/reverse.mts'}));
 }
 const row=fixture(domain,{aliases:true});for(const file of row.input.files)if([JS,TS].includes(file.path))file.source=file.source.replace('return next;','const reused=first;return next;');assert.throws(()=>{const context=createOwnedVectorCandidateContext(row.input);translateOwnedVectorCandidate(row.input.files.find(file=>file.path===JS).source,{context,sourcePath:JS,typescriptOutputPath:'typed/src/reverse.mts'});});
});
test('current runtime bytes and actual source bindings cannot be replaced by public profile data',limits,()=>{
 const row=fixture(PRIMITIVE_BITWISE_TYPES.find(row=>row.name==='u8'));row.input.files.find(file=>file.path==='app/runtime/primitive-operator-runtime.mjs').source+='\n// changed actual runtime';assert.throws(()=>createOwnedVectorCandidateContext(row.input));
 const ret={kind:'array',element:{kind:'bool'},rustOwnership:{kind:'owned',source:'Vec'}},array={k:'array',type:ret,items:[],compatibilityCore:{id:'router-core-vector-list-v1'}},used={k:'var',name:'first',type:ret},body={k:'let',name:'first',value:array,type:ret,body:{k:'let',name:'next',value:used,type:ret,body:used}};assert.throws(()=>checkedPrimitiveExpressionVectorTail({k:'fn',params:[],ret,body}));
});
test('fifteen complete source equations retain CST inverses and exactly two substitution phases',limits,()=>{
 const plan=preparePrimitiveExpressionVectorSources();assert.equal(plan.files.length,15);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});

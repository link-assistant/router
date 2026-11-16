// Bounded actual-value Vec inference source cases. ALL UNRUN.
// Receiving-first primitive Vec definition bootstrap source cases. UNRUN.
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
import {proposeOwnedPrimitiveFunctionInsertion} from '../owned-primitive-function-insertion.mjs';
import {proposeOwnedPrimitiveVectorFunctionInsertion} from '../owned-primitive-vector-function-insertion.mjs';
import {proposeOwnedPrimitiveVectorFunctionInsertion as publicVectorInsertion} from '../../source-synchronization.mjs';
import {preparePrimitiveVectorDefinitionSources} from '../../prepare-primitive-vector-definition-sources.mjs';
const route={rustPath:'src/lib.rs',module:['target']},operationImport='import {integerArithmetic as math} from "../runtime/primitive-operator-runtime.mjs";\n';
function emptyFixture(){const input=data('pub fn untouched()->bool{false}\npub mod target { /* original empty module */ }','','');input.vectorBindings=[];return input;}
function installed(input,plan){const files=new Map(input.files.map(row=>[row.path,row.source]));for(const row of plan.outputs)files.set(row.path,row.after);return {...input,vectorBindings:[...input.vectorBindings,...plan.bindings],files:[...files].map(([path,source])=>({path,source}))};}
function receiving(input){const context=createOwnedVectorCandidateContext(input),source=input.files.find(row=>row.path===JS).source,result=translateOwnedVectorCandidate(source,{context,sourcePath:JS,typescriptOutputPath:'typed/src/reverse.mts'});return {input,context,result};}
function insert(input,source,javascript=false){return proposeOwnedPrimitiveVectorFunctionInsertion(input,{sourcePath:JS,typescriptPath:TS,nativeRoute:route,...(javascript?{javascript:source}:{typescript:source})});}

import {prepareVectorReturnInferenceSources} from '../../prepare-vector-return-inference-sources.mjs';
import {proposeOwnedVectorBulkModuleSynchronization} from '../owned-vector-bulk-module-synchronization.mjs';
import {receivingPrimitiveVectorDefinitionsRequested} from '../owned-vector-definition-routing.mjs';
for(const domain of PRIMITIVE_BITWISE_TYPES)test('infer '+domain.name+' Vec from actual values and all empty-branch orders',limits,async t=>{
 const imports='import type {'+domain.alias+'} from "../runtime/primitive-operator-runtime.mjs";\n',parameter='value:'+domain.alias+',flag:boolean',source=imports+[
 'export function values('+parameter+'){return [value,0n,'+domain.maximum+'n];}',
 'export function empty_first('+parameter+'){return flag?[]:[value];}',
 'export function empty_last('+parameter+'){return flag?[value]:[];}',
 'export function guarded('+parameter+'){if(flag){return [];}else{return [value];}}',
 'export function aliased('+parameter+'){const first=[];const second=[value];const result=flag?first:second;return result;}',
 'export function helper(value:'+domain.alias+'){return [value];}',
 'export function via_helper('+parameter+'){const owned=helper(value);return flag?[]:owned;}',
 'export function literal_first('+parameter+'){return [0n,value];}'
 ].join('\n'),plan=insert(emptyFixture(),source),row=receiving(installed(emptyFixture(),plan));
 assert.equal(plan.bindings.length,8);assert.doesNotMatch(JSON.stringify(row.result.program),/@router-private/u);
 for(const get of await insertionTargets(t,row)){
  assert.deepEqual(get('values',3n,false),[3n,0n,BigInt(domain.maximum)]);
  assert.deepEqual(get('empty_first',3n,true),[]);assert.deepEqual(get('empty_first',3n,false),[3n]);
  assert.deepEqual(get('empty_last',3n,true),[3n]);assert.deepEqual(get('empty_last',3n,false),[]);
  assert.deepEqual(get('guarded',3n,true),[]);assert.deepEqual(get('guarded',3n,false),[3n]);
  assert.deepEqual(get('aliased',3n,true),[]);assert.deepEqual(get('aliased',3n,false),[3n]);
  assert.deepEqual(get('via_helper',3n,true),[]);assert.deepEqual(get('via_helper',3n,false),[3n]);
  assert.deepEqual(get('literal_first',3n,false),[0n,3n]);
 }
});
test('precise written result constrains an earlier empty local and preserves distinct ownership',limits,async t=>{
 const source='export function values():readonly boolean[]{const first=[];const moved=first;return moved;}',plan=insert(emptyFixture(),source),row=receiving(installed(emptyFixture(),plan));for(const get of await insertionTargets(t,row)){assert.deepEqual(get('values'),[]);assert.notStrictEqual(get('values'),get('values'));}
});
test('Boolean literals and checked operator results independently anchor new vector domains',limits,async t=>{
 const source=operationImport+'export function values(){return [true,false];}export function checked(){return [math(3n,2n,8,false,"add")];}',plan=insert(emptyFixture(),source),row=receiving(installed(emptyFixture(),plan));for(const get of await insertionTargets(t,row)){assert.deepEqual(get('values'),[true,false]);assert.deepEqual(get('checked'),[5n]);}
});
test('JS-first JSDoc parameters infer precise vector results without a written return',limits,async t=>{
 const source='/** @param {import("../runtime/primitive-operator-runtime.mjs").RustI128} value @param {boolean} flag */\nexport function values(value,flag){const empty=[];return flag?empty:[-170141183460469231731687303715884105728n,value];}',plan=insert(emptyFixture(),source,true),row=receiving(installed(emptyFixture(),plan));for(const get of await insertionTargets(t,row)){assert.deepEqual(get('values',-3n,true),[]);assert.deepEqual(get('values',-3n,false),[-170141183460469231731687303715884105728n,-3n]);}
});
test('source eligibility routes inferred arrays but excludes arrays inside unrelated nested functions',limits,()=>{
 const base={sourcePath:JS,typescriptPath:TS,nativeRoute:route};assert.equal(receivingPrimitiveVectorDefinitionsRequested({...base,typescript:'export function values(value:boolean){return [value];}'}),true);
 assert.equal(receivingPrimitiveVectorDefinitionsRequested({...base,typescript:'export function values(value:boolean):boolean{function unused(){return [];}return value;}'}),false);
 const input=emptyFixture(),plan=proposeOwnedVectorBulkModuleSynchronization(input,[{...base,typescript:'export function values(value:boolean,flag:boolean){return flag?[]:[value];}'}]);assert.equal(plan.modules[0].bindings[0].rustName,'target.values');assert.equal(plan.runtimeParity,false);
});
test('ambiguous domains conflicts unsupported values and actual moves remain refusals',limits,()=>{
 const aliases='import type {RustU8,RustU16} from "../runtime/primitive-operator-runtime.mjs";\n';for(const source of [
 'export function values(){return [];}',
 'export function values(){return [0n];}',
 'export function values(){return [340282366920938463463374607431768211455n];}',
 'export function values(value:bigint){return [value];}',
 'export function values(value:string){return [value];}',
 aliases+'export function values(left:RustU8,right:RustU16,flag:boolean){return flag?[left]:[right];}',
 aliases+'export function values(value:RustU8){return [-1n,value];}',
 aliases+'export function values(value:RustU8){return [256n,value];}',
 aliases+'export function values(value:RustU8){return [value,true];}',
 'export function values(flag:boolean){const first=[];const moved=first;return flag?first:[true];}',
 'export function values(flag:boolean){return flag?[]:false;}',
 'export function values(flag:boolean){const unused=[];return [flag];}'
 ]){const input=emptyFixture(),before=JSON.stringify(input);assert.throws(()=>insert(input,source));assert.equal(JSON.stringify(input),before);}
});
test('all ten inferred domains insert together without guessing widths from integer constants',limits,()=>{
 const source='import type {'+PRIMITIVE_BITWISE_TYPES.map(row=>row.alias).join(',')+'} from "../runtime/primitive-operator-runtime.mjs";\n'+PRIMITIVE_BITWISE_TYPES.map(row=>'export function inferred_'+row.name+'(value:'+row.alias+',flag:boolean){const empty=[];return flag?empty:[0n,value];}').join('\n'),plan=insert(emptyFixture(),source);assert.equal(plan.bindings.length,10);assert.equal(plan.rustExecuted,false);
});
test('four complete inference source equations retain exact inverse and fixed substitution phases',limits,()=>{
 const plan=prepareVectorReturnInferenceSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});

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
function typed(domain,{helpers=false,guarded=false}={}){
 const math='math(left,right,'+domain.bits+','+domain.signed+',"add")',imports='import type {'+domain.alias+'} from "../runtime/primitive-operator-runtime.mjs";\n'+operationImport;
 if(helpers)return imports+'export function scalar(left:'+domain.alias+',right:'+domain.alias+'):'+domain.alias+'{return '+math+';}export function helper(left:'+domain.alias+',right:'+domain.alias+'):readonly '+domain.alias+'[]{return [scalar(left,right),right];}export function values(left:'+domain.alias+',right:'+domain.alias+'):readonly '+domain.alias+'[]{const first=helper(left,right);const moved=first;return moved;}';
 return imports+'export function values(left:'+domain.alias+',right:'+domain.alias+','+'flag:boolean'+'):readonly '+domain.alias+'[]{return '+(guarded?'flag?['+math+',right]:[left]':'['+math+',right]')+';}';
}
for(const domain of PRIMITIVE_BITWISE_TYPES)test('new '+domain.name+' Vec definitions insert from actual typed source without native placeholders',limits,async t=>{
 const input=emptyFixture(),plan=insert(input,typed(domain));assert.equal(plan.schema,'router-owned-primitive-vector-function-insertion-v1');assert.equal(plan.bindings.length,1);assert.equal(plan.bindings[0].rustName,'target.values');assert.equal(plan.nativeInsertion.expected,'');assert.equal(plan.nativeInstalled,false);assert.equal(plan.rustExecuted,false);const next=installed(input,plan),row=receiving(next);
 for(const get of await insertionTargets(t,row)){assert.deepEqual(get('values',3n,2n,false),[5n,2n]);assert.throws(()=>get('values',BigInt(domain.maximum),1n,false),/attempt to add with overflow/u);}
 const repeated=proposeOwnedVectorNativeSynchronization(next,{sourcePath:JS,typescriptPath:TS,javascript:next.files.find(file=>file.path===JS).source});assert.deepEqual(repeated.rustEdits,[]);
});
test('JS-first actual JSDoc vector results bootstrap the missing strict companion',limits,async t=>{
 const input=emptyFixture(),source=operationImport+'/** @param {import("../runtime/primitive-operator-runtime.mjs").RustU8} left @param {import("../runtime/primitive-operator-runtime.mjs").RustU8} right @returns {readonly import("../runtime/primitive-operator-runtime.mjs").RustU8[]} */\nexport function values(left,right){return [math(left,right,8,false,"add"),right];}',plan=insert(input,source,true),row=receiving(installed(input,plan));assert.equal(plan.requestedSource.language,'JavaScript');assert.equal(plan.bindings.length,1);for(const get of await insertionTargets(t,row))assert.deepEqual(get('values',3n,2n),[5n,2n]);
});
test('Boolean and empty vector definitions retain exact result domains and distinct allocations',limits,async t=>{
 const input=emptyFixture(),source='export function empty():readonly boolean[]{return [];}export function values(left:boolean,right:boolean):readonly boolean[]{return [left&&!right,left===right];}',plan=insert(input,source),row=receiving(installed(input,plan));assert.equal(plan.bindings.length,2);for(const get of await insertionTargets(t,row)){assert.deepEqual(get('empty'),[]);assert.deepEqual(get('values',true,false),[true,false]);const first=get('values',true,false),second=get('values',true,false);first[0]=false;assert.deepEqual(second,[true,false]);}
});
test('mixed new scalar and Vec helpers are reissued as one full acyclic native module',limits,async t=>{
 const input=emptyFixture(),plan=insert(input,typed(PRIMITIVE_BITWISE_TYPES.find(row=>row.name==='u8'),{helpers:true})),row=receiving(installed(input,plan));assert.equal(plan.bindings.length,3);for(const get of await insertionTargets(t,row)){assert.equal(get('scalar',3n,2n),5n);assert.deepEqual(get('helper',3n,2n),[5n,2n]);assert.deepEqual(get('values',3n,2n),[5n,2n]);}
});
test('guarded new vector definitions preserve unselected failures',limits,async t=>{
 const input=emptyFixture(),plan=insert(input,typed(PRIMITIVE_BITWISE_TYPES.find(row=>row.name==='u8'),{guarded:true})),row=receiving(installed(input,plan));for(const get of await insertionTargets(t,row)){assert.deepEqual(get('values',255n,1n,false),[255n]);assert.throws(()=>get('values',255n,1n,true),/attempt to add with overflow/u);}
});
test('bulk drafting all ten typed vector identities does not require hand-authored native functions',limits,async t=>{
 const input=emptyFixture(),source='import type {'+PRIMITIVE_BITWISE_TYPES.map(row=>row.alias).join(',')+'} from "../runtime/primitive-operator-runtime.mjs";\n'+PRIMITIVE_BITWISE_TYPES.map(row=>'export function values_'+row.name+'(value:'+row.alias+'):readonly '+row.alias+'[]{return [value];}').join('\n'),plan=insert(input,source),row=receiving(installed(input,plan)),targets=await insertionTargets(t,row);assert.equal(plan.bindings.length,10);for(const type of PRIMITIVE_BITWISE_TYPES)for(const value of [type.signed?-BigInt(type.minimumAbs):0n,0n,BigInt(type.maximum)])for(const get of targets)assert.deepEqual(get('values_'+type.name,value),[value]);
});
test('the original scalar insertion API remains scalar-only and the primary export exposes the separate vector API',limits,()=>{
 assert.strictEqual(publicVectorInsertion,proposeOwnedPrimitiveVectorFunctionInsertion);assert.throws(()=>proposeOwnedPrimitiveFunctionInsertion(emptyFixture(),{sourcePath:JS,typescriptPath:TS,nativeRoute:route,typescript:'export function values(value:boolean):readonly boolean[]{return [value];}'}));assert.throws(()=>insert(emptyFixture(),'export function values(value:boolean):boolean{return value;}'));
});
test('ambiguous nested borrowed mutable reused moved and recursive vector definitions are refused',limits,()=>{
 const alias='import type {RustU8,RustU16} from "../runtime/primitive-operator-runtime.mjs";\n';
 for(const source of [
 'export function values(value:bigint):readonly bigint[]{return [value];}',
 'export function values(value:readonly boolean[]):readonly boolean[]{return value;}',
 'export function values(value:boolean):readonly (readonly boolean[])[]{return [[value]];}',
 'export function values(value:boolean):readonly boolean[]{let result=[value];result=[];return result;}',
 'export function helper(value:boolean):readonly boolean[]{return [value];}export function values(value:boolean):readonly boolean[]{const first=helper(value);const moved=first;const repeated=first;return moved;}',
 'export function helper(value:boolean):readonly boolean[]{return values(value);}export function values(value:boolean):readonly boolean[]{return helper(value);}',
 alias+'export function values(value:RustU16):readonly RustU8[]{return [value];}',
 'export function values():readonly boolean[]{return [true,,false];}',
 'export function values(value:boolean):readonly boolean[]{return unknown(value);}'
 ])assert.throws(()=>insert(emptyFixture(),source));
});
test('explicit vector profile flags require the complete primitive source profile and actual aliases',limits,()=>{
 const input=emptyFixture();for(const flags of [{primitiveVectorDefinitions:true},{primitiveVectorDefinitions:true,primitiveDefinitions:true},{primitiveVectorDefinitions:false,primitiveOperators:true,primitiveDefinitions:true}])assert.throws(()=>createOwnedVectorCandidateContext({...input,...flags}));
 const source=typed(PRIMITIVE_BITWISE_TYPES.find(row=>row.name==='u8'));const changed=emptyFixture();changed.files.find(file=>file.path==='typed/runtime/primitive-operator-runtime.d.mts').source+='\n// changed actual declaration';assert.throws(()=>insert(changed,source));
});
test('new vector insertion cannot replace a populated native target or use unchecked option fields',limits,()=>{
 const source='export function values(value:boolean):readonly boolean[]{return [value];}',input=emptyFixture();input.files.find(file=>file.path==='src/lib.rs').source='pub mod translation_core;pub mod target{pub fn kept()->bool{true}}';assert.throws(()=>insert(input,source));assert.throws(()=>proposeOwnedPrimitiveVectorFunctionInsertion(emptyFixture(),{sourcePath:JS,typescriptPath:TS,nativeRoute:route,typescript:source,unchecked:true}));
});
test('six complete Vec definition equations retain exact source inverses and declared phases',limits,()=>{
 const plan=preparePrimitiveVectorDefinitionSources();assert.equal(plan.files.length,6);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});

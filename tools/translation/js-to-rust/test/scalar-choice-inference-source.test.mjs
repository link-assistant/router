// Monomorphic scalar choice local and return source cases. ALL UNRUN.
// Actual scalar-return Vec local receiving/native wiring. ALL UNRUN.
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


import {prepareScalarChoiceInferenceSources} from '../../prepare-scalar-choice-inference-sources.mjs';
import {createPrimitiveConstantInference as oldInference} from '../owned-primitive-constant-inference.mjs';
import {createPrimitiveScalarInference as currentInference} from '../owned-primitive-scalar-inference.mjs';
import {ownershipCompiler} from '../vendor/module-syntax.mjs';
import {canonicalRequestedNativeJsonVectorTree} from '../owned-vector-native-json-control.mjs';
const types='import type {RustU8,RustU128,RustI128} from "../runtime/primitive-operator-runtime.mjs";\n',maximum='340282366920938463463374607431768211455',minimum='-170141183460469231731687303715884105728';
function inserted(source,javascript=false){const input=emptyFixture(),plan=insert(input,source,javascript);return {...receiving(installed(input,plan)),plan};}
for(const [alias,bound]of [['RustU128',maximum],['RustI128',minimum]])test('a deferred '+alias+' choice local and immutable alias retain one exact type',limits,async t=>{
 const requested=types+'export function values(value:'+alias+',flag:boolean):readonly '+alias+'[]{const selected=flag?'+bound+'n:0n;const copied=selected;return [copied,selected,value];}',row=inserted(requested),number=BigInt(bound);
 for(const get of await insertionTargets(t,row))for(const flag of [false,true])assert.deepEqual(get('values',3n,flag),[flag?number:0n,flag?number:0n,3n]);assert.equal(sync(row).selectedFunctions.length,1);assert.ok(row.result.typescript.includes('const selected: Rust'));
});
test('a real typed helper argument anchors a deferred scalar choice local',limits,async t=>{
 const requested=types+'export function identity(value:RustU128):RustU128{return value;}export function values(value:RustU128,flag:boolean):readonly RustU128[]{const selected=flag?'+maximum+'n:0n;const passed=identity(selected);return [passed,selected,value];}',row=inserted(requested);
 for(const get of await insertionTargets(t,row))for(const flag of [false,true])assert.deepEqual(get('values',3n,flag),[flag?BigInt(maximum):0n,flag?BigInt(maximum):0n,3n]);assert.equal(sync(row).selectedFunctions.length,2);
});
test('unannotated scalar returns join wide literals and small literals only with a real typed return',limits,async t=>{
 const requested=types+'export function scalar(value:RustU128,first:boolean,second:boolean){if(first){return '+maximum+'n;}else{if(second){return 0n;}else{return value;}}}export function values(value:RustU128):readonly RustU128[]{return [scalar(value,true,false),value];}',row=inserted(requested);
 for(const get of await insertionTargets(t,row)){assert.equal(get('scalar',3n,true,false),BigInt(maximum));assert.equal(get('scalar',3n,false,true),0n);assert.equal(get('scalar',3n,false,false),3n);assert.deepEqual(get('values',3n),[BigInt(maximum),3n]);}assert.equal(row.result.program.find(item=>item.javascript==='scalar').returns,'u128');assert.equal(sync(row).selectedFunctions.length,2);
});
test('a condition helper remains one ordered event before a reused choice local',limits,async t=>{
 const requested=types+operationImport+'export function gate(value:RustU8):boolean{const checked=math(value,1n,8,false,"add");return value===0n;}export function values(value:RustU128,input:RustU8):readonly RustU128[]{const selected=gate(input)?'+maximum+'n:0n;return [selected,selected,value];}',row=inserted(requested),item=row.result.program.find(value=>value.javascript==='values');
 assert.equal(item.sourceCalls.filter(call=>call.javascript==='gate').length,1);const tree=canonicalRequestedNativeJsonVectorTree(item);assert.equal(tree[0].filter(event=>event[0].startsWith('source-call:')).length,1);
 for(const get of await insertionTargets(t,row)){assert.deepEqual(get('values',3n,0n),[BigInt(maximum),BigInt(maximum),3n]);assert.deepEqual(get('values',3n,1n),[0n,0n,3n]);assert.throws(()=>get('values',3n,255n),/attempt to add with overflow/u);}assert.equal(sync(row).selectedFunctions.length,2);
});
test('JavaScript/JSDoc retains deferred scalar locals until precise vector uses',limits,async t=>{
 const requested='/** @param {import("../runtime/primitive-operator-runtime.mjs").RustU128} value @param {boolean} flag */\nexport function values(value,flag){const selected=flag?'+maximum+'n:0n;const copied=selected;return [copied,value];}',row=inserted(requested,true);for(const get of await insertionTargets(t,row))for(const flag of [false,true])assert.deepEqual(get('values',3n,flag),[flag?BigInt(maximum):0n,3n]);
});
test('deferred locals refuse absent anchors, incompatible widths and out-of-range choices',limits,()=>{
 for(const requested of [types+'export function values(flag:boolean){const selected=flag?'+maximum+'n:0n;return [selected];}',types+'export function values(value:RustI128,flag:boolean){const selected=flag?'+maximum+'n:0n;return [selected,value];}',types+'export function identity(value:RustI128):RustI128{return value;}export function values(value:RustU128,flag:boolean):readonly RustU128[]{const selected=flag?18446744073709551616n:0n;const signed=identity(selected);return [selected,value];}',types+'export function scalar(flag:boolean){if(flag){return '+maximum+'n;}else{return 0n;}}export function values(value:RustU128){return [value];}']){const input=emptyFixture(),before=JSON.stringify(input);assert.throws(()=>insert(input,requested));assert.equal(JSON.stringify(input),before);}
});
test('the old constant inference API remains separate and unresolved scalar variables do not escape',limits,()=>{
 const ts=ownershipCompiler(),file=ts.createSourceFile('literal.mts','const wide='+maximum+'n;',ts.ScriptTarget.Latest,true,ts.ScriptKind.TS),node=file.statements[0].declarationList.declarations[0].initializer,first=currentInference(),other=currentInference(),value=first.scalar(first.wideLiteral(ts,node));assert.equal(first.scalarPending(value.type),true);assert.equal(other.scalarPending(value.type),false);assert.throws(()=>other.scalarReference(value.type,{kind:'variable',name:'foreign',type:value.type,root:null}));assert.throws(()=>first.finish([{kind:'return',value}],value.type));assert.equal(typeof oldInference().scalar,'undefined');
});
test('three complete source equations retain originals, full inverses and the two declared sequences',limits,()=>{
 const plan=prepareScalarChoiceInferenceSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});

// Complete unit helper source/receiving/native cases. ALL UNRUN.
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


import {prepareUnitHelperCallsSources} from '../../prepare-unit-helper-calls-sources.mjs';
import {proposeOwnedNativeBulkDiscovery} from '../owned-native-bulk-discovery.mjs';
import {proposeOwnedNativeBulkModuleRefresh} from '../owned-native-bulk-module-refresh.mjs';
import {observeNativeFunctionControl} from '../owned-native-function-control.mjs';
import {observeNativeSourceCallControl} from '../owned-native-source-call-control.mjs';
import {scalarSourceCallSummary as oldSummary,nativeSourceValueResultDomain as oldDomain} from '../owned-source-value-calls.mjs';
import {scalarSourceCallSummary as currentSummary,nativeSourceValueResultDomain as currentDomain} from '../owned-source-effect-calls.mjs';
import {canonicalRequestedNativeJsonVectorTree} from '../owned-vector-native-json-control.mjs';
const types='import type {RustU8} from "../runtime/primitive-operator-runtime.mjs";\n';
function inserted(source,javascript=false){const input=emptyFixture(),plan=insert(input,source,javascript);return {...receiving(installed(input,plan)),plan};}
function replaceBindings(input,names){input.vectorBindings=names.map(name=>({javascriptPath:JS,javascriptName:name,rustPath:'src/lib.rs',rustName:name}));return input;}
for(const javascript of [false,true])test('unit helper calls preserve direct discard, local value and tail-call order in '+(javascript?'JavaScript':'TypeScript'),limits,async t=>{
 const source=javascript?operationImport+'/** @param {import("../runtime/primitive-operator-runtime.mjs").RustU8} value @returns {void} */\nexport function check(value){const checked=math(value,1n,8,false,"add");return;}\n/** @param {import("../runtime/primitive-operator-runtime.mjs").RustU8} value @returns {void} */\nexport function relay(value){return check(value);}\n/** @param {import("../runtime/primitive-operator-runtime.mjs").RustU8} value */\nexport function values(value){check(value);const ignored=relay(value);return [value];}':types+operationImport+'export function check(value:RustU8):void{const checked=math(value,1n,8,false,"add");return;}export function relay(value:RustU8):void{return check(value);}export function values(value:RustU8):readonly RustU8[]{check(value);const ignored=relay(value);return [value];}';
 const row=inserted(source,javascript);assert.equal(row.plan.bindings.length,3);assert.equal(row.result.program.find(item=>item.javascript==='relay').returns,'unit');
 for(const get of await insertionTargets(t,row)){assert.equal(get('check',3n),undefined);assert.equal(get('relay',3n),undefined);assert.deepEqual(get('values',3n),[3n]);assert.throws(()=>get('values',255n),/attempt to add with overflow/u);}
 assert.equal(sync(row).selectedFunctions.length,3);assert.equal(row.plan.runtimeParity,false);
});
test('one checked unit helper supports all ten primitive vector result domains',limits,async t=>{
 const imports='import type {'+PRIMITIVE_BITWISE_TYPES.map(row=>row.alias).join(',')+'} from "../runtime/primitive-operator-runtime.mjs";\n';
 const source=imports+operationImport+'export function check(value:RustU8):void{const checked=math(value,1n,8,false,"add");return;}'+PRIMITIVE_BITWISE_TYPES.map(domain=>'export function values_'+domain.name+'(value:'+domain.alias+',input:RustU8):readonly '+domain.alias+'[]{check(input);return [value];}').join('\n'),row=inserted(source);
 assert.equal(row.plan.bindings.length,11);for(const get of await insertionTargets(t,row))for(const domain of PRIMITIVE_BITWISE_TYPES){const value=BigInt(domain.maximum);assert.deepEqual(get('values_'+domain.name,value,3n),[value]);assert.throws(()=>get('values_'+domain.name,value,255n),/attempt to add with overflow/u);}
});
test('discarded source calls retain the first eager failure across a guarded continuation',limits,async t=>{
 const source=types+operationImport+'export function first(value:RustU8):void{const checked=math(value,1n,8,false,"add");return;}export function second(value:RustU8):void{const checked=math(1n,value,8,false,"div");return;}export function values(left:RustU8,right:RustU8,flag:boolean):readonly RustU8[]{first(left);if(flag){second(right);return [left];}else{return [math(left,right,8,false,"add")];}}',row=inserted(source);
 for(const get of await insertionTargets(t,row)){assert.deepEqual(get('values',3n,1n,true),[3n]);assert.deepEqual(get('values',3n,0n,false),[3n]);assert.throws(()=>get('values',255n,0n,true),/attempt to add with overflow/u);assert.throws(()=>get('values',3n,0n,true),/divide by zero/u);}
 const tree=canonicalRequestedNativeJsonVectorTree(row.result.program.find(item=>item.javascript==='values'));assert.equal(tree[0][0][0].startsWith('source-call:'),true);assert.equal(sync(row).selectedFunctions.length,3);
});
test('actual native unit call statements are discovered, refreshed and reissued with their complete callees',limits,async t=>{
 const rust='pub fn check(value:u8){let checked=value.checked_add(1).expect("attempt to add with overflow");}pub fn values(value:u8)->Vec<u8>{check(value);crate::translation_core::vec![value]}',source=operationImport+'export function check(value){const checked=math(value,1n,8,false,"add");return;}export function values(value){check(value);return [value];}',typed=types+operationImport+'export function check(value:RustU8):void{const checked=math(value,1n,8,false,"add");return;}export function values(value:RustU8):readonly RustU8[]{check(value);return [value];}',input=replaceBindings(data(rust,source,typed),['check','values']),row=receiving(input);
 for(const get of await insertionTargets(t,row)){assert.deepEqual(get('values',3n),[3n]);assert.throws(()=>get('values',255n),/attempt to add with overflow/u);}
 const discovery=proposeOwnedNativeBulkDiscovery({...input,vectorBindings:[]});assert.ok(discovery.modules.flatMap(module=>module.bindings).some(binding=>binding.rustName==='check'));assert.ok(discovery.modules.flatMap(module=>module.bindings).some(binding=>binding.rustName==='values'));
 const refresh=proposeOwnedNativeBulkModuleRefresh(input,[{sourcePath:JS,typescriptPath:TS,nativeRoute:{rustPath:'src/lib.rs',module:[]}}]);assert.equal(refresh.modules[0].bindings.length,2);assert.equal(sync(row).selectedFunctions.length,2);
});
test('unit calls never turn an unknown function, recursion, arbitrary host effect or invalid ABI into a supported helper',limits,()=>{
 for(const extra of ['export function values(value:boolean){unknown(value);return [value];}','export function check(value:boolean):void{check(value);return;}export function values(value:boolean){check(value);return [value];}','export function check(value:boolean):void{console.log(value);return;}export function values(value:boolean){check(value);return [value];}','export function check(value:boolean):boolean{return value;}export function values(value:boolean){check(value);return [value];}','export async function check(value:boolean){return;}export function values(value:boolean){check(value);return [value];}','export function check(value:boolean):void{return;}export function values(value:boolean){check(1n);return [value];}']){
  const input=emptyFixture(),before=JSON.stringify(input);assert.throws(()=>insert(input,extra));assert.equal(JSON.stringify(input),before);
 }
});
test('original source-call DATA API still refuses unit helpers and copied records grant no authority',limits,()=>{
 assert.equal(oldDomain({kind:'unit'}),null);assert.equal(currentDomain({kind:'unit'}),'unit');for(const field of ['rustReference','rustOwnership','patternOwnershipRefusal','rustGenericIdentityUnresolved','rustBorrowingUnresolved'])assert.equal(currentDomain({kind:'unit',[field]:true}),null);
 const row=inserted('export function check(value:boolean):void{return;}export function values(value:boolean){check(value);return [value];}'),item=row.result.program.find(item=>item.javascript==='values');assert.throws(()=>oldSummary(item));const summary=currentSummary(item);assert.equal(summary.calls[0].returns,'unit');
});
test('the additive continuation observer preserves the original discard refusal and grants no semantic authority',limits,()=>{
 const type={kind:'unit'},call={k:'call',fn:'target.check',args:[],type},terminal={k:'unit',type},declaration={k:'fn',name:'values',async:false,params:[],ret:type,body:{k:'routerDiscard',value:call,body:terminal,type}};
 assert.throws(()=>observeNativeFunctionControl(declaration));const observed=observeNativeSourceCallControl(declaration);assert.equal(observed.body.k,'let');assert.strictEqual(observed.body.value,call);assert.strictEqual(observed.body.body,terminal);
 assert.throws(()=>observeNativeSourceCallControl({...declaration,body:{...declaration.body,value:{...call,type:{kind:'bool'}}}}));assert.throws(()=>observeNativeSourceCallControl({...declaration,async:true}));
});
test('twenty-two complete source equations preserve full inverses and both substitution sequences',limits,()=>{
 const plan=prepareUnitHelperCallsSources();assert.equal(plan.files.length,22);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});

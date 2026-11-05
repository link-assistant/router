// Native value definition header source bootstrap cases. ALL UNRUN.
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

import {emitOwnedCoreProgram,emitOwnedPrimitiveValueDefinitionHeaders} from '../owned-vector-candidate-operations.mjs';
import {prepareOwnedPrimitiveExistingHelperSource} from '../owned-primitive-helper-extension.mjs';
import {prepareOwnedPrimitiveVectorExistingHelperSource,proposeOwnedPrimitiveVectorFunctionExtension} from '../owned-primitive-vector-definition-lifecycle.mjs';
import {preparePrimitiveValueHeadersSources} from '../../prepare-primitive-value-headers-sources.mjs';
import {emitOwnedPrimitiveValueDefinitionHeaders as publicHeaders} from '../../source-synchronization.mjs';
const initialJS='export function existing(value){return [value];}export function scalar(value){return value;}',initialTS='import type {RustU8} from "../runtime/primitive-operator-runtime.mjs";\nexport function existing(value:boolean):readonly boolean[]{return [value];}export function scalar(value:RustU8):RustU8{return value;}';
function fixture(){const input=data('pub mod target{pub fn existing(value:bool)->Vec<bool>{crate::translation_core::vec![value]}pub fn scalar(value:u8)->u8{value}}',initialJS,initialTS);input.vectorBindings=['existing','scalar'].map(name=>({javascriptPath:JS,javascriptName:name,rustPath:'src/lib.rs',rustName:'target.'+name}));return input;}
function request(source,javascript=false){return {sourcePath:JS,typescriptPath:TS,nativeRoute:route,...(javascript?{javascript:source}:{typescript:source})};}
test('native mixed scalar/vector headers reissue complete typed bodies without public-entry validation statements',limits,()=>{
 const row=receiving(fixture()),headers=emitOwnedPrimitiveValueDefinitionHeaders(row.result.program,{outputPath:TS});assert.strictEqual(publicHeaders,emitOwnedPrimitiveValueDefinitionHeaders);assert.ok(headers.includes('readonly boolean[]'));assert.ok(headers.includes('RustU8'));assert.doesNotMatch(headers,/typeof value/u);assert.throws(()=>emitOwnedCoreProgram(row.result.program,'typescript',{outputPath:TS,primitiveDefinitionHeaders:true}));const publicSource=emitOwnedCoreProgram(row.result.program,'typescript',{outputPath:TS});assert.match(publicSource,/typeof value/u);
});
for(const javascript of [false,true])test('fresh vector helper headers pass complete new-source bootstrap in '+(javascript?'JS':'TS'),limits,()=>{
 const source=javascript?'/** @param {boolean} value */\nexport function added(value){return existing(value);}':'export function added(value:boolean){return existing(value);}',plan=prepareOwnedPrimitiveVectorExistingHelperSource(fixture(),request(source,javascript));assert.equal(plan.supportProgram.length,1);assert.equal(plan.supportProgram[0].returns,'vec:bool');assert.equal(plan.bootstrapProgram.find(row=>row.javascript==='added').returns,'vec:bool');assert.doesNotMatch(plan.javascript,/typeof value/u);assert.equal(plan.runtimeParity,false);assert.equal(plan.rustExecuted,false);
});
for(const javascript of [false,true])test('the original scalar-only helper family selects source headers while keeping its exact ABI '+javascript,limits,()=>{
 const source=javascript?'/** @param {import("../runtime/primitive-operator-runtime.mjs").RustU8} value */\nexport function added(value){return scalar(value);}':'import type {RustU8} from "../runtime/primitive-operator-runtime.mjs";\nexport function added(value:RustU8):RustU8{return scalar(value);}',plan=prepareOwnedPrimitiveExistingHelperSource(fixture(),request(source,javascript));assert.equal(plan.supportProgram.length,1);assert.equal(plan.supportProgram[0].returns,'u8');assert.equal(plan.bootstrapProgram.find(row=>row.javascript==='added').returns,'u8');assert.doesNotMatch(plan.javascript,/typeof value/u);assert.equal(plan.runtimeParity,false);
});
test('final public extended source restores full validation for every original and added function',limits,async t=>{
 const input=fixture(),source=initialTS+'\nexport function added(value:boolean){return existing(value);}',plan=proposeOwnedPrimitiveVectorFunctionExtension(input,request(source)),files=new Map(input.files.map(row=>[row.path,row.source]));for(const output of plan.outputs)files.set(output.path,output.after);const next={...input,vectorBindings:plan.bindings,files:[...files].map(([path,source])=>({path,source}))},row=receiving(next);assert.match(files.get(JS),/typeof value/u);for(const get of await insertionTargets(t,row)){assert.deepEqual(get('existing',true),[true]);assert.deepEqual(get('added',true),[true]);assert.equal(get('scalar',255n),255n);assert.throws(()=>get('existing','true'));assert.throws(()=>get('added',1));assert.throws(()=>get('scalar',256n));}
});
test('header source APIs refuse empty unissued and non-native programs without granting permission flags',limits,()=>{
 assert.throws(()=>emitOwnedPrimitiveValueDefinitionHeaders([],{outputPath:TS}));assert.throws(()=>emitOwnedPrimitiveValueDefinitionHeaders([{kind:'owned-function',name:'forged',params:[],returns:'vec:bool',body:[],vectorOrigin:{kind:'primitive-expression-vector',type:'vec:bool'},source:{path:JS,source:'',span:[0,0]}}],{outputPath:TS}));
});
test('five complete native value header source equations retain exact source inverses and phases',limits,()=>{
 const plan=preparePrimitiveValueHeadersSources();assert.equal(plan.files.length,5);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});

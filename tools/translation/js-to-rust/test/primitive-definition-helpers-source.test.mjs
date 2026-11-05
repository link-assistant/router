// Fresh source-bound primitive definition helper regression sources. ALL UNRUN.
// Explicit private primitive definition source profile drafts. ALL UNRUN.
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



import {prepareOwnedVectorModulePair} from '../owned-vector-module-pair.mjs';
import {preparePrimitiveDefinitionHelpersSources} from '../../prepare-primitive-definition-helpers-sources.mjs';
import {checkOwnedCoreProgram} from '../owned-vector-candidate-operations.mjs';
import {proposeOwnedPrimitiveFunctionInsertion} from '../owned-primitive-function-insertion.mjs';
import {proposeOwnedPrimitiveFunctionExtension} from '../owned-primitive-function-extension.mjs';
import {PRIMITIVE_BITWISE_TYPES} from '../../primitive-bitwise-types.mjs';
const helperJS='export function caller(flag,value){return identity(flag)&&invert(value);}\nexport function invert(value){return !identity(value);}\nexport function identity(value){return value;}',helperTS='export function caller(flag:boolean,value:boolean):boolean{return identity(flag)&&invert(value);}\nexport function invert(value:boolean):boolean{return !identity(value);}\nexport function identity(value:boolean):boolean{return value;}';
function helpers(source=helperJS,typed=helperTS){const input=data('pub fn native_anchor()->bool{true}',source,typed);input.vectorBindings=[];input.primitiveOperators=true;input.primitiveDefinitions=true;const context=createOwnedVectorCandidateContext(input),result=translateOwnedVectorCandidate(source,{context,sourcePath:JS,typescriptOutputPath:TS});return {input,context,result};}
test('definition helpers use actual forward declaration symbols complete checked meta and whole strict paired behavior',limits,async t=>{
 const row=helpers(),getters=await insertionTargets(t,row);assert.equal(row.result.program.length,3);assert.equal(row.result.program[0].sourceCalls.length,2);assert.ok(row.result.rust.includes('identity('));const decoded=parseOwnedVectorCandidateMeta(row.result.meta,{context:row.context});assert.deepEqual(decoded.map(row=>row.javascript),['caller','invert','identity']);
 for(const get of getters)for(const flag of [true,false])for(const value of [true,false]){assert.equal(get('caller',flag,value),flag&&!value);assert.equal(get('invert',value),!value);assert.equal(get('identity',value),value);}assert.equal(row.result.runtimeParity,false);
});
test('all ten exact fixed domains preserve shared helper ABI and argument evaluation',limits,async t=>{
 const imports='import type {'+PRIMITIVE_BITWISE_TYPES.map(row=>row.alias).join(',')+'} from "../runtime/primitive-operator-runtime.mjs";\n',source=PRIMITIVE_BITWISE_TYPES.map(row=>'export function use_'+row.name+'(flag,value){if(flag){return leaf_'+row.name+'(value);}else{return leaf_'+row.name+'(value);}}\nexport function leaf_'+row.name+'(value){return value;}').join('\n'),typed=imports+PRIMITIVE_BITWISE_TYPES.map(row=>'export function use_'+row.name+'(flag:boolean,value:'+row.alias+'):'+row.alias+'{if(flag){return leaf_'+row.name+'(value);}else{return leaf_'+row.name+'(value);}}\nexport function leaf_'+row.name+'(value:'+row.alias+'):'+row.alias+'{return value;}').join('\n'),row=helpers(source,typed),getters=await insertionTargets(t,row);
 for(const domain of PRIMITIVE_BITWISE_TYPES)for(const value of [domain.signed?-BigInt(domain.minimumAbs):0n,0n,BigInt(domain.maximum)])for(const flag of [true,false])for(const get of getters)assert.equal(get('use_'+domain.name,flag,value),value);
});
test('definition helper closures keep qualified total operations as independently checked callees',limits,async()=>{
 const source='import {primitiveNot as complement} from "../runtime/primitive-operator-runtime.mjs";\nexport function caller(value){return leaf(value);}\nexport function leaf(value){return complement(value,8,false);}',typed='import {primitiveNot as complement} from "../runtime/primitive-operator-runtime.mjs";\nimport type {RustU8} from "../runtime/primitive-operator-runtime.mjs";\nexport function caller(value:RustU8):RustU8{return leaf(value);}\nexport function leaf(value:RustU8):RustU8{return complement(value,8,false);}',row=helpers(source,typed),runtime=await prepareOwnedVectorCandidateRuntime(row.result.program);
 for(const value of [0n,1n,127n,255n])assert.equal(evaluateOwnedVectorCandidate(row.result.program,'caller',[value],runtime),BigInt.asUintN(8,~value));
});
test('cyclic incomplete shadowed mutable borrowed unit and implicit-width helper closures retain refusals',limits,()=>{
 for(const typed of [
 'export function caller(value:boolean):boolean{return caller(value);}',
 'export function caller(value:boolean):boolean{return other(value);}export function other(value:boolean):boolean{return caller(value);}',
 'export function caller(value:boolean):boolean{return missing(value);}',
 'export function identity(value:boolean):boolean{return value;}export function caller(identity:boolean):boolean{return identity(true);}',
 'export function caller(value:boolean):boolean{return leaf(value);}export function leaf(value:boolean):boolean{let copy=value;copy=false;return copy;}',
 'export function caller(value:string):boolean{return leaf(value);}export function leaf(value:string):boolean{return true;}',
 'export function caller():void{return leaf();}export function leaf():void{return;}',
 'export function caller(value:bigint):bigint{return leaf(value);}export function leaf(value:bigint):bigint{return value;}',
 ]){const pair=prepareOwnedVectorModulePair(JS,TS,typed);assert.throws(()=>helpers(pair.javascript.source,typed));}
 const declarations=Array.from({length:34},(_,index)=>'export function chain_'+index+'(value:boolean):boolean{return '+(index===33?'value':'chain_'+(index+1)+'(value)')+';}').join('\n'),pair=prepareOwnedVectorModulePair(JS,TS,declarations);assert.throws(()=>helpers(pair.javascript.source,declarations));
});
test('public helper summaries and saved program fragments cannot replace fresh callee issuance',limits,()=>{
 const row=helpers(),missing=row.result.program.filter(item=>item.javascript!=='identity');assert.throws(()=>checkOwnedCoreProgram(missing,row.context));const changed=structuredClone(row.result.program);changed[0].sourceCalls[0].rust='forged';assert.throws(()=>checkOwnedCoreProgram(changed,row.context));const altered=structuredClone(row.input);altered.files.find(file=>file.path===JS).source=helperJS.replace('return value;','return false;');const context=createOwnedVectorCandidateContext(altered);assert.throws(()=>parseOwnedVectorCandidateMeta(row.result.meta,{context}));
});
function emptyHelperFixture(nonempty=false){const input=data('pub mod target {'+(nonempty?'pub fn existing(value:bool)->bool{value}':'')+'}',nonempty?'export function existing(value){return value;}':'',nonempty?'export function existing(value:boolean):boolean{return value;}':'');input.vectorBindings=nonempty?[{javascriptPath:JS,javascriptName:'existing',rustPath:'src/lib.rs',rustName:'target.existing'}]:[];return input;}
for(const nonempty of [false,true])for(const authority of ['javascript','typescript'])test('complete new helper group inserts '+authority+' into '+(nonempty?'nonempty':'empty')+' actual native module without placeholder bodies',limits,async()=>{
 const input=emptyHelperFixture(nonempty),prefix=nonempty?(authority==='javascript'?'export function existing(value){return value;}\n':'export function existing(value:boolean):boolean{return value;}\n'):'',source=authority==='javascript'?helperJS.replace('export function caller','/** @param {boolean} flag @param {boolean} value */\nexport function caller').replace('export function invert','/** @param {boolean} value */\nexport function invert').replace('export function identity','/** @param {boolean} value */\nexport function identity'):helperTS,request={sourcePath:JS,typescriptPath:TS,nativeRoute:{rustPath:'src/lib.rs',module:['target']},[authority]:prefix+source},plan=(nonempty?proposeOwnedPrimitiveFunctionExtension:proposeOwnedPrimitiveFunctionInsertion)(input,request),files=new Map(input.files.map(row=>[row.path,row.source]));for(const output of plan.outputs)files.set(output.path,output.after);const next={...input,vectorBindings:plan.bindings,files:[...files].map(([path,source])=>({path,source}))},context=createOwnedVectorCandidateContext(next),result=translateOwnedVectorCandidate(files.get(JS),{context,sourcePath:JS,typescriptOutputPath:TS}),runtime=await prepareOwnedVectorCandidateRuntime(result.program);
 assert.equal(plan.bindings.length,nonempty?4:3);for(const flag of [true,false])for(const value of [true,false])assert.equal(evaluateOwnedVectorCandidate(result.program,'caller',[flag,value],runtime),flag&&!value);assert.equal(plan.nativeInstalled,false);assert.equal(plan.rustExecuted,false);assert.ok(!files.get('src/lib.rs').includes('unimplemented!'));
});
test('seven complete helper source equations retain original implementations inverses and phases',limits,()=>{
 const plan=preparePrimitiveDefinitionHelpersSources();assert.equal(plan.files.length,7);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});

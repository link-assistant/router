// Complete new receiving/native unit adoption regression sources. ALL UNRUN.
// Actual written unit definition and source-only regression drafts. ALL UNRUN.
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


import {proposeOwnedPrimitiveUnitAdoption,requireOwnedPrimitiveAdoptionParent} from '../owned-primitive-unit-adoption.mjs';
import {preparePrimitiveUnitAdoptionSources} from '../../prepare-primitive-unit-adoption-sources.mjs';
const adoptedTypeScript='export function caller(value:boolean):boolean{return identity(value);}\nexport function identity(value:boolean):boolean{return value;}\nexport function empty():void{return;}',adoptedJavaScript='/** @param {boolean} value */\nexport function caller(value){return identity(value);}\n/** @param {boolean} value */\nexport function identity(value){return value;}\n/** @returns {void} */\nexport function empty(){return;}',adoptedRoute={rustPath:'src/lib.rs',module:['new_unit']};
function adoptionFixture(authority,onDisk=false){const input=data('pub fn untouched()->bool{false}','','');input.vectorBindings=[];input.files=input.files.filter(row=>row.path!==JS&&row.path!==TS);if(onDisk)input.files.push({path:authority==='javascript'?JS:TS,source:authority==='javascript'?adoptedJavaScript:adoptedTypeScript});return input;}
function installAdoption(input,plan){const files=new Map(input.files.map(row=>[row.path,row.source]));for(const output of plan.outputs)files.set(output.path,output.after);return {...input,vectorBindings:[...input.vectorBindings,...plan.bindings],files:[...files].map(([path,source])=>({path,source}))};}
for(const authority of ['javascript','typescript'])for(const onDisk of [false,true])test('new '+authority+' unit '+(onDisk?'already present':'explicit source request')+' adopts a complete checked native module and absent companion',limits,async t=>{
 const input=adoptionFixture(authority,onDisk),plan=proposeOwnedPrimitiveUnitAdoption(input,{sourcePath:JS,typescriptPath:TS,nativeRoute:adoptedRoute,[authority]:authority==='javascript'?adoptedJavaScript:adoptedTypeScript});
 assert.deepEqual(plan.bindings.map(row=>row.rustName).sort(),['new_unit.caller','new_unit.empty','new_unit.identity']);assert.equal(plan.sourceAbsences.length,onDisk?1:2);for(const path of plan.sourceAbsences){const output=plan.outputs.find(row=>row.path===path);assert.equal(output.before,null);assert.equal(output.inverse,null);assert.equal(output.sourceAbsent,true);}const native=plan.outputs.find(row=>row.path==='src/lib.rs');assert.ok(native.after.includes('pub mod new_unit'));assert.ok(native.after.includes('pub fn untouched()->bool{false}'));assert.ok(!native.after.includes('unimplemented!'));assert.equal(native.before.slice(0,plan.nativeModuleInsertion.at)+plan.nativeModuleInsertion.replacement+native.before.slice(plan.nativeModuleInsertion.at),native.after);
 const next=installAdoption(input,plan),context=createOwnedVectorCandidateContext(next),result=translateOwnedVectorCandidate(next.files.find(row=>row.path===JS).source,{context,sourcePath:JS,typescriptOutputPath:TS}),getters=await insertionTargets(t,{input:next,context,result});for(const get of getters){for(const value of [true,false])assert.equal(get('caller',value),value);assert.equal(get('empty'),undefined);}for(const key of ['sourceAuthority','semanticAuthority','productionSelected','nativeInstalled','nativeFreshnessQualified','receivingExecuted','runtimeParity','wholeRouterSynchronization','crossInvocationCache','rustExecuted'])assert.equal(plan[key],false);
});
test('nested actual parent coordinates produce only one direct inline native child source insertion',limits,()=>{
 const input=adoptionFixture('typescript');input.files.find(row=>row.path==='src/lib.rs').source='pub mod translation_core;\npub mod container {pub fn kept()->bool{false}}\npub fn outside()->bool{true}';const route={rustPath:'src/lib.rs',module:['container','new_unit']},plan=proposeOwnedPrimitiveUnitAdoption(input,{sourcePath:JS,typescriptPath:TS,nativeRoute:route,typescript:adoptedTypeScript});assert.deepEqual(plan.nativeParent.module,['container']);assert.ok(plan.bindings.every(row=>row.rustName.startsWith('container.new_unit.')));assert.ok(plan.outputs.find(row=>row.path==='src/lib.rs').after.includes('pub fn outside()->bool{true}'));
});
test('actual native parent and receiving absences cannot be replaced by competing source or public adoption data',limits,()=>{
 const request={sourcePath:JS,typescriptPath:TS,nativeRoute:adoptedRoute,typescript:adoptedTypeScript};
 for(const native of ['pub mod new_unit {}','pub mod absent {}','pub const new_unit:bool=true;','use crate::translation_core::Json;','macro_rules! any {()=>{}}']){const input=adoptionFixture('typescript');input.files.find(row=>row.path==='src/lib.rs').source='pub mod translation_core;\n'+native;const changed=native==='pub mod absent {}'?{...request,nativeRoute:{rustPath:'src/lib.rs',module:['missing','new_unit']}}:request;assert.throws(()=>proposeOwnedPrimitiveUnitAdoption(input,changed));}
 const companion=adoptionFixture('typescript');companion.files.push({path:JS,source:''});assert.throws(()=>proposeOwnedPrimitiveUnitAdoption(companion,request));const differing=adoptionFixture('typescript',true);differing.files.find(row=>row.path===TS).source+=' ';assert.throws(()=>proposeOwnedPrimitiveUnitAdoption(differing,request));assert.throws(()=>proposeOwnedPrimitiveUnitAdoption(adoptionFixture('typescript'),{...request,nativeModuleInsertion:{at:0,replacement:'pub mod new_unit{}'}}));assert.throws(()=>requireOwnedPrimitiveAdoptionParent({sourceScopes:[],executableDeclarations:[]},new Map([['src/lib.rs','']]),adoptedRoute));
});
test('new unit source still requires actual closed types effects and complete native functions',limits,()=>{
 for(const source of ['', 'export function bad(value:string):string{return value;}', 'export function bad():void{console.log("effect");}', 'export function recursive(value:boolean):boolean{return recursive(value);}', 'export function bad(value:bigint):bigint{return value+1n;}'])assert.throws(()=>proposeOwnedPrimitiveUnitAdoption(adoptionFixture('typescript'),{sourcePath:JS,typescriptPath:TS,nativeRoute:adoptedRoute,typescript:source}));
});
test('two complete new unit adoption source equations preserve actual inverses and two phases',limits,()=>{
 const plan=preparePrimitiveUnitAdoptionSources();assert.equal(plan.files.length,2);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});

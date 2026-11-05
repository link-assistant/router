// Receiving function deletion and independent case sources. ALL UNRUN.
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

import {proposeOwnedPrimitiveFunctionRemoval,ownedPrimitiveFunctionRemovalRequired} from '../owned-primitive-function-removal.mjs';
import {proposeOwnedPrimitiveFunctionInsertion} from '../owned-primitive-function-insertion.mjs';
import {preparePrimitiveFunctionRemovalSources} from '../../prepare-primitive-function-removal-sources.mjs';
const removalRoute={rustPath:'src/lib.rs',module:['target']};
const originalJS='export function existing(value){return value;}\nexport function obsolete(value){return !value;}',originalTS='export function existing(value:boolean):boolean{return value;}\nexport function obsolete(value:boolean):boolean{return !value;}';
function removalFixture(){const input=data('pub fn untouched()->bool{false}\npub mod target {pub fn existing(value:bool)->bool{value}\npub fn obsolete(value:bool)->bool{!value}}',originalJS,originalTS);input.vectorBindings=['existing','obsolete'].map(name=>({javascriptPath:JS,javascriptName:name,rustPath:'src/lib.rs',rustName:'target.'+name}));return input;}
function installRemoval(input,plan){const files=new Map(input.files.map(row=>[row.path,row.source]));for(const row of plan.outputs)files.set(row.path,row.after);return {...input,vectorBindings:[...input.vectorBindings.filter(row=>row.javascriptPath!==JS),...plan.bindings],files:[...files].map(([path,source])=>({path,source}))};}
function checkedRemoval(input){const context=createOwnedVectorCandidateContext(input),result=translateOwnedVectorCandidate(input.files.find(row=>row.path===JS).source,{context,sourcePath:JS,typescriptOutputPath:TS});return {input,context,result};}
for(const authority of ['javascript','typescript'])test('receiving '+authority+' removal updates retained body and deletes exactly the selected original native function',limits,async t=>{
 const input=removalFixture(),request={sourcePath:JS,typescriptPath:TS,nativeRoute:removalRoute,[authority]:authority==='javascript'?'export function existing(value){return !value;}':'export function existing(value:boolean):boolean{return !value;}'};
 assert.equal(ownedPrimitiveFunctionRemovalRequired(input,request),true);const plan=proposeOwnedPrimitiveFunctionRemoval(input,request);assert.deepEqual(plan.removedBindings.map(row=>row.rustName),['target.obsolete']);assert.deepEqual(plan.bindings.map(row=>row.rustName),['target.existing']);assert.equal(plan.nativeChanges.filter(row=>row.kind==='function-removal').length,1);assert.equal(plan.nativeChanges.filter(row=>row.kind==='function-replacement').length,1);
 const native=plan.outputs.find(row=>row.path==='src/lib.rs');assert.ok(native.after.includes('pub fn untouched()->bool{false}'));assert.ok(!native.after.includes('fn obsolete'));for(const output of plan.outputs){assert.equal(output.inverse,output.before);assert.equal(input.files.find(row=>row.path===output.path).source,output.before);assert.ok(output.history);}
 const row=checkedRemoval(installRemoval(input,plan)),getters=await insertionTargets(t,row);for(const get of getters)for(const value of [true,false])assert.equal(get('existing',value),!value);assert.equal(row.result.program.length,1);
 for(const key of ['sourceAuthority','semanticAuthority','productionSelected','nativeInstalled','nativeFreshnessQualified','receivingExecuted','runtimeParity','wholeRouterSynchronization','crossInvocationCache','rustExecuted'])assert.equal(plan[key],false);
});
for(const authority of ['javascript','typescript'])test('deleting every receiving function retains an empty native route and permits a subsequent checked insertion '+authority,limits,()=>{
 const input=removalFixture(),plan=proposeOwnedPrimitiveFunctionRemoval(input,{sourcePath:JS,typescriptPath:TS,[authority]:''});assert.deepEqual(plan.bindings,[]);assert.equal(plan.removedBindings.length,2);assert.deepEqual(plan.nativeRoute,removalRoute);assert.equal(plan.outputs.find(row=>row.path===JS).after,'');assert.equal(plan.outputs.find(row=>row.path===TS).after,'');const installed=installRemoval(input,plan),inserted=proposeOwnedPrimitiveFunctionInsertion(installed,{sourcePath:JS,typescriptPath:TS,nativeRoute:removalRoute,typescript:'export function restored(value:boolean):boolean{return value;}'});
 assert.deepEqual(inserted.bindings.map(row=>row.rustName),['target.restored']);assert.ok(inserted.outputs.find(row=>row.path==='src/lib.rs').after.includes('fn restored'));
});
test('retained same-unit callers can drop the removed dependency before the actual native removal',limits,()=>{
 const input=removalFixture();input.files.find(row=>row.path==='src/lib.rs').source=input.files.find(row=>row.path==='src/lib.rs').source.replace('existing(value:bool)->bool{value}','existing(value:bool)->bool{obsolete(value)}');input.files.find(row=>row.path===JS).source=originalJS.replace('return value;','return obsolete(value);');input.files.find(row=>row.path===TS).source=originalTS.replace('return value;','return obsolete(value);');
 const plan=proposeOwnedPrimitiveFunctionRemoval(input,{sourcePath:JS,typescriptPath:TS,typescript:'export function existing(value:boolean):boolean{return value;}'});assert.equal(plan.removedBindings.length,1);assert.ok(!plan.outputs.find(row=>row.path==='src/lib.rs').after.includes('fn obsolete'));
});
test('native callers outside the updated unit cannot be left dangling',limits,()=>{
 const input=removalFixture();input.files.find(row=>row.path==='src/lib.rs').source+='\npub fn external(value:bool)->bool{target::obsolete(value)}';assert.throws(()=>proposeOwnedPrimitiveFunctionRemoval(input,{sourcePath:JS,typescriptPath:TS,typescript:'export function existing(value:boolean):boolean{return value;}'}));
});
test('removal refuses added names duplicate names altered routes effects and noncanonical empty sources',limits,()=>{
 for(const source of ['export function added(value:boolean):boolean{return value;}','export function existing(value:boolean):boolean{return value;}export function existing(value:boolean):boolean{return value;}','export function existing(value:boolean):boolean{throw new Error("bad");}',' ','import "../runtime/primitive-operator-runtime.mjs";']){
  assert.throws(()=>proposeOwnedPrimitiveFunctionRemoval(removalFixture(),{sourcePath:JS,typescriptPath:TS,typescript:source}));
 }
 const input=removalFixture();assert.throws(()=>proposeOwnedPrimitiveFunctionRemoval(input,{sourcePath:JS,typescriptPath:TS,nativeRoute:{rustPath:'src/lib.rs',module:['other']},typescript:''}));assert.throws(()=>proposeOwnedPrimitiveFunctionRemoval(input,{sourcePath:JS,typescriptPath:TS,typescript:originalTS}));assert.equal(ownedPrimitiveFunctionRemovalRequired(input,{sourcePath:JS,typescriptPath:TS,typescript:originalTS}),false);
});
test('complete original source and documentation ownership are required before deletion',limits,()=>{
 const input=removalFixture(),mismatch=structuredClone(input);mismatch.vectorBindings[1].rustName='target.missing';assert.throws(()=>proposeOwnedPrimitiveFunctionRemoval(mismatch,{sourcePath:JS,typescriptPath:TS,typescript:''}));
 for(const prefix of ['/// outer docs\n','/** outer docs */\n']){const decorated=structuredClone(input),file=decorated.files.find(row=>row.path==='src/lib.rs');file.source=file.source.replace('pub fn obsolete',prefix+'pub fn obsolete');assert.throws(()=>proposeOwnedPrimitiveFunctionRemoval(decorated,{sourcePath:JS,typescriptPath:TS,typescript:'export function existing(value:boolean):boolean{return value;}'}));}
 const constant=structuredClone(input);constant.files.find(row=>row.path==='src/lib.rs').source=constant.files.find(row=>row.path==='src/lib.rs').source.replace('pub mod target {','pub mod target {pub const REMAINS:bool=true;');assert.throws(()=>proposeOwnedPrimitiveFunctionRemoval(constant,{sourcePath:JS,typescriptPath:TS,typescript:''}));
});
test('complete removal copy equations preserve source inverses and exactly two phases',limits,()=>{
 const plan=preparePrimitiveFunctionRemovalSources();assert.equal(plan.files.length,2);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);assert.equal(plan.productionSelected,false);
});

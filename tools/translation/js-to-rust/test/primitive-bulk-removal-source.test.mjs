// Receiving membership removal bulk case sources. ALL UNRUN.
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



import {proposeOwnedVectorBulkModuleSynchronization} from '../owned-vector-bulk-module-synchronization.mjs';
import {preparePrimitiveBulkRemovalSources} from '../../prepare-primitive-bulk-removal-sources.mjs';
const BRAVO_JS='app/src/bravo.mjs',BRAVO_TS='typed/src/bravo.mts',alphaRoute={rustPath:'src/lib.rs',module:['alpha']},bravoRoute={rustPath:'src/lib.rs',module:['bravo']};
function bulkRemovalFixture(){
 const input=data('pub mod alpha {pub fn existing(value:bool)->bool{value}\npub fn obsolete(value:bool)->bool{!value}}\npub mod bravo {pub fn enabled()->bool{true}}','export function existing(value){return value;}\nexport function obsolete(value){return !value;}','export function existing(value:boolean):boolean{return value;}\nexport function obsolete(value:boolean):boolean{return !value;}');
 input.vectorBindings=['existing','obsolete'].map(name=>({javascriptPath:JS,javascriptName:name,rustPath:'src/lib.rs',rustName:'alpha.'+name}));input.vectorBindings.push({javascriptPath:BRAVO_JS,javascriptName:'enabled',rustPath:'src/lib.rs',rustName:'bravo.enabled'});input.files.push({path:BRAVO_JS,source:'export function enabled(){return true;}'},{path:BRAVO_TS,source:'export function enabled():boolean{return true;}'});return input;
}
function installBulkRemoval(input,plan){const files=new Map(input.files.map(row=>[row.path,row.source]));for(const output of [...plan.nativeEdits,...plan.outputs])files.set(output.path,output.after);const touched=new Set(plan.modules.map(row=>row.javascriptPath));return {...input,vectorBindings:[...input.vectorBindings.filter(row=>!touched.has(row.javascriptPath)),...plan.modules.flatMap(row=>row.bindings)],files:[...files].map(([path,source])=>({path,source}))};}
for(const authority of ['javascript','typescript'])test('bulk '+authority+' removes selected functions and updates a sibling module in one exact native file equation',limits,async()=>{
 const input=bulkRemovalFixture(),requests=[{sourcePath:JS,typescriptPath:TS,[authority]:authority==='javascript'?'export function existing(value){return !value;}':'export function existing(value:boolean):boolean{return !value;}'},{sourcePath:BRAVO_JS,typescriptPath:BRAVO_TS,[authority]:authority==='javascript'?'export function enabled(){return false;}':'export function enabled():boolean{return false;}'}],plan=proposeOwnedVectorBulkModuleSynchronization(input,requests);
 assert.equal(plan.nativeEdits.length,1);assert.equal(plan.nativeEdits[0].functions.filter(row=>row.removed).length,1);assert.equal(plan.nativeEdits[0].functions.length,3);assert.equal(plan.modules.filter(row=>row.removedNativeFunctions).length,1);assert.equal(plan.modules.flatMap(row=>row.bindings).length,2);assert.ok(!plan.nativeEdits[0].after.includes('fn obsolete'));
 const next=installBulkRemoval(input,plan),context=createOwnedVectorCandidateContext(next);
 for(const module of plan.modules){const result=translateOwnedVectorCandidate(next.files.find(row=>row.path===module.javascriptPath).source,{context,sourcePath:module.javascriptPath,typescriptOutputPath:module.typescriptPath}),runtime=await prepareOwnedVectorCandidateRuntime(result.program);if(module.javascriptPath===JS)for(const value of [true,false])assert.equal(evaluateOwnedVectorCandidate(result.program,'existing',[value],runtime),!value);else assert.equal(evaluateOwnedVectorCandidate(result.program,'enabled',[],runtime),false);}
 const repeated=proposeOwnedVectorBulkModuleSynchronization(next,plan.modules.map(row=>({sourcePath:row.javascriptPath,typescriptPath:row.typescriptPath,[authority]:next.files.find(file=>file.path===(authority==='javascript'?row.javascriptPath:row.typescriptPath)).source})));assert.deepEqual(repeated.nativeEdits,[]);assert.equal(plan.runtimeParity,false);assert.equal(plan.rustExecuted,false);
});
for(const authority of ['javascript','typescript'])test('bulk '+authority+' full clear repeat and source-driven restore preserve both module routes',limits,()=>{
 const input=bulkRemovalFixture(),requests=[{sourcePath:JS,typescriptPath:TS,nativeRoute:alphaRoute,[authority]:''},{sourcePath:BRAVO_JS,typescriptPath:BRAVO_TS,nativeRoute:bravoRoute,[authority]:''}],plan=proposeOwnedVectorBulkModuleSynchronization(input,requests);assert.equal(plan.nativeEdits.length,1);assert.equal(plan.nativeEdits[0].functions.filter(row=>row.removed).length,3);assert.ok(plan.modules.every(row=>row.bindings.length===0&&row.removedNativeFunctions));const next=installBulkRemoval(input,plan),again=proposeOwnedVectorBulkModuleSynchronization(next,requests);assert.deepEqual(again.nativeEdits,[]);
 const restored=proposeOwnedVectorBulkModuleSynchronization(next,requests.map(row=>({...row,[authority]:authority==='javascript'?'/** @param {boolean} value */\nexport function restored(value){return value;}':'export function restored(value:boolean):boolean{return value;}'})));assert.equal(restored.nativeEdits.length,1);assert.ok(restored.modules.every(row=>row.bindings.length===1&&row.newNativeFunctions));
});
test('different modules can independently remove and add functions in the same original native file',limits,()=>{
 const input=bulkRemovalFixture(),plan=proposeOwnedVectorBulkModuleSynchronization(input,[{sourcePath:JS,typescriptPath:TS,typescript:'export function existing(value:boolean):boolean{return value;}'},{sourcePath:BRAVO_JS,typescriptPath:BRAVO_TS,typescript:'export function enabled():boolean{return true;}\nexport function added(value:boolean):boolean{return value;}'}]);assert.equal(plan.nativeEdits.length,1);assert.equal(plan.nativeEdits[0].functions.filter(row=>row.removed).length,1);assert.equal(plan.nativeEdits[0].functions.filter(row=>row.inserted).length,1);assert.equal(plan.modules.flatMap(row=>row.bindings).length,3);
});
test('already-edited authoritative source is not mistaken for a saved complete native verdict',limits,()=>{
 const input=bulkRemovalFixture(),source='export function existing(value){return value;}';input.files.find(row=>row.path===JS).source=source;const plan=proposeOwnedVectorBulkModuleSynchronization(input,[{sourcePath:JS,typescriptPath:TS,javascript:source}]);assert.equal(plan.modules[0].removedBindings.length,1);assert.equal(plan.outputs.find(row=>row.path===JS).before,source);assert.equal(plan.outputs.find(row=>row.path===JS).inverse,source);
});
test('bulk removal retains duplicate owner unsupported mixed-body and supplied-edit refusals',limits,()=>{
 const input=bulkRemovalFixture(),request={sourcePath:JS,typescriptPath:TS,typescript:'export function existing(value:boolean):boolean{return value;}'};
 assert.throws(()=>proposeOwnedVectorBulkModuleSynchronization(input,[request,request]));assert.throws(()=>proposeOwnedVectorBulkModuleSynchronization(input,[{...request,nativeChanges:[]}]));assert.throws(()=>proposeOwnedVectorBulkModuleSynchronization(input,[{...request,typescript:'export function added(value:boolean):boolean{return added(value);}'}]));
});
test('four complete bulk removal source equations preserve actual inverses and fixed phases',limits,()=>{
 const plan=preparePrimitiveBulkRemovalSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});

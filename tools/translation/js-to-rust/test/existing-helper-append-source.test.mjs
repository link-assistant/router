// Actual existing helper native append regression source drafts. ALL UNRUN.
// Actual existing helper source closure and private bootstrap regression drafts. ALL UNRUN.
// Exact definition literal/header regression source drafts. ALL UNRUN.
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






import {proposeOwnedPrimitiveFunctionExtension as extend} from '../owned-primitive-function-extension.mjs';
import {proposeOwnedPrimitiveFunctionExtension as copiedExtend} from '../owned-primitive-helper-extension.mjs';
import {proposeOwnedPrimitiveFunctionReconciliation} from '../owned-primitive-function-reconciliation.mjs';
import {proposeOwnedVectorBulkModuleSynchronization} from '../owned-vector-bulk-module-synchronization.mjs';
import {prepareExistingHelperAppendSources} from '../../prepare-existing-helper-append-sources.mjs';
import {PRIMITIVE_BITWISE_TYPES} from '../../primitive-bitwise-types.mjs';
const helperAppendRoute={rustPath:'src/lib.rs',module:['target']},requestedHelperJS='export function existing(value){return added(value);}\nexport function leaf(value){return value;}\n/** @param {boolean} value @returns {boolean} */\nexport function added(value){return leaf(value);}',requestedHelperTS='export function existing(value:boolean):boolean{return added(value);}\nexport function leaf(value:boolean):boolean{return value;}\nexport function added(value:boolean):boolean{return leaf(value);}';
function helperAppendFixture(){const input=data('pub mod target {pub fn existing(value:bool)->bool{leaf(value)}\npub fn leaf(value:bool)->bool{value}}\npub fn untouched()->bool{false}','export function existing(value){return leaf(value);}\nexport function leaf(value){return value;}','export function existing(value:boolean):boolean{return leaf(value);}\nexport function leaf(value:boolean):boolean{return value;}');input.vectorBindings=['existing','leaf'].map(name=>({javascriptPath:JS,javascriptName:name,rustPath:'src/lib.rs',rustName:'target.'+name}));return input;}
function installHelperAppend(input,plan){const files=new Map(input.files.map(row=>[row.path,row.source]));for(const output of plan.outputs)files.set(output.path,output.after);return {...input,vectorBindings:[...input.vectorBindings.filter(row=>row.javascriptPath!==JS),...plan.bindings],files:[...files].map(([path,source])=>({path,source}))};}
function checkedHelperAppend(input){const context=createOwnedVectorCandidateContext(input),result=translateOwnedVectorCandidate(input.files.find(row=>row.path===JS).source,{context,sourcePath:JS,typescriptOutputPath:TS});return {input,context,result};}
for(const authority of ['javascript','typescript'])for(const alreadyEdited of [false,true])test('new '+authority+' functions call actual existing helpers while retained callers use the new function '+(alreadyEdited?'from edited source':'from explicit source'),limits,async t=>{
 const input=helperAppendFixture(),source=authority==='javascript'?requestedHelperJS:requestedHelperTS;if(alreadyEdited)input.files.find(row=>row.path===(authority==='javascript'?JS:TS)).source=source;const plan=extend(input,{sourcePath:JS,typescriptPath:TS,nativeRoute:helperAppendRoute,[authority]:source});assert.equal(extend,copiedExtend);assert.deepEqual(plan.addedBindings.map(row=>row.javascriptName),['added']);assert.deepEqual(plan.bindings.map(row=>row.javascriptName).sort(),['added','existing','leaf']);
 const native=plan.outputs.find(row=>row.path==='src/lib.rs');assert.equal((native.after.match(/\bfn\s+leaf\b/gu)??[]).length,1);assert.equal((native.after.match(/\bfn\s+existing\b/gu)??[]).length,1);assert.equal((native.after.match(/\bfn\s+added\b/gu)??[]).length,1);assert.ok(native.after.includes('pub fn untouched()->bool{false}'));assert.equal(plan.nativeChanges.filter(row=>row.kind==='native-function-insertion')[0].names.length,1);for(const output of plan.outputs)assert.equal(output.inverse,output.before);
 const next=installHelperAppend(input,plan),row=checkedHelperAppend(next),getters=await insertionTargets(t,row);for(const get of getters)for(const value of [true,false])for(const name of ['existing','added','leaf'])assert.equal(get(name,value),value);
 const repeated=proposeOwnedVectorBulkModuleSynchronization(next,[{sourcePath:JS,typescriptPath:TS,[authority]:next.files.find(row=>row.path===(authority==='javascript'?JS:TS)).source}]);assert.deepEqual(repeated.nativeEdits,[]);assert.equal(plan.nativeInstalled,false);assert.equal(plan.runtimeParity,false);assert.equal(plan.rustExecuted,false);
});
for(const authority of ['javascript','typescript'])test('all ten fixed new-to-existing helper domains append only complete new native functions '+authority,limits,async()=>{
 for(const domain of PRIMITIVE_BITWISE_TYPES){const typeImport='import type {'+domain.alias+'} from "../runtime/primitive-operator-runtime.mjs";\n',input=data('pub mod target {pub fn existing(value:'+domain.name+')->'+domain.name+'{leaf(value)}\npub fn leaf(value:'+domain.name+')->'+domain.name+'{value}}','export function existing(value){return leaf(value);}\nexport function leaf(value){return value;}',typeImport+'export function existing(value:'+domain.alias+'):'+domain.alias+'{return leaf(value);}\nexport function leaf(value:'+domain.alias+'):'+domain.alias+'{return value;}');input.vectorBindings=['existing','leaf'].map(name=>({javascriptPath:JS,javascriptName:name,rustPath:'src/lib.rs',rustName:'target.'+name}));
  const source=authority==='javascript'?'export function existing(value){return added(value);}\nexport function leaf(value){return value;}\n/** @param {import("../runtime/primitive-operator-runtime.mjs").'+domain.alias+'} value @returns {import("../runtime/primitive-operator-runtime.mjs").'+domain.alias+'} */\nexport function added(value){return leaf(value);}':typeImport+'export function existing(value:'+domain.alias+'):'+domain.alias+'{return added(value);}\nexport function leaf(value:'+domain.alias+'):'+domain.alias+'{return value;}\nexport function added(value:'+domain.alias+'):'+domain.alias+'{return leaf(value);}',plan=extend(input,{sourcePath:JS,typescriptPath:TS,[authority]:source}),next=installHelperAppend(input,plan),row=checkedHelperAppend(next),runtime=await prepareOwnedVectorCandidateRuntime(row.result.program);assert.equal(plan.addedBindings.length,1);
  for(const value of [domain.signed?-BigInt(domain.minimumAbs):0n,0n,BigInt(domain.maximum)])for(const name of ['existing','added','leaf'])assert.equal(evaluateOwnedVectorCandidate(row.result.program,name,[value],runtime),value);assert.equal((plan.outputs.find(row=>row.path==='src/lib.rs').after.match(/\bfn\s+leaf\b/gu)??[]).length,1);
 }
});
test('actual new-to-old helper dependencies compose with same-module function removal and ordinary bulk dispatch',limits,async()=>{
 const input=helperAppendFixture();input.files.find(row=>row.path==='src/lib.rs').source=input.files.find(row=>row.path==='src/lib.rs').source.replace('pub mod target {','pub mod target {pub fn obsolete(value:bool)->bool{!value}\n');input.vectorBindings.push({javascriptPath:JS,javascriptName:'obsolete',rustPath:'src/lib.rs',rustName:'target.obsolete'});input.files.find(row=>row.path===JS).source+='\nexport function obsolete(value){return !value;}';input.files.find(row=>row.path===TS).source+='\nexport function obsolete(value:boolean):boolean{return !value;}';
 const request={sourcePath:JS,typescriptPath:TS,typescript:requestedHelperTS},mixed=proposeOwnedPrimitiveFunctionReconciliation(input,request);assert.deepEqual(mixed.addedBindings.map(row=>row.javascriptName),['added']);assert.deepEqual(mixed.removedBindings.map(row=>row.javascriptName),['obsolete']);assert.ok(!mixed.outputs.find(row=>row.path==='src/lib.rs').after.includes('fn obsolete'));const row=checkedHelperAppend(installHelperAppend(input,mixed)),runtime=await prepareOwnedVectorCandidateRuntime(row.result.program);for(const value of [true,false])assert.equal(evaluateOwnedVectorCandidate(row.result.program,'existing',[value],runtime),value);
 const bulk=proposeOwnedVectorBulkModuleSynchronization(input,[request]);assert.equal(bulk.nativeEdits.length,1);assert.equal(bulk.modules[0].addedBindings.length,1);assert.equal(bulk.modules[0].removedBindings.length,1);assert.equal(bulk.modules[0].bindings.length,3);
});
test('changed existing helper behavior is checked in the final complete unit rather than copied from an old verdict',limits,async()=>{
 const input=helperAppendFixture(),source=requestedHelperTS.replace('leaf(value:boolean):boolean{return value;}','leaf(value:boolean):boolean{return !value;}'),plan=extend(input,{sourcePath:JS,typescriptPath:TS,typescript:source}),row=checkedHelperAppend(installHelperAppend(input,plan)),runtime=await prepareOwnedVectorCandidateRuntime(row.result.program);for(const value of [true,false])for(const name of ['existing','added','leaf'])assert.equal(evaluateOwnedVectorCandidate(row.result.program,name,[value],runtime),!value);
});
test('old/new recursive graphs missing helpers unknown arity forged support and signature changes retain refusals',limits,()=>{
 for(const source of [requestedHelperTS.replace('leaf(value:boolean):boolean{return value;}','leaf(value:boolean):boolean{return added(value);}'),requestedHelperTS.replace('return leaf(value);}','return missing(value);}'),requestedHelperTS.replace('added(value:boolean):boolean{return leaf(value);}','added(value:boolean):boolean{return leaf();}'),requestedHelperTS.replace('leaf(value:boolean):boolean','leaf(value:bigint):boolean')])assert.throws(()=>extend(helperAppendFixture(),{sourcePath:JS,typescriptPath:TS,typescript:source}));
 assert.throws(()=>extend(helperAppendFixture(),{sourcePath:JS,typescriptPath:TS,typescript:requestedHelperTS,supportProgram:[]}));assert.throws(()=>proposeOwnedPrimitiveFunctionReconciliation(helperAppendFixture(),{sourcePath:JS,typescriptPath:TS,typescript:'export function existing(value:boolean):boolean{return added(value);}export function added(value:boolean):boolean{return leaf(value);}'}));
});
test('four complete existing helper append equations retain originals inverses and the two fixed phases',limits,()=>{
 const plan=prepareExistingHelperAppendSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});

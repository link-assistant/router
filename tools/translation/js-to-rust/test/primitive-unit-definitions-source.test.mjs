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
import {preparePrimitiveUnitDefinitionsSources} from '../../prepare-primitive-unit-definitions-sources.mjs';
import {proposeOwnedPrimitiveFunctionInsertion} from '../owned-primitive-function-insertion.mjs';
import {proposeOwnedPrimitiveFunctionExtension} from '../owned-primitive-function-extension.mjs';
import {proposeOwnedVectorBulkModuleSynchronization} from '../owned-vector-bulk-module-synchronization.mjs';
const unitDefinitions='export function empty():void{}\nexport function explicit():void{return;}\nexport function branch(flag:boolean):void{if(flag){return;}else{return;}}\nexport function guard(flag:boolean):void{if(flag){return;}}';
function unitDefinition(typed=unitDefinitions){const pair=prepareOwnedVectorModulePair(JS,TS,typed),input=data('pub fn native_anchor()->bool{true}',pair.javascript.source,typed);input.vectorBindings=[];input.primitiveOperators=true;input.primitiveDefinitions=true;const context=createOwnedVectorCandidateContext(input),result=translateOwnedVectorCandidate(pair.javascript.source,{context,sourcePath:JS,typescriptOutputPath:TS});return {input,context,result};}
test('actual written void definitions preserve empty explicit branch and guarded unit behavior through strict paired targets',limits,async t=>{
 const row=unitDefinition(),getters=await insertionTargets(t,row);assert.equal(row.result.program.length,4);assert.ok(row.result.program.every(item=>item.returns==='unit'&&item.resultRoot===null));assert.equal(parseOwnedVectorCandidateMeta(row.result.meta,{context:row.context}).length,4);
 for(const get of getters){assert.equal(get('empty'),undefined);assert.equal(get('explicit'),undefined);for(const flag of [true,false]){assert.equal(get('branch',flag),undefined);assert.equal(get('guard',flag),undefined);}}assert.equal(row.result.runtimeParity,false);
});
test('JavaScript JSDoc void source supplies its own actual unit return profile',limits,async()=>{
 const source='/** @returns {void} */\nexport function empty(){}\n/** @param {boolean} flag @returns {void} */\nexport function guard(flag){if(flag){return;}}',input=data('pub fn native_anchor()->bool{true}',source,'');input.files=input.files.filter(row=>row.path!==TS);input.vectorBindings=[];input.primitiveOperators=true;input.primitiveDefinitions=true;const context=createOwnedVectorCandidateContext(input),result=translateOwnedVectorCandidate(source,{context,sourcePath:JS,typescriptOutputPath:TS}),runtime=await prepareOwnedVectorCandidateRuntime(result.program);assert.equal(evaluateOwnedVectorCandidate(result.program,'empty',[],runtime),undefined);for(const flag of [true,false])assert.equal(evaluateOwnedVectorCandidate(result.program,'guard',[flag],runtime),undefined);
});
test('pure Boolean helpers can supply a unit guard condition without discarding a unit helper effect',limits,async()=>{
 const row=unitDefinition('export function guard(flag:boolean):void{if(identity(flag)){return;}}\nexport function identity(flag:boolean):boolean{return flag;}'),runtime=await prepareOwnedVectorCandidateRuntime(row.result.program);for(const flag of [true,false])assert.equal(evaluateOwnedVectorCandidate(row.result.program,'guard',[flag],runtime),undefined);
});
test('source-only primitive guard continuation also supports nonunit complete scalar results',limits,async()=>{
 const row=unitDefinition('export function select(flag:boolean,value:boolean):boolean{if(flag){return value;}return false;}'),runtime=await prepareOwnedVectorCandidateRuntime(row.result.program);for(const flag of [true,false])for(const value of [true,false])assert.equal(evaluateOwnedVectorCandidate(row.result.program,'select',[flag,value],runtime),flag?value:false);
});
test('unit inference wrong domains undefined values discarded effects and partial scalar flow retain refusals',limits,()=>{
 for(const typed of ['export function inferred(){}','export function wrong():boolean{return;}','export function wrong():void{return true;}','export function undefined_value():void{return undefined;}','export function effect():void{console.log("changed");}','export function helper():void{return;}export function caller():void{helper();}','export function partial(flag:boolean):boolean{if(flag){return true;}}'])assert.throws(()=>unitDefinition(typed));
 const row=unitDefinition(),input=structuredClone(row.input);delete input.primitiveDefinitions;const context=createOwnedVectorCandidateContext(input);assert.throws(()=>parseOwnedVectorCandidateMeta(row.result.meta,{context}));
});
function emptyUnitDefinitionFixture(nonempty){const input=data('pub mod target {'+(nonempty?'pub fn existing(value:bool)->bool{value}':'')+'}',nonempty?'export function existing(value){return value;}':'',nonempty?'export function existing(value:boolean):boolean{return value;}':'');input.vectorBindings=nonempty?[{javascriptPath:JS,javascriptName:'existing',rustPath:'src/lib.rs',rustName:'target.existing'}]:[];return input;}
for(const nonempty of [false,true])test('actual typed unit definitions append complete native unit bodies in '+(nonempty?'nonempty':'empty')+' module and repeat canonically',limits,async()=>{
 const input=emptyUnitDefinitionFixture(nonempty),request={sourcePath:JS,typescriptPath:TS,nativeRoute:{rustPath:'src/lib.rs',module:['target']},typescript:(nonempty?'export function existing(value:boolean):boolean{return value;}\n':'')+unitDefinitions},plan=(nonempty?proposeOwnedPrimitiveFunctionExtension:proposeOwnedPrimitiveFunctionInsertion)(input,request),files=new Map(input.files.map(row=>[row.path,row.source]));for(const output of plan.outputs)files.set(output.path,output.after);const next={...input,vectorBindings:plan.bindings,files:[...files].map(([path,source])=>({path,source}))},context=createOwnedVectorCandidateContext(next),result=translateOwnedVectorCandidate(files.get(JS),{context,sourcePath:JS,typescriptOutputPath:TS}),runtime=await prepareOwnedVectorCandidateRuntime(result.program);assert.equal(plan.bindings.length,nonempty?5:4);assert.equal(evaluateOwnedVectorCandidate(result.program,'empty',[],runtime),undefined);for(const flag of [true,false])assert.equal(evaluateOwnedVectorCandidate(result.program,'guard',[flag],runtime),undefined);
 const repeated=proposeOwnedVectorBulkModuleSynchronization(next,[{sourcePath:JS,typescriptPath:TS,typescript:files.get(TS)}]);assert.deepEqual(repeated.nativeEdits,[]);assert.equal(plan.rustExecuted,false);
});
test('bulk unit source groups insert without native placeholders and preserve whole paired inverses',limits,()=>{
 const input=emptyUnitDefinitionFixture(false),plan=proposeOwnedVectorBulkModuleSynchronization(input,[{sourcePath:JS,typescriptPath:TS,nativeRoute:{rustPath:'src/lib.rs',module:['target']},typescript:unitDefinitions}]);assert.equal(plan.nativeEdits.length,1);assert.equal(plan.modules[0].bindings.length,4);assert.ok(!plan.nativeEdits[0].after.includes('unimplemented!'));for(const output of plan.outputs)assert.equal(output.inverse,output.before);assert.equal(plan.runtimeParity,false);
});
test('six complete written unit definition equations preserve full originals inverses and phases',limits,()=>{
 const plan=preparePrimitiveUnitDefinitionsSources();assert.equal(plan.files.length,6);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});

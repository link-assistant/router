// Complete nonempty receiving unit function extension drafts. ALL UNRUN.
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

import {proposeOwnedPrimitiveFunctionExtension,inspectOwnedPrimitiveFunctionExtension} from '../owned-primitive-function-extension.mjs';
import {preparePrimitiveFunctionExtensionSources} from '../../prepare-primitive-function-extension-sources.mjs';
import {PRIMITIVE_BITWISE_TYPES} from '../../primitive-bitwise-types.mjs';

const extensionRoute={rustPath:'src/lib.rs',module:['target']};
function fixture(native='bool'){const typed=native==='bool'?'export function existing(value:boolean):boolean{return value;}':'import type {RustU64} from "../runtime/primitive-operator-runtime.mjs";\nexport function existing(value:RustU64):RustU64{return value;}',input=data('pub fn untouched()->bool{false}\npub mod target {pub fn existing(value:'+native+')->'+native+'{value}}','export function existing(value){return value;}',typed);input.vectorBindings=[{javascriptPath:JS,javascriptName:'existing',rustPath:'src/lib.rs',rustName:'target.existing'}];return input;}
function install(input,plan){const files=new Map(input.files.map(row=>[row.path,row.source]));for(const row of plan.outputs)files.set(row.path,row.after);return {...input,vectorBindings:[...input.vectorBindings.filter(row=>row.javascriptPath!==JS),...plan.bindings],files:[...files].map(([path,source])=>({path,source}))};}
function checked(input){const context=createOwnedVectorCandidateContext(input),result=translateOwnedVectorCandidate(input.files.find(row=>row.path===JS).source,{context,sourcePath:JS,typescriptOutputPath:TS});return {input,context,result};}
const requestedJavaScript='export function existing(value){return !value;}\n/** @param {boolean} value */\nexport function added(value){return value;}',requestedTypeScript='export function existing(value:boolean):boolean{return !value;}\nexport function added(value:boolean):boolean{return value;}';
for(const authority of ['javascript','typescript'])test('nonempty '+authority+' unit extension preserves old function identity and adds a freshly checked primitive function',limits,async t=>{const input=fixture(),request={sourcePath:JS,typescriptPath:TS,nativeRoute:extensionRoute,[authority]:authority==='javascript'?requestedJavaScript:requestedTypeScript},inspection=inspectOwnedPrimitiveFunctionExtension(input,request);assert.deepEqual(inspection.added,['added']);assert.equal(inspection.sourceAuthority,false);const plan=proposeOwnedPrimitiveFunctionExtension(input,request);assert.deepEqual(plan.addedBindings.map(row=>row.rustName),['target.added']);assert.deepEqual(plan.bindings.map(row=>row.rustName).sort(),['target.added','target.existing']);assert.equal(plan.nativeChanges.filter(row=>row.kind==='function-replacement').length,1);assert.equal(plan.nativeChanges.filter(row=>row.kind==='native-function-insertion').length,1);const native=plan.outputs.find(row=>row.path==='src/lib.rs');assert.ok(native.after.includes('pub fn untouched()->bool{false}'));for(const output of plan.outputs)assert.equal(output.inverse,output.before);const next=install(input,plan),row=checked(next),targets=await insertionTargets(t,row);for(const get of targets)for(const value of [true,false]){assert.equal(get('existing',value),!value);assert.equal(get('added',value),value);}const again=proposeOwnedVectorNativeSynchronization(next,{sourcePath:JS,typescriptPath:TS,[authority]:next.files.find(row=>row.path===(authority==='javascript'?JS:TS)).source});assert.deepEqual(again.rustEdits,[]);assert.equal(plan.runtimeParity,false);assert.equal(plan.rustExecuted,false);});
test('JavaScript JSDoc extension merges repeated actual RustU64 type imports without copied type authority',limits,async t=>{const input=fixture('u64'),source='export function existing(value){return value;}\n/** @param {bigint} value */\nexport function added(value){return value;}',plan=proposeOwnedPrimitiveFunctionExtension(input,{sourcePath:JS,typescriptPath:TS,javascript:source});assert.ok(plan.typeHeaderHistory);const next=install(input,plan),row=checked(next),targets=await insertionTargets(t,row);for(const get of targets)for(const value of [0n,1n,18446744073709551615n]){assert.equal(get('existing',value),value);assert.equal(get('added',value),value);}assert.equal(plan.addedBindings.length,1);});
test('one typed source extension adds all ten actual scalar widths in a single complete source proposal',limits,async t=>{const input=fixture(),types='import type {'+PRIMITIVE_BITWISE_TYPES.map(row=>row.alias).join(',')+'} from "../runtime/primitive-operator-runtime.mjs";\n',source=types+requestedTypeScript+'\n'+PRIMITIVE_BITWISE_TYPES.map(row=>'export function identity_'+row.name+'(value:'+row.alias+'):'+row.alias+'{return value;}').join('\n'),plan=proposeOwnedPrimitiveFunctionExtension(input,{sourcePath:JS,typescriptPath:TS,typescript:source});assert.equal(plan.addedBindings.length,11);const row=checked(install(input,plan)),targets=await insertionTargets(t,row);for(const get of targets)for(const type of PRIMITIVE_BITWISE_TYPES)for(const value of [type.signed?-BigInt(type.minimumAbs):0n,BigInt(type.maximum)])assert.equal(get('identity_'+type.name,value),value);});
test('extension keeps deletion duplicate declarations missing helper dependencies and altered routes as explicit refusals',limits,()=>{for(const source of ['export function added(value:boolean):boolean{return value;}','export function existing(value:boolean):boolean{return value;}','export function existing(value:boolean):boolean{return value;}export function added(value:boolean):boolean{return value;}export function added(value:boolean):boolean{return value;}','export function existing(value:boolean):boolean{return value;}export function added(value:boolean):boolean{return unknown(value);}']){const input=fixture();assert.throws(()=>proposeOwnedPrimitiveFunctionExtension(input,{sourcePath:JS,typescriptPath:TS,typescript:source}));}const input=fixture();assert.throws(()=>proposeOwnedPrimitiveFunctionExtension(input,{sourcePath:JS,typescriptPath:TS,nativeRoute:{rustPath:'src/lib.rs',module:['wrong']},typescript:requestedTypeScript}));});
test('two complete nonempty extension source equations preserve all inverses and fixed phases',limits,()=>{const plan=preparePrimitiveFunctionExtensionSources();assert.equal(plan.files.length,2);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});

test('a local native primitive-name alias cannot silently narrow a receiving bigint ABI',limits,()=>{const input=fixture(),source=input.files.find(row=>row.path==='src/lib.rs');source.source=source.source.replace('pub mod target {','pub mod target {type u64=u8;');const javascript='export function existing(value){return value;}\n/** @param {bigint} value */\nexport function added(value){return value;}';assert.throws(()=>proposeOwnedPrimitiveFunctionExtension(input,{sourcePath:JS,typescriptPath:TS,javascript}));});

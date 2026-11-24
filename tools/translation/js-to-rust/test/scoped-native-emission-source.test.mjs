// Scoped native body emission lifecycle and complete closure. ALL UNRUN.
// Complete program validation before native per-function emission. ALL UNRUN.
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
import {ownedCoreRuntimeSources} from '../owned-vector-candidate-source.mjs';
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


import {emitOwnedCoreProgram,withOwnedNativeFunctionBodies} from '../owned-vector-candidate-operations.mjs';
import {emitNativeJsonVectorControlBody} from '../owned-vector-native-json-control.mjs';
import {prepareSelectedNativeBodySources} from '../../prepare-selected-native-body-sources.mjs';
function mixedFixture(){const source='export function helper(flag){return flag;}\nexport function caller(flag){return helper(flag);}\nexport function vectors(seed){return [seed];}',typed='export function helper(flag:boolean):boolean{return flag;}\nexport function caller(flag:boolean):boolean{return helper(flag);}\nexport function vectors(seed:bigint):readonly bigint[]{return [seed];}',rust='pub fn helper(flag:bool)->bool { flag }\npub fn caller(flag:bool)->bool { false }\npub fn vectors(seed:u8)->Vec<u8> { '+C+'vec![seed] }',input=data(rust,source,typed);input.vectorBindings=['helper','caller','vectors'].map(name=>({javascriptPath:JS,javascriptName:name,rustPath:'src/lib.rs',rustName:name}));const context=createOwnedVectorCandidateContext(input),result=translateOwnedVectorCandidate(source,{context,sourcePath:JS,typescriptOutputPath:TS});return {input,context,result};}

import {nativeJsonFunctionSourceBody} from '../owned-vector-native-json-control.mjs';
import {prepareScopedNativeEmissionSources} from '../../prepare-scoped-native-emission-sources.mjs';
test('scoped emission matches separately checked full-program emission for each selected scalar',limits,()=>{const row=mixedFixture(),expected=new Map(['helper','caller'].map(name=>[name,emitOwnedCoreProgram(row.result.program,'rust',{nativeJsonSource:true,selectedFunction:name})]));withOwnedNativeFunctionBodies(row.result.program,emit=>{for(const name of ['caller','helper','caller']){const source=emit(name);assert.equal(source,expected.get(name));assert.equal(nativeJsonFunctionSourceBody(source),emitNativeJsonVectorControlBody(row.result.program.find(item=>item.javascript===name),row.result.program));}});});
test('escaped emission callbacks lose every private program on success and primary failure',limits,()=>{const row=mixedFixture();let escaped;const value=withOwnedNativeFunctionBodies(row.result.program,emit=>{escaped=emit;return 17;});assert.equal(value,17);assert.throws(()=>escaped('caller'),/escaped/u);const primary={sentinel:true};assert.throws(()=>withOwnedNativeFunctionBodies(row.result.program,emit=>{escaped=emit;throw primary;}),error=>error===primary);assert.throws(()=>escaped('helper'),/escaped/u);assert.ok(withOwnedNativeFunctionBodies(row.result.program,emit=>emit('caller')).includes('crate::helper'));});
test('caught selection failures poison their scope and nested independent scopes still close',limits,()=>{const row=mixedFixture();assert.throws(()=>withOwnedNativeFunctionBodies(row.result.program,emit=>{assert.throws(()=>emit('absent'));return 'caught';}),/selected/u);assert.throws(()=>withOwnedNativeFunctionBodies(row.result.program,emit=>{assert.throws(()=>emit('vectors'));return true;}),/canonical JSON/u);const source=withOwnedNativeFunctionBodies(row.result.program,outer=>{const before=outer('caller'),nested=withOwnedNativeFunctionBodies(row.result.program,inner=>inner('helper'));assert.ok(nested.includes('fn helper'));assert.equal(outer('caller'),before);return before;});assert.ok(source.includes('crate::helper'));});
test('scope checks complete closure and every receiving context before invoking callbacks',limits,()=>{const left=mixedFixture(),right=mixedFixture(),caller=left.result.program.find(item=>item.javascript==='caller');let called=false;assert.throws(()=>withOwnedNativeFunctionBodies([caller],()=>{called=true;}));assert.equal(called,false);const mixed=left.result.program.map(item=>item.javascript==='helper'?right.result.program.find(item=>item.javascript==='helper'):item);assert.throws(()=>withOwnedNativeFunctionBodies(mixed,()=>{called=true;}),/mixed receiving contexts/u);assert.equal(called,false);assert.throws(()=>withOwnedNativeFunctionBodies(structuredClone(left.result.program),()=>{called=true;}));assert.equal(called,false);});
test('synchronous result enforcement refuses promises proxies and then accessors without invocation',limits,()=>{const row=mixedFixture();for(const callback of [async()=>{},new Proxy(()=>{},{}),()=>Promise.resolve(null),()=>new Proxy({},{}),()=>({then(){}})])assert.throws(()=>withOwnedNativeFunctionBodies(row.result.program,callback));let reads=0;const result=Object.defineProperty({},'then',{get(){reads++;throw new Error('getter ran');}});assert.throws(()=>withOwnedNativeFunctionBodies(row.result.program,()=>result));assert.equal(reads,0);const inherited=Object.create({get then(){reads++;throw new Error('inherited getter ran');}});assert.equal(withOwnedNativeFunctionBodies(row.result.program,()=>inherited),inherited);assert.equal(reads,0);});
test('nesting limits release all private scopes and permit a fresh complete operation',limits,()=>{const row=mixedFixture();function recurse(){return withOwnedNativeFunctionBodies(row.result.program,()=>recurse());}assert.throws(recurse,/bounded nested/u);assert.ok(withOwnedNativeFunctionBodies(row.result.program,emit=>emit('helper')).includes('fn helper'));});
test('native whole-program synchronization retains its independent source reprojection',limits,()=>{const row=mixedFixture(),proposal=proposeOwnedVectorNativeSynchronization(row.input,{sourcePath:JS,typescriptPath:TS,javascript:row.input.files.find(file=>file.path===JS).source}),project=forward(row,proposal);assert.equal(proposal.selectedFunctions.length,3);assert.ok(project.executableDeclarations.some(item=>item.qualifiedName==='caller'));assert.equal(proposal.runtimeParity,false);assert.equal(proposal.rustExecuted,false);assert.equal(proposal.receivingExecuted,false);});
test('five complete scope source equations retain independent inverses and the fixed phases',limits,()=>{const plan=prepareScopedNativeEmissionSources();assert.equal(plan.files.length,5);for(const file of plan.files){assert.equal(file.current,file.currentAfter);assert.equal(file.inverse,file.before);assert.deepEqual(file.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});

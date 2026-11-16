// Ordered original scalar match normalization and whole paired source. ALL UNRUN.
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



import {PRIMITIVE_BITWISE_TYPES} from '../../primitive-bitwise-types.mjs';
import {proposeOwnedNativeBulkDiscovery} from '../owned-native-bulk-discovery.mjs';
import {prepareNativeOrderedScalarsSources} from '../../prepare-native-ordered-scalars-sources.mjs';
function orderedFixture(domain){const imports='import type {'+domain.alias+'} from "../runtime/primitive-operator-runtime.mjs";\n',source='export function text_match(text){if(text==="ab"){return 1n;}else{if(text==="cd"){return 2n;}else{return 3n;}}}\nexport function local_match(text){const selected=text==="ab"?1n:(text==="cd"?2n:3n);return selected;}\nexport function bool_match(flag,value){if(flag===true){return value;}else{return 0n;}}',typed=imports+'export function text_match(text:string):'+domain.alias+'{if(text==="ab"){return 1n;}else{if(text==="cd"){return 2n;}else{return 3n;}}}\nexport function local_match(text:string):'+domain.alias+'{const selected:'+domain.alias+'=text==="ab"?1n:(text==="cd"?2n:3n);return selected;}\nexport function bool_match(flag:boolean,value:'+domain.alias+'):'+domain.alias+'{if(flag===true){return value;}else{return 0n;}}',rust='pub fn text_match(text:&str)->'+domain.name+'{match text {"ab"=>1_'+domain.name+',"cd"=>2_'+domain.name+',_=>3_'+domain.name+'}}\npub fn local_match(text:&str)->'+domain.name+'{let selected=match text {"ab"=>1_'+domain.name+',"cd"=>2_'+domain.name+',_=>3_'+domain.name+'};selected}\npub fn bool_match(flag:bool,value:'+domain.name+')->'+domain.name+'{match flag {true=>value,_=>0_'+domain.name+'}}',input=data(rust,source,typed);input.vectorBindings=['text_match','local_match','bool_match'].map(name=>({javascriptPath:JS,javascriptName:name,rustPath:'src/lib.rs',rustName:name}));const context=createOwnedVectorCandidateContext(input),result=translateOwnedVectorCandidate(source,{context,sourcePath:JS,typescriptOutputPath:TS});return {input,context,result};}
for(const domain of PRIMITIVE_BITWISE_TYPES)test('ordered native text/bool tail and local scalar matches preserve '+domain.name,limits,async()=>{const row=orderedFixture(domain),runtime=await prepareOwnedVectorCandidateRuntime(row.result.program),minimum=domain.signed?-BigInt(domain.minimumAbs):0n,maximum=BigInt(domain.maximum);let project;for(const authority of ['javascript','typescript']){const proposal=proposeOwnedVectorNativeSynchronization(row.input,{sourcePath:JS,typescriptPath:TS,[authority]:row.input.files.find(file=>file.path===(authority==='javascript'?JS:TS)).source});assert.equal(proposal.selectedFunctions.length,3);project=forward(row,proposal);for(const item of row.result.program){const entry=project.executableDeclarations.find(entry=>entry.qualifiedName===item.javascript);assert.ok(entry);assert.deepEqual(actualNativeJsonVectorTree(entry.checkedSource().declaration,item,entry.lower()),requestedNativeJsonVectorTree(item));}assert.equal(proposal.rustExecuted,false);}
 await verifyTypedTargets(project,api=>{for(const text of ['ab','cd','','abc','Ω😀']){const expected=text==='ab'?1n:text==='cd'?2n:3n;assert.equal(api.text_match(text),expected);assert.equal(api.local_match(text),expected);assert.equal(evaluateOwnedVectorCandidate(row.result.program,'text_match',[text],runtime),expected);}for(const value of [minimum,0n,maximum])for(const flag of [true,false])assert.equal(api.bool_match(flag,value),flag?value:0n);},{childTimeoutMs:20000});
});
test('automatic module projection proposes complete ordered primitive fallback functions',limits,()=>{const row=orderedFixture(PRIMITIVE_BITWISE_TYPES.find(type=>type.name==='u64'));row.input.files=row.input.files.filter(file=>file.path!==JS&&file.path!==TS);row.input.vectorBindings=[];const proposal=proposeOwnedNativeBulkDiscovery(row.input);assert.equal(proposal.modules.length,1);assert.equal(proposal.modules[0].bindings.length,3);assert.equal(proposal.refusals.length,0);assert.ok(proposal.modules[0].outputs.some(row=>row.after.includes('if (')));assert.equal(proposal.runtimeParity,false);});
test('ordered scalar branches still refuse mismatched receiving values and detached requested carriers',limits,()=>{const row=orderedFixture(PRIMITIVE_BITWISE_TYPES[0]),changed=structuredClone(row.input);changed.files.find(file=>file.path===JS).source=changed.files.find(file=>file.path===JS).source.replace('return 1n;','return "wrong";');assert.throws(()=>proposeOwnedVectorNativeSynchronization(changed,{sourcePath:JS,typescriptPath:TS,javascript:changed.files.find(file=>file.path===JS).source}));assert.throws(()=>emitOwnedVectorCandidateRust(structuredClone(row.result.program)));});
test('four complete ordered scalar equations retain full copied sources and two phases',limits,()=>{const plan=prepareNativeOrderedScalarsSources();assert.equal(plan.files.length,4);for(const file of plan.files){assert.equal(file.current,file.currentAfter);assert.equal(file.inverse,file.before);assert.deepEqual(file.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});

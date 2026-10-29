// Total native primitive operation bulk rules. SOURCE ONLY; ALL UNRUN.
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
import {proposeOwnedNativeBulkModuleRefresh} from '../owned-native-bulk-module-refresh.mjs';
import {prepareNativeTotalOperatorsSources} from '../../prepare-native-total-operators-sources.mjs';
const operators='import {primitiveBitwise as bits,primitiveNot as complement,integerCast as cast} from "../runtime/primitive-operator-runtime.mjs";\n';
function operatorFixture(domain){
 const alias=domain.alias,annotations='import type {'+alias+'} from "../runtime/primitive-operator-runtime.mjs";\n';
 const functions=[...['&','|','^'].map((op,index)=>({name:'bit_'+index,js:'(left,right){return bits(left,right,"'+op+'",'+domain.bits+','+domain.signed+');}',typed:'(left:'+alias+',right:'+alias+'): '+alias+'{return bits(left,right,"'+op+'",'+domain.bits+','+domain.signed+');}',rust:'(left:'+domain.name+',right:'+domain.name+')->'+domain.name+'{left '+op+' right}'})),{name:'invert',js:'(value){return complement(value,'+domain.bits+','+domain.signed+');}',typed:'(value:'+alias+'): '+alias+'{return complement(value,'+domain.bits+','+domain.signed+');}',rust:'(value:'+domain.name+')->'+domain.name+'{!value}'},{name:'identity_cast',js:'(value){return cast(value,'+domain.bits+','+domain.signed+','+domain.bits+','+domain.signed+');}',typed:'(value:'+alias+'): '+alias+'{return cast(value,'+domain.bits+','+domain.signed+','+domain.bits+','+domain.signed+');}',rust:'(value:'+domain.name+')->'+domain.name+'{value}'}];
 const source=operators+functions.map(row=>'export function '+row.name+row.js).join('\n'),typed=annotations+operators+functions.map(row=>'export function '+row.name+row.typed).join('\n'),rust=functions.map(row=>'pub fn '+row.name+row.rust).join('\n'),input=data(rust,source,typed);input.vectorBindings=functions.map(row=>({javascriptPath:JS,javascriptName:row.name,rustPath:'src/lib.rs',rustName:row.name}));const context=createOwnedVectorCandidateContext(input),result=translateOwnedVectorCandidate(source,{context,sourcePath:JS,typescriptOutputPath:TS});return {input,context,result};
}
for(const domain of PRIMITIVE_BITWISE_TYPES)test('total fixed operators preserve '+domain.name+' ABI and native whole-body synchronization',limits,async()=>{
 const row=operatorFixture(domain),runtime=await prepareOwnedVectorCandidateRuntime(row.result.program),minimum=domain.signed?-BigInt(domain.minimumAbs):0n,maximum=BigInt(domain.maximum),samples=[minimum,0n,maximum];
 for(const left of samples)for(const right of samples)for(const [name,op]of [['bit_0','&'],['bit_1','|'],['bit_2','^']]){const expected=op==='&'?left&right:op==='|'?left|right:left^right;assert.equal(evaluateOwnedVectorCandidate(row.result.program,name,[left,right],runtime),expected);}
 for(const value of samples){const expected=domain.signed?BigInt.asIntN(domain.bits,~value):BigInt.asUintN(domain.bits,~value);assert.equal(evaluateOwnedVectorCandidate(row.result.program,'invert',[value],runtime),expected);assert.equal(evaluateOwnedVectorCandidate(row.result.program,'identity_cast',[value],runtime),value);}
 let project;for(const authority of ['javascript','typescript']){const proposal=proposeOwnedVectorNativeSynchronization(row.input,{sourcePath:JS,typescriptPath:TS,[authority]:row.input.files.find(file=>file.path===(authority==='javascript'?JS:TS)).source});project=forward(row,proposal);assert.equal(proposal.selectedFunctions.length,5);assert.equal(project.executableDeclarations.filter(entry=>['bit_0','bit_1','bit_2','invert','identity_cast'].includes(entry.qualifiedName)).length,5);assert.equal(proposal.rustExecuted,false);}
 await verifyTypedTargets(project,api=>{for(const left of samples)for(const right of samples){assert.equal(api.bit_0(left,right),left&right);assert.equal(api.bit_1(left,right),left|right);assert.equal(api.bit_2(left,right),left^right);}for(const value of samples){assert.equal(api.identity_cast(value),value);assert.equal(api.invert(value),domain.signed?BigInt.asIntN(domain.bits,~value):BigInt.asUintN(domain.bits,~value));}},{childTimeoutMs:20000});
});
test('every fixed-width cast pairing is automatically proposed from actual Rust operators',limits,()=>{for(const inputType of PRIMITIVE_BITWISE_TYPES){const rust=PRIMITIVE_BITWISE_TYPES.map(target=>'pub fn cast_'+target.name+'(value:'+inputType.name+')->'+target.name+' { value as '+target.name+' }').join('\n'),input=data(rust,'','');input.files=input.files.filter(row=>row.path!==JS&&row.path!==TS);input.vectorBindings=[];const proposal=proposeOwnedNativeBulkDiscovery(input);assert.equal(proposal.modules.length,1);assert.equal(proposal.modules[0].bindings.length,10);assert.equal(proposal.refusals.length,0);assert.equal(proposal.runtimeParity,false);}});
test('eager boolean bitwise remains distinct from short-circuit logic in automatic source projection',limits,()=>{const input=data('pub fn eager(left:bool,right:bool)->bool{left & right}\npub fn lazy(left:bool,right:bool)->bool{left && right}','','');input.files=input.files.filter(row=>row.path!==JS&&row.path!==TS);input.vectorBindings=[];const proposal=proposeOwnedNativeBulkDiscovery(input);assert.equal(proposal.modules.length,1);const source=proposal.modules[0].outputs.find(row=>row.path.endsWith('.mjs')).source;assert.ok(source.includes('primitiveBitwise'));assert.ok(source.includes('&&'));assert.equal(proposal.modules[0].bindings.length,2);});
test('total-operator helper closure retains wide actual native parameter and return types',limits,()=>{const domain=PRIMITIVE_BITWISE_TYPES.find(row=>row.name==='u128'),row=operatorFixture(domain),source=row.input.files.find(file=>file.path===JS),typed=row.input.files.find(file=>file.path===TS),native=row.input.files.find(file=>file.path==='src/lib.rs');source.source+='\nexport function caller(left,right){return bit_2(left,right);}';typed.source+='\nexport function caller(left:RustU128,right:RustU128):RustU128{return bit_2(left,right);}';native.source+='\npub fn caller(left:u128,right:u128)->u128 { 0_u128 }';row.input.vectorBindings.push({javascriptPath:JS,javascriptName:'caller',rustPath:'src/lib.rs',rustName:'caller'});const proposal=proposeOwnedVectorNativeSynchronization(row.input,{sourcePath:JS,typescriptPath:TS,javascript:source.source});assert.ok(proposal.rustEdits[0].after.includes('crate::bit_2(left, right)'));assert.equal(proposal.selectedFunctions.length,6);});
test('arithmetic and shifts retain their separate effect rules and malformed metadata refuses',limits,()=>{const row=operatorFixture(PRIMITIVE_BITWISE_TYPES[0]),source=row.input.files.find(file=>file.path===JS);for(const change of [text=>text.replace('"&",8,false','"&",16,false'),text=>text.replace('"&",8,false','"&",8,true'),text=>text.replace('primitiveNot as complement','integerArithmetic as complement')]){const input=structuredClone(row.input);input.files.find(file=>file.path===JS).source=change(source.source);assert.throws(()=>proposeOwnedVectorNativeSynchronization(input,{sourcePath:JS,typescriptPath:TS,javascript:input.files.find(file=>file.path===JS).source}));}const forged=structuredClone(row.result.program);forged[0].body[0].value.bits=16;assert.throws(()=>emitOwnedVectorCandidateRust(forged));});
test('seven complete total-operation source equations retain original copies and exact phases',limits,()=>{const plan=prepareNativeTotalOperatorsSources();assert.equal(plan.files.length,7);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});

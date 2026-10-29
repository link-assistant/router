// Finite division/remainder source round trips. ALL UNRUN.
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

import {PRIMITIVE_BITWISE_TYPES} from '../../primitive-bitwise-types.mjs';
import {proposeOwnedVectorBulkModuleSynchronization} from '../owned-vector-bulk-module-synchronization.mjs';
import {proposeOwnedNativeBulkDiscovery} from '../owned-native-bulk-discovery.mjs';
import {requireOwnedNativeClosedCall as oldClosed,nativeFailureEventOperation as oldEvent} from '../owned-native-closed-operators.mjs';
import {requireOwnedNativeClosedCall,nativeFailureEventOperation,projectNativeFailureCall} from '../owned-native-division-operators.mjs';
import {emitOwnedPrimitiveOperatorCall,emitOwnedNativePrimitiveOperatorCall} from '../owned-primitive-operator-emission.mjs';
import {primitiveFailureFlow,primitiveFailureFlowWithDivision} from '../../extensions/primitive-failure-flow.mjs';
import {preparePrimitiveDivisionRoundtripSources} from '../../prepare-primitive-division-roundtrip-sources.mjs';
const operationImport='import {integerArithmetic as math} from "../runtime/primitive-operator-runtime.mjs";\n';
function fixture(domain,operation,{guarded=false,vector=false,unused=false,nested=false}={}){
 const call=(left='left',right='right')=>'math('+left+','+right+','+domain.bits+','+domain.signed+',"'+operation+'")',left=nested?'math(left,1n,'+domain.bits+','+domain.signed+',"add")':'left',value=call(left),native='('+ (nested?'(left+1_'+domain.name+')':'left')+(operation==='div'?'/':'%')+'right)',body=(unused?'const discarded='+value+';':'')+'return '+(vector?'['+(guarded?'flag?'+value+':left':value)+',right]':guarded?'flag?'+value+':left':value)+';',nativeResult=vector?'crate::translation_core::vec!['+(guarded?'if flag {'+native+'}else{left}':native)+',right]':guarded?'if flag {'+native+'}else{left}':native,rust='pub fn values(left:'+domain.name+',right:'+domain.name+',flag:bool)->'+(vector?'Vec<'+domain.name+'>':domain.name)+'{'+(unused?'let discarded='+native+';':'')+nativeResult+'}';
 return translate(rust,operationImport+'export function values(left,right,flag){'+body+'}','import type {'+domain.alias+'} from "../runtime/primitive-operator-runtime.mjs";\n'+operationImport+'export function values(left:'+domain.alias+',right:'+domain.alias+',flag:boolean):'+(vector?'readonly '+domain.alias+'[]':domain.alias)+'{'+body+'}');
}
const zeroMessage=operation=>operation==='div'?'attempt to divide by zero':'attempt to calculate the remainder with a divisor of zero';
const overflowMessage=operation=>operation==='div'?'attempt to divide with overflow':'attempt to calculate the remainder with overflow';
for(const domain of PRIMITIVE_BITWISE_TYPES)for(const operation of ['div','rem'])test(domain.name+' '+operation+' retains exact typed native round trips and independent targets',limits,async t=>{
 const row=fixture(domain,operation),plan=proposeOwnedVectorNativeSynchronization(row.input,{sourcePath:JS,typescriptPath:TS,typescript:row.result.typescript});assert.equal(plan.selectedFunctions.length,1);assert.equal(plan.rustExecuted,false);assert.equal(plan.rustEdits.some(edit=>edit.after.includes('assert!(')),false);
 for(const get of await insertionTargets(t,row)){assert.equal(get('values',7n,3n,true),operation==='div'?2n:1n);assert.throws(()=>get('values',7n,0n,true),error=>error.message===zeroMessage(operation));if(domain.signed){assert.equal(get('values',-7n,3n,true),operation==='div'?-2n:-1n);assert.equal(get('values',7n,-3n,true),operation==='div'?-2n:1n);assert.throws(()=>get('values',-BigInt(domain.minimumAbs),-1n,true),error=>error.message===overflowMessage(operation));}}
 const project=forward(row,plan);await verifyTypedTargets(project,api=>{assert.equal(api.values(7n,3n,true),operation==='div'?2n:1n);assert.throws(()=>api.values(7n,0n,true),error=>error.message===zeroMessage(operation));},{childTimeoutMs:20000});
});
test('guarded division and remainder stay in selected scalar/vector continuations',limits,async t=>{
 for(const operation of ['div','rem'])for(const vector of [false,true]){const row=fixture(PRIMITIVE_BITWISE_TYPES.find(row=>row.name==='i8'),operation,{guarded:true,vector});proposeOwnedVectorNativeSynchronization(row.input,{sourcePath:JS,typescriptPath:TS,typescript:row.result.typescript});for(const get of await insertionTargets(t,row)){assert.deepEqual(get('values',-128n,0n,false),vector?[-128n,0n]:-128n);assert.throws(()=>get('values',-128n,0n,true),error=>error.message===zeroMessage(operation));assert.throws(()=>get('values',-128n,-1n,true),error=>error.message===overflowMessage(operation));}}
});
test('left operand failures precede zero checks and unused division still executes',limits,async t=>{
 for(const operation of ['div','rem'])for(const options of [{nested:true},{unused:true}]){const row=fixture(PRIMITIVE_BITWISE_TYPES.find(row=>row.name==='u8'),operation,options);proposeOwnedVectorNativeSynchronization(row.input,{sourcePath:JS,typescriptPath:TS,typescript:row.result.typescript});for(const get of await insertionTargets(t,row)){assert.throws(()=>get('values',255n,0n,false),error=>error.message===(options.nested?'attempt to add with overflow':zeroMessage(operation)));assert.equal(get('values',6n,2n,false),options.nested?operation==='div'?3n:1n:operation==='div'?3n:0n);}}
});
test('bulk native discovery and module synchronization share the division rule family',limits,()=>{
 const row=fixture(PRIMITIVE_BITWISE_TYPES.find(row=>row.name==='u8'),'div',{vector:true}),bulk=proposeOwnedVectorBulkModuleSynchronization(row.input,[{sourcePath:JS,typescriptPath:TS,typescript:row.result.typescript}]),discovery=proposeOwnedNativeBulkDiscovery(row.input);assert.equal(bulk.modules[0].bindings.length,1);assert.ok(discovery.modules.some(module=>module.bindings.some(binding=>binding.rustName==='values')));assert.equal(bulk.runtimeParity,false);assert.equal(discovery.receivingExecuted,false);
});
test('old closed APIs keep division refused while additive finite event descriptors keep it fallible',limits,()=>{
 const arg={kind:'integer',value:'1',type:'u8',root:null};
 for(const operation of ['div','rem']){const value={kind:'primitive-arithmetic-call',name:'integerArithmetic',args:[arg,arg],operation,type:'u8',bits:8,signed:false,root:null};assert.throws(()=>oldClosed(value));assert.throws(()=>oldEvent('primitive-failure:arithmetic:'+operation+':u8'));assert.equal(requireOwnedNativeClosedCall(value),value);const descriptor=nativeFailureEventOperation('primitive-failure:arithmetic:'+operation+':u8');assert.equal(descriptor.arity,2);assert.equal(projectNativeFailureCall(descriptor,['left','right'],{imported:()=> 'math'}),'math(left, right, 8, false, '+JSON.stringify(operation)+')');}
});
test('source-roundtrip emitter evaluates arguments once in order and original emitter stays exact',limits,()=>{
 const arg=name=>({kind:'variable',name,type:'i8',root:null});
 for(const operation of ['div','rem']){const node={kind:'primitive-arithmetic-call',name:'integerArithmetic',args:[arg('left'),arg('right')],operation,type:'i8',bits:8,signed:true,root:null},visits=[],options=()=>{let index=0;return {rust:true,expression:value=>{visits.push(value.name);return value.name;},argumentName:()=> '__ro_arg_'+index++};},source=emitOwnedNativePrimitiveOperatorCall(node,options());assert.deepEqual(visits,['left','right']);assert.ok(source.includes(operation==='div'?' / ':' % '));assert.equal(source.includes('assert!'),false);assert.equal(source.includes('Option::expect'),false);assert.ok(emitOwnedPrimitiveOperatorCall(node,options()).includes('assert!'));assert.throws(()=>emitOwnedNativePrimitiveOperatorCall({...node,bits:16},options()));}
});
test('old original native observer remains exact and new observer rejects borrowed or mixed-width operands',limits,()=>{
 const type={kind:'fixed',rustPrimitiveName:'u8',rustSourceType:true,bits:8,signed:false},arg={k:'var',name:'left',type},node={k:'binary',op:'div',semantics:'checked',type,left:arg,right:{...arg,name:'right'}};assert.equal(primitiveFailureFlow(node),null);assert.equal(primitiveFailureFlowWithDivision(node).operation,'div');assert.throws(()=>primitiveFailureFlowWithDivision({...node,right:{...arg,type:{...type,rustPrimitiveName:'u16',bits:16}}}));assert.throws(()=>primitiveFailureFlowWithDivision({...node,left:{...arg,type:{...type,rustReference:{kind:'shared',pointee:type}}}}));assert.throws(()=>primitiveFailureFlowWithDivision({...node,semantics:'wrapping'}));
});
test('nineteen complete division equations retain source inverses and exactly the declared phases',limits,()=>{
 const plan=preparePrimitiveDivisionRoundtripSources();assert.equal(plan.files.length,19);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});

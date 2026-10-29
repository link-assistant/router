// Ordered primitive failure body, receiving and independent runtime cases. ALL UNRUN.
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
import {overflowMessage} from '../../vendor/meta-language/translation/aborts.js';
import {proposeOwnedVectorBulkModuleSynchronization} from '../owned-vector-bulk-module-synchronization.mjs';
import {proposeOwnedPrimitiveFunctionInsertion} from '../owned-primitive-function-insertion.mjs';
import {proposeOwnedPrimitiveFunctionExtension} from '../owned-primitive-function-extension.mjs';
import {requestedNativeJsonVectorTree} from '../owned-vector-native-json-control.mjs';
import {requestedNativeFailureOperator,nativeFailureEventOperation,projectNativeFailureCall,requireOwnedNativeClosedCall} from '../owned-native-closed-operators.mjs';
import {ownedNativeTotalOperator,requireOwnedNativeTotalCall} from '../owned-native-total-operators.mjs';
import {prepareOrderedPrimitiveFailureSources} from '../../prepare-ordered-primitive-failure-sources.mjs';
const operationImport='import {integerArithmetic as math,primitiveIntegerMethod as method} from "../runtime/primitive-operator-runtime.mjs";\n';
function typeImport(domain){return 'import type {'+domain.alias+'} from "../runtime/primitive-operator-runtime.mjs";\n';}
function arithmetic(domain,operation,left='left',right='right'){return 'math('+left+','+right+','+domain.bits+','+domain.signed+',"'+operation+'")';}
function fixture(domain,operation,{unused=false,branch=false}={}){
 const body=(typed=false)=>'{'+(branch?'if(flag){':'')+(unused?'const unused='+arithmetic(domain,operation)+';return left;':'return '+arithmetic(domain,operation)+';')+(branch?'}else{return left;}':'')+'}',args='left,right'+(branch?',flag':''),typedArgs='left:'+domain.alias+',right:'+domain.alias+(branch?',flag:boolean':''),source=operationImport+'export function values('+args+')'+body(),typed=typeImport(domain)+operationImport+'export function values('+typedArgs+'):'+domain.alias+body(true),rust='pub fn values(left:'+domain.name+',right:'+domain.name+(branch?',flag:bool':'')+')->'+domain.name+'{'+(branch?'if flag {':'')+(unused?'let unused=left '+({add:'+',sub:'-',mul:'*'}[operation])+' right;left':'left '+({add:'+',sub:'-',mul:'*'}[operation])+' right')+(branch?'}else{left}':'')+'}';
 return translate(rust,source,typed);
}
for(const domain of PRIMITIVE_BITWISE_TYPES)for(const operation of ['add','sub','mul'])test(domain.name+' '+operation+' source body failure event survives ordinary native synchronization and both paired targets',limits,async t=>{
 const row=fixture(domain,operation),tree=requestedNativeJsonVectorTree(row.result.program[0]);assert.equal(tree[0].length,1);assert.equal(tree[0][0][0],'primitive-failure:arithmetic:'+operation+':'+domain.name);const proposal=proposeOwnedVectorNativeSynchronization(row.input,{sourcePath:JS,typescriptPath:TS,typescript:row.result.typescript});assert.equal(proposal.selectedFunctions.length,1);assert.equal(proposal.rustExecuted,false);assert.equal(proposal.runtimeParity,false);
 const targets=await insertionTargets(t,row),maximum=BigInt(domain.maximum),minimum=domain.signed?-BigInt(domain.minimumAbs):0n,success=operation==='add'?5n:operation==='sub'?1n:6n;for(const get of targets){assert.equal(get('values',3n,2n),success);const left=operation==='sub'?minimum:maximum,right=operation==='sub'||operation==='add'?1n:2n;assert.throws(()=>get('values',left,right),error=>error instanceof RangeError&&error.message===overflowMessage(operation));}
});
test('unused checked local and branch-specific failure keep their complete ordered body and guarded execution',limits,async t=>{
 const domain=PRIMITIVE_BITWISE_TYPES.find(row=>row.name==='u8'),row=fixture(domain,'add',{unused:true,branch:true}),tree=requestedNativeJsonVectorTree(row.result.program[0]);assert.equal(tree[0].length,0);assert.equal(tree[1][0],'if');assert.equal(tree[1][2][0].length,1);assert.equal(tree[1][3][0].length,0);const plan=proposeOwnedVectorBulkModuleSynchronization(row.input,[{sourcePath:JS,typescriptPath:TS,typescript:row.result.typescript}]);assert.equal(plan.modules[0].bindings.length,1);for(const get of await insertionTargets(t,row)){assert.equal(get('values',255n,1n,false),255n);assert.throws(()=>get('values',255n,1n,true),/attempt to add with overflow/u);}
});
test('nested checked argument evaluations retain first failure ordering before the outer checked operation',limits,async t=>{
 const domain=PRIMITIVE_BITWISE_TYPES.find(row=>row.name==='u8'),body=arithmetic(domain,'add',arithmetic(domain,'mul'),arithmetic(domain,'sub')),source=operationImport+'export function values(left,right){return '+body+';}',typed=typeImport(domain)+operationImport+'export function values(left:'+domain.alias+',right:'+domain.alias+'):'+domain.alias+'{return '+body+';}',row=translate('pub fn values(left:u8,right:u8)->u8{(left*right)+(left-right)}',source,typed),tree=requestedNativeJsonVectorTree(row.result.program[0]);assert.deepEqual(tree[0].map(event=>event[0]),['primitive-failure:arithmetic:mul:u8','primitive-failure:arithmetic:sub:u8','primitive-failure:arithmetic:add:u8']);for(const get of await insertionTargets(t,row)){assert.equal(get('values',3n,2n),7n);assert.throws(()=>get('values',255n,2n),/attempt to multiply with overflow/u);assert.throws(()=>get('values',0n,1n),/attempt to subtract with overflow/u);}
 const plan=proposeOwnedVectorNativeSynchronization(row.input,{sourcePath:JS,typescriptPath:TS,typescript:row.result.typescript});assert.equal(plan.rustExecuted,false);
});
test('actual primitive clamp keeps its own ordered failure event and complete receiving native checks',limits,async t=>{
 const domain=PRIMITIVE_BITWISE_TYPES.find(row=>row.name==='u8'),source=operationImport+'export function values(left,low,high){return method(left,low,high,8,false,"clamp");}',typed=typeImport(domain)+operationImport+'export function values(left:RustU8,low:RustU8,high:RustU8):RustU8{return method(left,low,high,8,false,"clamp");}',row=translate('pub fn values(left:u8,low:u8,high:u8)->u8{left.clamp(low,high)}',source,typed);assert.equal(requestedNativeJsonVectorTree(row.result.program[0])[0][0][0],'primitive-failure:method:clamp:u8');const plan=proposeOwnedVectorNativeSynchronization(row.input,{sourcePath:JS,typescriptPath:TS,typescript:row.result.typescript});assert.equal(plan.rustExecuted,false);for(const get of await insertionTargets(t,row)){assert.equal(get('values',7n,2n,4n),4n);assert.throws(()=>get('values',7n,4n,2n),RangeError);}
});
test('new definitions and existing fallible helpers preserve unused helper execution through native append and bulk',limits,async()=>{
 const input=data('pub mod target {}','','');input.vectorBindings=[];const domain=PRIMITIVE_BITWISE_TYPES.find(row=>row.name==='u8'),typed=typeImport(domain)+operationImport+'export function danger(left:RustU8,right:RustU8):RustU8{return '+arithmetic(domain,'add')+';}export function values(left:RustU8,right:RustU8):RustU8{const unused=danger(left,right);return left;}',first=proposeOwnedPrimitiveFunctionInsertion(input,{sourcePath:JS,typescriptPath:TS,nativeRoute:{rustPath:'src/lib.rs',module:['target']},typescript:typed}),files=new Map(input.files.map(row=>[row.path,row.source]));for(const output of first.outputs)files.set(output.path,output.after);const next={...input,vectorBindings:first.bindings,files:[...files].map(([path,source])=>({path,source}))},extension=proposeOwnedPrimitiveFunctionExtension(next,{sourcePath:JS,typescriptPath:TS,typescript:typed+'export function forwarded(left:RustU8,right:RustU8):RustU8{return danger(left,right);}'});assert.equal(extension.addedBindings.length,1);assert.equal(extension.nativeInstalled,false);const bulk=proposeOwnedVectorBulkModuleSynchronization(next,[{sourcePath:JS,typescriptPath:TS,typescript:files.get(TS)}]);assert.equal(bulk.modules[0].bindings.length,2);assert.equal(bulk.rustExecuted,false);
});
test('short-circuit right failure and expression-arm failures are refused until their own guarded expression rules exist',limits,()=>{
 const domain=PRIMITIVE_BITWISE_TYPES.find(row=>row.name==='u8'),math=arithmetic(domain,'add');for(const [result,body,native]of [['boolean','return flag&&('+math+'>0n);','flag && left+right>0'],['RustU8','return flag?'+math+':left;','if flag { left+right } else {left}']]){const source=operationImport+'export function values(left,right,flag){'+body+'}',typed=typeImport(domain)+operationImport+'export function values(left:RustU8,right:RustU8,flag:boolean):'+result+'{'+body+'}',input=data('pub fn values(left:u8,right:u8,flag:bool)->'+(result==='boolean'?'bool':'u8')+'{'+native+'}',source,typed);assert.throws(()=>proposeOwnedVectorNativeSynchronization(input,{sourcePath:JS,typescriptPath:TS,typescript:typed}));}
});
test('failure event DATA never changes total-operation classification and malformed width/order metadata refuses',limits,()=>{
 assert.equal(ownedNativeTotalOperator('integerArithmetic'),false);const argument={kind:'integer',value:'1',type:'u8',root:null},node={kind:'primitive-arithmetic-call',name:'integerArithmetic',args:[argument,argument],operation:'add',type:'u8',bits:8,signed:false,root:null};assert.throws(()=>requireOwnedNativeTotalCall(node));assert.equal(requireOwnedNativeClosedCall(node),node);for(const operation of ['div','rem','neg'])assert.throws(()=>requireOwnedNativeClosedCall({...node,operation}));assert.throws(()=>requireOwnedNativeClosedCall({...node,bits:16}));const visits=[],events=[];assert.deepEqual(requestedNativeFailureOperator(node,value=>{visits.push(value);return ['integer','u8','1'];},(name,args)=>{events.push([name,args]);return ['effect',0];}),['effect',0]);assert.equal(visits.length,2);assert.equal(events.length,1);const descriptor=nativeFailureEventOperation(events[0][0]);assert.equal(projectNativeFailureCall(descriptor,['left','right'],{imported:()=> 'math'}),'math(left, right, 8, false, "add")');for(const name of ['primitive-failure:arithmetic:div:u8','primitive-failure:arithmetic:add:usize','primitive-failure:method:min:u8','primitive-failure:arithmetic:add:u8:extra'])assert.throws(()=>nativeFailureEventOperation(name));
});
test('seventeen complete ordered failure source equations preserve every original and the fixed two phase history',limits,()=>{
 const plan=prepareOrderedPrimitiveFailureSources();assert.equal(plan.files.length,17);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});

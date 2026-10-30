// Guarded scalar arithmetic, continuation and independent paired cases. ALL UNRUN.
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
import {proposeOwnedPrimitiveFunctionInsertion} from '../owned-primitive-function-insertion.mjs';
import {proposeOwnedPrimitiveFunctionExtension} from '../owned-primitive-function-extension.mjs';
import {requestedNativeJsonVectorTree} from '../owned-vector-native-json-control.mjs';
import {observeRequestedGuardedPrimitiveBody} from '../owned-guarded-primitive-failures.mjs';
import {prepareGuardedPrimitiveFailureSources} from '../../prepare-guarded-primitive-failure-sources.mjs';
const operationImport='import {integerArithmetic as math} from "../runtime/primitive-operator-runtime.mjs";\n';
function arithmetic(domain,operation,left='left',right='right'){return 'math('+left+','+right+','+domain.bits+','+domain.signed+',"'+operation+'")';}
function fixture(domain,body,native,{boolean=false}={}){
 const source=operationImport+'export function values(left,right,flag){'+body+'}',typed='import type {'+domain.alias+'} from "../runtime/primitive-operator-runtime.mjs";\n'+operationImport+'export function values(left:'+domain.alias+',right:'+domain.alias+',flag:boolean):'+(boolean?'boolean':domain.alias)+'{'+body+'}';
 return translate('pub fn values(left:'+domain.name+',right:'+domain.name+',flag:bool)->'+(boolean?'bool':domain.name)+'{'+native+'}',source,typed);
}
for(const domain of PRIMITIVE_BITWISE_TYPES)test(domain.name+' conditional expression failure evaluates exactly its selected arm through the full paired native boundary',limits,async t=>{
 const body='return flag?'+arithmetic(domain,'add')+':'+arithmetic(domain,'sub')+';',row=fixture(domain,body,'if flag {left+right}else{left-right}'),tree=requestedNativeJsonVectorTree(row.result.program[0]);assert.equal(tree[0].length,0);assert.equal(tree[1][0],'if');assert.equal(tree[1][2][0][0][0],'primitive-failure:arithmetic:add:'+domain.name);assert.equal(tree[1][3][0][0][0],'primitive-failure:arithmetic:sub:'+domain.name);
 const plan=proposeOwnedVectorNativeSynchronization(row.input,{sourcePath:JS,typescriptPath:TS,typescript:row.result.typescript});assert.equal(plan.selectedFunctions.length,1);assert.equal(plan.rustExecuted,false);for(const get of await insertionTargets(t,row)){assert.equal(get('values',3n,2n,true),5n);assert.equal(get('values',3n,2n,false),1n);assert.equal(get('values',BigInt(domain.maximum),1n,false),BigInt(domain.maximum)-1n);assert.throws(()=>get('values',BigInt(domain.maximum),1n,true),/attempt to add with overflow/u);}assert.equal(JSON.stringify(tree).includes('guarded-scalar-model'),false);
});
for(const operator of ['&&','||'])test(operator+' guarded right failure preserves source short circuit and the independent native event branches',limits,async t=>{
 const domain=PRIMITIVE_BITWISE_TYPES.find(row=>row.name==='u8'),body='return flag'+operator+'('+arithmetic(domain,'add')+'>0n);',row=fixture(domain,body,'flag '+operator+' (left+right>0_u8)',{boolean:true}),tree=requestedNativeJsonVectorTree(row.result.program[0]);assert.equal(tree[1][0],'if');const skipped=operator==='&&'?false:true,selected=!skipped;
 for(const get of await insertionTargets(t,row)){assert.equal(get('values',255n,1n,skipped),skipped);assert.throws(()=>get('values',255n,1n,selected),/attempt to add with overflow/u);assert.equal(get('values',1n,1n,selected),true);}
 const plan=proposeOwnedVectorBulkModuleSynchronization(row.input,[{sourcePath:JS,typescriptPath:TS,typescript:row.result.typescript}]);assert.equal(plan.modules[0].bindings.length,1);assert.equal(plan.rustExecuted,false);
});
test('earlier nested operand failure runs before guarded argument selection and each continuation keeps original local aliases',limits,async t=>{
 const domain=PRIMITIVE_BITWISE_TYPES.find(row=>row.name==='u8'),left=arithmetic(domain,'mul'),right='(flag?'+arithmetic(domain,'sub')+':left)',body='return '+arithmetic(domain,'add',left,right)+';',row=fixture(domain,body,'(left*right)+(if flag {left-right}else{left})'),tree=requestedNativeJsonVectorTree(row.result.program[0]);assert.equal(tree[0][0][0],'primitive-failure:arithmetic:mul:u8');assert.equal(tree[1][0],'if');
 for(const get of await insertionTargets(t,row)){assert.equal(get('values',3n,2n,true),7n);assert.equal(get('values',3n,2n,false),9n);assert.throws(()=>get('values',255n,2n,false),/attempt to multiply with overflow/u);assert.throws(()=>get('values',0n,1n,true),/attempt to subtract with overflow/u);}
 const plan=proposeOwnedVectorNativeSynchronization(row.input,{sourcePath:JS,typescriptPath:TS,typescript:row.result.typescript});assert.equal(plan.rustExecuted,false);
});
test('guarded local initialization carries its selected value through later arithmetic without duplicated evaluation',limits,async t=>{
 const domain=PRIMITIVE_BITWISE_TYPES.find(row=>row.name==='u8'),body='const selected=flag?'+arithmetic(domain,'add')+':'+arithmetic(domain,'sub')+';return '+arithmetic(domain,'mul','selected','right')+';',row=fixture(domain,body,'let selected=if flag {left+right}else{left-right};selected*right');
 for(const get of await insertionTargets(t,row)){assert.equal(get('values',3n,2n,true),10n);assert.equal(get('values',3n,2n,false),2n);assert.throws(()=>get('values',0n,1n,false),/attempt to subtract with overflow/u);}
 const plan=proposeOwnedVectorNativeSynchronization(row.input,{sourcePath:JS,typescriptPath:TS,typescript:row.result.typescript});assert.equal(plan.rustExecuted,false);
});
test('definition insertion and old helper native append retain guarded source calls in actual receiving branches',limits,async()=>{
 const input=data('pub mod target {}','','');input.vectorBindings=[];const typed='import type {RustU8} from "../runtime/primitive-operator-runtime.mjs";'+operationImport+'export function danger(left:RustU8,right:RustU8):RustU8{return math(left,right,8,false,"add");}export function values(left:RustU8,right:RustU8,flag:boolean):RustU8{return flag?danger(left,right):left;}',plan=proposeOwnedPrimitiveFunctionInsertion(input,{sourcePath:JS,typescriptPath:TS,nativeRoute:{rustPath:'src/lib.rs',module:['target']},typescript:typed}),files=new Map(input.files.map(row=>[row.path,row.source]));for(const output of plan.outputs)files.set(output.path,output.after);const next={...input,vectorBindings:plan.bindings,files:[...files].map(([path,source])=>({path,source}))},extension=proposeOwnedPrimitiveFunctionExtension(next,{sourcePath:JS,typescriptPath:TS,typescript:typed+'export function forwarded(left:RustU8,right:RustU8,flag:boolean):RustU8{return flag?danger(left,right):left;}'});assert.equal(plan.bindings.length,2);assert.equal(extension.addedBindings.length,1);assert.equal(extension.nativeInstalled,false);
});
test('public guarded observation DATA preserves the existing complete work/depth/branch bounds',limits,()=>{
 const parameter={kind:'variable',name:'flag',type:'bool',root:null},integer={kind:'integer',value:'1',type:'u8',root:null},call={kind:'primitive-arithmetic-call',name:'integerArithmetic',args:[integer,integer],operation:'add',type:'u8',bits:8,signed:false,root:null};let value=call;for(let index=0;index<7;index++)value={kind:'choose',cond:parameter,then:value,else:value,type:'u8',root:null};
 const item={vectorOrigin:{kind:'primitive-scalar'},params:[{name:'flag',type:'bool'}],body:[{kind:'return',value}]},guard={charge(){},leaf(){}},read=(node,names,events)=>{if(node.kind==='variable')return names.get(node.name);if(node.kind==='integer')return ['integer','u8',node.value];const result=['effect',events.length];events.push(['primitive-failure:arithmetic:add:u8',[['integer','u8','1'],['integer','u8','1']]]);return result;};assert.throws(()=>observeRequestedGuardedPrimitiveBody(item,{read,guard,names:new Map([['flag',['parameter',0]]]),events:[]}),/bounded/u);
});
test('five complete guarded continuation source equations retain every original source and exact inverse with fixed phases',limits,()=>{
 const plan=prepareGuardedPrimitiveFailureSources();assert.equal(plan.files.length,5);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});

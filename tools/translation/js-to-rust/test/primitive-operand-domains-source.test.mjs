// Complete exact-width contextual operand source cases. ALL UNRUN.
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
import {ownershipCompiler} from '../vendor/module-syntax.mjs';
import {readOwnedPrimitiveOperatorCall,readOwnedPrimitiveOperatorCallWithDomains} from '../owned-primitive-operator-source.mjs';
import {proposeOwnedVectorBulkModuleSynchronization} from '../owned-vector-bulk-module-synchronization.mjs';
import {proposeOwnedPrimitiveFunctionInsertion} from '../owned-primitive-function-insertion.mjs';
import {proposeOwnedPrimitiveFunctionExtension} from '../owned-primitive-function-extension.mjs';
import {preparePrimitiveOperandDomainSources} from '../../prepare-primitive-operand-domain-sources.mjs';
const operationImport='import {integerArithmetic as math,primitiveIntegerMethod as method,primitiveBitwise as bitwise} from "../runtime/primitive-operator-runtime.mjs";\n';
function fixture(domain,operation='add'){
 const conditional='(flag?('+domain.maximum+'n):'+(domain.signed?'-'+domain.minimumAbs+'n':'0n')+')',body='return math('+conditional+',right,'+domain.bits+','+domain.signed+',"'+operation+'");',source=operationImport+'export function values(right,flag){'+body+'}',typed='import type {'+domain.alias+'} from "../runtime/primitive-operator-runtime.mjs";\n'+operationImport+'export function values(right:'+domain.alias+',flag:boolean):'+domain.alias+'{'+body+'}',native='pub fn values(right:'+domain.name+',flag:bool)->'+domain.name+'{(if flag {'+domain.maximum+'_'+domain.name+'}else{'+(domain.signed?'-'+domain.minimumAbs+'_'+domain.name:'0_'+domain.name)+'}) '+(operation==='add'?'+':'*')+' right}';
 return translate(native,source,typed);
}
for(const domain of PRIMITIVE_BITWISE_TYPES)test(domain.name+' conditional primitive operands use exact metadata domains including all signed and unsigned boundaries',limits,async t=>{
 const row=fixture(domain),plan=proposeOwnedVectorNativeSynchronization(row.input,{sourcePath:JS,typescriptPath:TS,typescript:row.result.typescript});assert.equal(plan.selectedFunctions.length,1);for(const get of await insertionTargets(t,row)){assert.equal(get('values',0n,true),BigInt(domain.maximum));assert.equal(get('values',0n,false),domain.signed?-BigInt(domain.minimumAbs):0n);assert.throws(()=>get('values',1n,true),/attempt to add with overflow/u);}assert.equal(plan.rustExecuted,false);
 const bulk=proposeOwnedVectorBulkModuleSynchronization(row.input,[{sourcePath:JS,typescriptPath:TS,typescript:row.result.typescript}]);assert.equal(bulk.modules[0].bindings.length,1);assert.equal(bulk.runtimeParity,false);
});
test('the new reader adds an optional exact operand hint while the complete original callback contract stays intact',limits,()=>{
 const ts=ownershipCompiler(),file=ts.createSourceFile('domain.mts','math(flag?1n:2n,value,8,false,"add");',ts.ScriptTarget.Latest,true,ts.ScriptKind.TS),call=file.statements[0].expression,legacy=[],current=[],read=rows=>(node,domain)=>{rows.push(domain);return {kind:'variable',name:node.getText(file),type:'u8',root:null};};
 const old=readOwnedPrimitiveOperatorCall(ts,call,'integerArithmetic',read(legacy)),next=readOwnedPrimitiveOperatorCallWithDomains(ts,call,'integerArithmetic',read(current));assert.deepEqual(legacy,[undefined,undefined]);assert.deepEqual(current,['u8','u8']);assert.deepEqual(old,next);
});
for(const [name,literal]of [['u8','256n'],['u8','-1n'],['i8','128n'],['i8','-129n'],['u128','340282366920938463463374607431768211456n'],['i128','-170141183460469231731687303715884105729n']])test(name+' rejects an out-of-range conditional literal even in an unselected source branch '+literal,limits,()=>{
 const domain=PRIMITIVE_BITWISE_TYPES.find(row=>row.name===name),body='return math(flag?'+literal+':right,right,'+domain.bits+','+domain.signed+',"add");',source=operationImport+'export function values(right,flag){'+body+'}',typed='import type {'+domain.alias+'} from "../runtime/primitive-operator-runtime.mjs";'+operationImport+'export function values(right:'+domain.alias+',flag:boolean):'+domain.alias+'{'+body+'}',input=data('pub fn values(right:'+name+',flag:bool)->'+name+'{right}',source,typed);assert.throws(()=>{const context=createOwnedVectorCandidateContext(input);translateOwnedVectorCandidate(source,{context,sourcePath:JS,typescriptOutputPath:'typed/src/reverse.mts'});});
});
test('operand metadata never recasts an actual variable alias or a nested runtime result into another width',limits,()=>{
 const source=operationImport+'export function values(left,right,flag){return math(flag?left:1n,right,8,false,"add");}',typed='import type {RustU8,RustU16} from "../runtime/primitive-operator-runtime.mjs";'+operationImport+'export function values(left:RustU16,right:RustU8,flag:boolean):RustU8{return math(flag?left:1n,right,8,false,"add");}',input=data('pub fn values(left:u16,right:u8,flag:bool)->u8{(left as u8).wrapping_add(right)}',source,typed);assert.throws(()=>{const context=createOwnedVectorCandidateContext(input);translateOwnedVectorCandidate(source,{context,sourcePath:JS,typescriptOutputPath:'typed/src/reverse.mts'});});
});
test('definition insertion and helper extension support literal-only conditional operands without hand-written native placeholders',limits,async()=>{
 const input=data('pub mod target {}','','');input.vectorBindings=[];const typed='import type {RustI128} from "../runtime/primitive-operator-runtime.mjs";'+operationImport+'export function choose(right:RustI128,flag:boolean):RustI128{return math((flag?170141183460469231731687303715884105727n:-170141183460469231731687303715884105728n),right,128,true,"add");}',plan=proposeOwnedPrimitiveFunctionInsertion(input,{sourcePath:JS,typescriptPath:TS,nativeRoute:{rustPath:'src/lib.rs',module:['target']},typescript:typed}),files=new Map(input.files.map(row=>[row.path,row.source]));for(const output of plan.outputs)files.set(output.path,output.after);const next={...input,vectorBindings:plan.bindings,files:[...files].map(([path,source])=>({path,source}))},extension=proposeOwnedPrimitiveFunctionExtension(next,{sourcePath:JS,typescriptPath:TS,typescript:typed+'export function forwarded(right:RustI128,flag:boolean):RustI128{return choose(right,flag);}'});assert.equal(plan.bindings.length,1);assert.equal(extension.addedBindings.length,1);assert.equal(extension.nativeInstalled,false);
});
test('nine complete contextual operand source equations preserve all original readers and native source inverses',limits,()=>{
 const plan=preparePrimitiveOperandDomainSources();assert.equal(plan.files.length,9);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});

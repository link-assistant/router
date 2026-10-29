// Same-module actual owned Vec helper closure cases. ALL UNRUN.
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
import {selectNativeProjectionClosure} from '../owned-native-projection-closure.mjs';
import {scalarSourceCallSummary as oldSummary} from '../owned-source-scalar-calls.mjs';
import {scalarSourceCallSummary,nativeSourceValueResultDomain,assertScalarSourceCallSummaries} from '../owned-source-value-calls.mjs';
import {preparePrimitiveVectorHelperSources} from '../../prepare-primitive-vector-helper-sources.mjs';
function fixture(domain,{guarded=false,unused=false,nested=false}={}){
 const operation='math(left,right,'+domain.bits+','+domain.signed+',"add")',jsHelper='export function helper(left,right){return ['+operation+',right];}',typedHelper='export function helper(left:'+domain.alias+',right:'+domain.alias+'):readonly '+domain.alias+'[]{return ['+operation+',right];}',nativeHelper='pub fn helper(left:'+domain.name+',right:'+domain.name+')->Vec<'+domain.name+'>{crate::translation_core::vec![left+right,right]}';
 const body=(unused?'const discarded=helper(left,right);':'')+(guarded?'return flag?helper(left,right):[left,right];':nested?'const first=middle(left,right);const moved=first;return moved;':'const first=helper(left,right);const moved=first;return moved;'),nativeBody=(unused?'let discarded=helper(left,right);':'')+(guarded?'if flag {helper(left,right)}else{crate::translation_core::vec![left,right]}':nested?'let first=middle(left,right);let moved=first;moved':'let first=helper(left,right);let moved=first;moved');
 const importCode='import {integerArithmetic as math} from "../runtime/primitive-operator-runtime.mjs";\n',source=importCode+jsHelper+(nested?'export function middle(left,right){return helper(left,right);}':'')+'export function values(left,right,flag){'+body+'}',typed='import type {'+domain.alias+'} from "../runtime/primitive-operator-runtime.mjs";\n'+importCode+typedHelper+(nested?'export function middle(left:'+domain.alias+',right:'+domain.alias+'):readonly '+domain.alias+'[]{return helper(left,right);}':'')+'export function values(left:'+domain.alias+',right:'+domain.alias+',flag:boolean):readonly '+domain.alias+'[]{'+body+'}',rust=nativeHelper+(nested?'pub fn middle(left:'+domain.name+',right:'+domain.name+')->Vec<'+domain.name+'>{helper(left,right)}':'')+'pub fn values(left:'+domain.name+',right:'+domain.name+',flag:bool)->Vec<'+domain.name+'>{'+nativeBody+'}',input=data(rust,source,typed);
 input.vectorBindings.push({javascriptPath:JS,javascriptName:'helper',rustPath:'src/lib.rs',rustName:'helper'});if(nested)input.vectorBindings.push({javascriptPath:JS,javascriptName:'middle',rustPath:'src/lib.rs',rustName:'middle'});
 const context=createOwnedVectorCandidateContext(input),result=translateOwnedVectorCandidate(source,{context,sourcePath:JS,typescriptOutputPath:'typed/src/reverse.mts'});return {input,context,result};
}
for(const domain of PRIMITIVE_BITWISE_TYPES)test('same-module Vec<'+domain.name+'> source helper returns move through the paired/native closure',limits,async t=>{
 const row=fixture(domain),plan=proposeOwnedVectorNativeSynchronization(row.input,{sourcePath:JS,typescriptPath:TS,typescript:row.result.typescript});assert.equal(plan.selectedFunctions.length,2);assert.equal(plan.rustExecuted,false);for(const get of await insertionTargets(t,row)){assert.deepEqual(get('helper',3n,2n),[5n,2n]);assert.deepEqual(get('values',3n,2n,false),[5n,2n]);assert.throws(()=>get('values',BigInt(domain.maximum),1n,false),/attempt to add with overflow/u);}
});
test('guarded helpers execute only their selected Vec branch',limits,async t=>{
 const row=fixture(PRIMITIVE_BITWISE_TYPES.find(row=>row.name==='u8'),{guarded:true});proposeOwnedVectorNativeSynchronization(row.input,{sourcePath:JS,typescriptPath:TS,typescript:row.result.typescript});for(const get of await insertionTargets(t,row)){assert.deepEqual(get('values',255n,1n,false),[255n,1n]);assert.throws(()=>get('values',255n,1n,true),/attempt to add with overflow/u);}
});
test('unused helper results still execute and nested Vec helpers retain complete call graphs',limits,async t=>{
 for(const options of [{unused:true},{nested:true}]){const row=fixture(PRIMITIVE_BITWISE_TYPES.find(row=>row.name==='u8'),options),plan=proposeOwnedVectorBulkModuleSynchronization(row.input,[{sourcePath:JS,typescriptPath:TS,typescript:row.result.typescript}]);assert.equal(plan.modules[0].bindings.length,options.nested?3:2);for(const get of await insertionTargets(t,row)){assert.deepEqual(get('values',3n,2n,false),[5n,2n]);assert.throws(()=>get('values',255n,1n,false),/attempt to add with overflow/u);}}
});
test('automatic native discovery includes the entire Vec helper chain without claiming execution',limits,()=>{
 const row=fixture(PRIMITIVE_BITWISE_TYPES.find(row=>row.name==='u8'),{nested:true}),plan=proposeOwnedNativeBulkDiscovery(row.input);assert.ok(plan.modules.some(module=>['helper','middle','values'].every(name=>module.bindings.some(binding=>binding.rustName===name))));assert.equal(plan.runtimeParity,false);assert.equal(plan.productionSelected,false);assert.equal(plan.receivingExecuted,false);
});
test('Boolean-returned Vec helpers use the same owned source abstraction',limits,async t=>{
 const body='return flag?helper(left,right):[right];',rust='pub fn helper(left:bool,right:bool)->Vec<bool>{crate::translation_core::vec![left&&!right]}pub fn values(left:bool,right:bool,flag:bool)->Vec<bool>{if flag {helper(left,right)}else{crate::translation_core::vec![right]}}',source='export function helper(left,right){return [left&&!right];}export function values(left,right,flag){'+body+'}',typed='export function helper(left:boolean,right:boolean):readonly boolean[]{return [left&&!right];}export function values(left:boolean,right:boolean,flag:boolean):readonly boolean[]{'+body+'}',input=data(rust,source,typed);input.vectorBindings.push({javascriptPath:JS,javascriptName:'helper',rustPath:'src/lib.rs',rustName:'helper'});const context=createOwnedVectorCandidateContext(input),result=translateOwnedVectorCandidate(source,{context,sourcePath:JS,typescriptOutputPath:'typed/src/reverse.mts'}),row={input,context,result};proposeOwnedVectorNativeSynchronization(input,{sourcePath:JS,typescriptPath:TS,typescript:result.typescript});for(const get of await insertionTargets(t,row)){assert.deepEqual(get('values',true,false,true),[true]);assert.deepEqual(get('values',true,false,false),[false]);}
});
test('old scalar public API stays scalar-only while the receiving copy joins complete Vec source summaries',limits,()=>{
 const row=fixture(PRIMITIVE_BITWISE_TYPES.find(row=>row.name==='u8')),caller=row.result.program.find(item=>item.javascript==='values');assert.throws(()=>oldSummary(caller));const summary=scalarSourceCallSummary(caller);assert.equal(summary.calls[0].returns,'vec:u8');assertScalarSourceCallSummaries(row.result.program.map(scalarSourceCallSummary));const changed=row.result.program.map(scalarSourceCallSummary);changed.find(item=>item.javascript==='helper').returns='vec:u16';assert.throws(()=>assertScalarSourceCallSummaries(changed));
});
test('graph-only Vec observations refuse absent callees cycles and incoming depth overflow',limits,()=>{
 const unit=(name,target)=>({rust:name,name,kind:'primitive-expression-vector',returns:'vec:u8',parameters:[],tree:target?[[['source-call:'+target,[]]],['effect',0]]:[[],['vector',[]]]}),helper=unit('helper'),caller=unit('caller','helper');assert.deepEqual(selectNativeProjectionClosure([caller,helper]).admitted,['caller','helper']);assert.deepEqual(selectNativeProjectionClosure([caller]).admitted,[]);assert.deepEqual(selectNativeProjectionClosure([caller,unit('helper','caller')]).admitted,[]);const deep=Array.from({length:34},(_,index)=>unit('item_'+index,index===33?null:'item_'+(index+1)));assert.ok(selectNativeProjectionClosure(deep).refusals.some(row=>row.rust==='item_0'));
});
test('native Vec result domain DATA refuses shared fixed-array generic owned-element and width-forged forms',limits,()=>{
 const element={kind:'fixed',rustPrimitiveName:'u8',bits:8,signed:false},type={kind:'array',element,rustOwnership:{kind:'owned',source:'Vec'}};assert.equal(nativeSourceValueResultDomain(type),'vec:u8');for(const changed of [{...type,rustReference:{kind:'shared',pointee:type}},{...type,rustFixedArray:{length:1}},{...type,rustGenericIdentityUnresolved:true},{...type,element:{...element,bits:16}},{...type,element:{...element,rustOwnership:{kind:'owned',source:'String'}}}])assert.equal(nativeSourceValueResultDomain(changed),null);
});
test('a moved helper result cannot be reused and scalar callers cannot consume Vec helpers',limits,()=>{
 const row=fixture(PRIMITIVE_BITWISE_TYPES.find(row=>row.name==='u8'));for(const file of row.input.files)if([JS,TS].includes(file.path))file.source=file.source.replace('return moved;','const again=first;return moved;');assert.throws(()=>{const context=createOwnedVectorCandidateContext(row.input);translateOwnedVectorCandidate(row.input.files.find(file=>file.path===JS).source,{context,sourcePath:JS,typescriptOutputPath:'typed/src/reverse.mts'});});
});
test('actual paired source recursion and scalar callers cannot acquire a Vec helper result',limits,()=>{
 const domain=PRIMITIVE_BITWISE_TYPES.find(row=>row.name==='u8');
 const recursive=fixture(domain);for(const file of recursive.input.files)if([JS,TS].includes(file.path))file.source=file.source.replace('return [math(left,right,8,false,"add"),right];','return values(left,right,true);');assert.throws(()=>{const context=createOwnedVectorCandidateContext(recursive.input);translateOwnedVectorCandidate(recursive.input.files.find(file=>file.path===JS).source,{context,sourcePath:JS,typescriptOutputPath:'typed/src/reverse.mts'});});
 const scalar=fixture(domain);scalar.input.files.find(file=>file.path==='src/lib.rs').source+='pub fn scalar(left:u8,right:u8)->u8{left}';scalar.input.vectorBindings.push({javascriptPath:JS,javascriptName:'scalar',rustPath:'src/lib.rs',rustName:'scalar'});scalar.input.files.find(file=>file.path===JS).source+='export function scalar(left,right){const discarded=helper(left,right);return left;}';scalar.input.files.find(file=>file.path===TS).source+='export function scalar(left:RustU8,right:RustU8):RustU8{const discarded=helper(left,right);return left;}';assert.throws(()=>{const context=createOwnedVectorCandidateContext(scalar.input);translateOwnedVectorCandidate(scalar.input.files.find(file=>file.path===JS).source,{context,sourcePath:JS,typescriptOutputPath:'typed/src/reverse.mts'});});
});
test('thirteen complete source equations retain exact source inverses and language/repository phases',limits,()=>{
 const plan=preparePrimitiveVectorHelperSources();assert.equal(plan.files.length,13);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});

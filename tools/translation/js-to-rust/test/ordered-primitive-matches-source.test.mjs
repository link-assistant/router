// Ordered native match expression and helper graph case drafts. ALL UNRUN.
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
import {selectNativeProjectionClosure} from '../owned-native-projection-closure.mjs';
import {guardedNativeOrderedScalarRows} from '../owned-native-ordered-scalars.mjs';
import {normalizePrimitiveScalarBodyTree} from '../owned-primitive-body-normalization.mjs';
import {prepareOrderedPrimitiveMatchSources} from '../../prepare-ordered-primitive-match-sources.mjs';
const operationImport='import {integerArithmetic as math} from "../runtime/primitive-operator-runtime.mjs";\n';
function arithmetic(domain,operation,left='left',right='right'){return 'math('+left+','+right+','+domain.bits+','+domain.signed+',"'+operation+'")';}
function fixture(domain,{guard=false,pure=false,flag=false}={}){
 const selected=flag?'flag?'+arithmetic(domain,'mul')+':'+arithmetic(domain,'add'):pure?'text==="add"?left:(text==="mul"?right:left)':guard?'text==="add"&&'+arithmetic(domain,'add')+'>0n?'+arithmetic(domain,'mul')+':left':'text==="add"?'+arithmetic(domain,'add')+':(text==="mul"?'+arithmetic(domain,'mul')+':left)',body='const selected='+selected+';return '+arithmetic(domain,'add','selected','right')+';',source=operationImport+'export function values(left,right,'+(flag?'flag':'text')+'){'+body+'}',typed='import type {'+domain.alias+'} from "../runtime/primitive-operator-runtime.mjs";\n'+operationImport+'export function values(left:'+domain.alias+',right:'+domain.alias+','+(flag?'flag:boolean':'text:string')+'):'+domain.alias+'{'+body+'}',match=flag?'match flag {false=>left+right,_=>left*right}':pure?'match text {"add"=>left,"mul"=>right,_=>left}':guard?'match text {"add" if left+right>0_'+domain.name+'=>left*right,_=>left}':'match text {"add"=>left+right,"mul"=>left*right,_=>left}',rust='pub fn values(left:'+domain.name+',right:'+domain.name+','+(flag?'flag:bool':'text:&str')+')->'+domain.name+'{let selected='+match+';selected+right}';
 return translate(rust,source,typed);
}
for(const domain of PRIMITIVE_BITWISE_TYPES)test(domain.name+' fallible expression-position ordered match keeps selected arms and its enclosing arithmetic continuation',limits,async t=>{
 const row=fixture(domain),plan=proposeOwnedVectorNativeSynchronization(row.input,{sourcePath:JS,typescriptPath:TS,typescript:row.result.typescript});assert.equal(plan.selectedFunctions.length,1);assert.equal(plan.rustExecuted,false);const half=BigInt(domain.maximum)/2n+1n;
 for(const get of await insertionTargets(t,row)){assert.equal(get('values',3n,2n,'add'),7n);assert.equal(get('values',3n,2n,'mul'),8n);assert.equal(get('values',3n,2n,'other'),5n);assert.equal(get('values',half,2n,'other'),half+2n);assert.throws(()=>get('values',BigInt(domain.maximum),2n,'mul'),/attempt to multiply with overflow/u);}
 const bulk=proposeOwnedVectorBulkModuleSynchronization(row.input,[{sourcePath:JS,typescriptPath:TS,typescript:row.result.typescript}]);assert.equal(bulk.modules[0].bindings.length,1);assert.equal(bulk.runtimeParity,false);
});
test('pure nested matches retain value-expression nesting while their surrounding checked operation stays ordered',limits,async t=>{
 const domain=PRIMITIVE_BITWISE_TYPES.find(row=>row.name==='u8'),row=fixture(domain,{pure:true}),proposal=proposeOwnedVectorNativeSynchronization(row.input,{sourcePath:JS,typescriptPath:TS,typescript:row.result.typescript});assert.equal(proposal.selectedFunctions.length,1);for(const get of await insertionTargets(t,row)){assert.equal(get('values',3n,2n,'add'),5n);assert.equal(get('values',3n,2n,'mul'),4n);assert.equal(get('values',3n,2n,'other'),5n);}
});
test('a false guard retries the next row and an unselected guarded arithmetic operation never executes',limits,async t=>{
 const domain=PRIMITIVE_BITWISE_TYPES.find(row=>row.name==='u8'),row=fixture(domain,{guard:true}),proposal=proposeOwnedVectorNativeSynchronization(row.input,{sourcePath:JS,typescriptPath:TS,typescript:row.result.typescript});assert.equal(proposal.selectedFunctions.length,1);for(const get of await insertionTargets(t,row)){assert.equal(get('values',3n,2n,'add'),8n);assert.equal(get('values',0n,0n,'add'),0n);assert.equal(get('values',200n,2n,'other'),202n);assert.throws(()=>get('values',255n,1n,'add'),/attempt to add with overflow/u);}
});
test('Boolean pattern equality and negative selection join the same receiving conditional without changing failures',limits,async t=>{
 const domain=PRIMITIVE_BITWISE_TYPES.find(row=>row.name==='u8'),row=fixture(domain,{flag:true}),proposal=proposeOwnedVectorNativeSynchronization(row.input,{sourcePath:JS,typescriptPath:TS,typescript:row.result.typescript});assert.equal(proposal.selectedFunctions.length,1);for(const get of await insertionTargets(t,row)){assert.equal(get('values',3n,2n,false),7n);assert.equal(get('values',3n,2n,true),8n);assert.throws(()=>get('values',255n,2n,true),/attempt to multiply with overflow/u);}
});
test('active discovery graph follows ordered helper events including missing helpers recursion and complete signatures',limits,()=>{
 const parameter=['parameter',0],unit=(rust,name,tree)=>({rust,name,kind:'primitive-scalar',returns:'u8',parameters:[{name:'value',type:'u8'}],tree}),helper=unit('target.helper','helper',[[],parameter]),caller=unit('target.caller','caller',[[['source-call:target.helper',[parameter]]],['effect',0]]),result=selectNativeProjectionClosure([caller,helper]);assert.deepEqual(result.admitted.sort(),['caller','helper']);assert.equal(result.sourceAuthority,false);assert.equal(result.semanticAuthority,false);const missing=selectNativeProjectionClosure([caller]);assert.deepEqual(missing.admitted,[]);assert.equal(missing.refusals[0].sourcePreserved,true);const recursive=unit('target.helper','helper',[[['source-call:target.caller',[parameter]]],['effect',0]]),cycle=selectNativeProjectionClosure([caller,recursive]);assert.equal(cycle.admitted.length,0);assert.equal(cycle.refusals.length,2);
});
test('guarded row observations retain actual checked wrappers bindings guard types and an unguarded final fallback',limits,()=>{
 const type={kind:'fixed',bits:8,signed:false,rustPrimitiveName:'u8'},bool={kind:'bool'},literal=(value,type)=>({k:'lit',value,type}),arm=(body,guard=null)=>({k:'routerOrderedArm',guard,body,type}),node={k:'routerOrderedMatchArms',type,branches:[{cond:literal(true,bool),body:arm(literal('1',type),literal(false,bool))},{cond:literal(true,bool),body:arm(literal('2',type))}]};assert.equal(guardedNativeOrderedScalarRows(node)[0].guard.value,false);assert.equal(guardedNativeOrderedScalarRows(node)[1].body.value,'2');for(const malformed of [{...node,branches:[]},{...node,branches:[node.branches[0]]},{...node,branches:[{cond:literal(true,bool),body:literal('2',type)}]}])assert.throws(()=>guardedNativeOrderedScalarRows(malformed));
});
test('Boolean predicate joins and statically unreachable continuations preserve evaluated prefixes and validate both branches',limits,()=>{
 const p=['parameter',0],yes=['integer','u8','7'],no=['integer','u8','9'],call=['primitive-failure:arithmetic:add:u8',[p,['integer','u8','1']]];assert.deepEqual(normalizePrimitiveScalarBodyTree([[],['choose',['compare','eq','bool',p,['bool',true]],yes,no]]),[[],['choose',p,yes,no]]);assert.deepEqual(normalizePrimitiveScalarBodyTree([[],['choose',['not',p],yes,no]]),[[],['choose',p,no,yes]]);
 const tree=[[call],['if',['bool',false],[[call,['primitive-failure:arithmetic:mul:u8',[p,p]]],['effect',1]],[[call],yes]]];assert.deepEqual(normalizePrimitiveScalarBodyTree(tree),[[call],yes]);const invalid=structuredClone(tree);invalid[1][2][0][0][0]='changed-prefix';assert.throws(()=>normalizePrimitiveScalarBodyTree(invalid));
});
test('six complete ordered continuation equations retain actual source inverses and exactly the two declared phases',limits,()=>{
 const plan=prepareOrderedPrimitiveMatchSources();assert.equal(plan.files.length,6);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});

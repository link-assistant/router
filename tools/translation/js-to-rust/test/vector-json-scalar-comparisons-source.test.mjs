// Scalar comparison operation families. SOURCE ONLY; ALL UNRUN.
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
import {prepareVectorJsonScalarComparisonsSources} from '../../prepare-vector-json-scalar-comparisons-sources.mjs';
import {jsonScalarComparisonOperation,jsonScalarComparisonDomain} from '../owned-vector-json-comparisons.mjs';
const comparisonOperators=['===','!==','<','<=','>','>='],nativeOperators=['eq','ne','lt','le','gt','ge'],comparisonImports='import {json_macro_bool as boolean} from "../runtime/json-macro-runtime.mjs";\nimport {serde_json_value_as_str as readText,serde_json_value_as_bool as readBool} from "../runtime/json-runtime.mjs";\n';
function comparisonFixture(rows){const source=comparisonImports+rows.map((row,index)=>'export function comparecase'+index+'(seed,offset,amount,flag){'+row.body+'}').join('\n'),typed=typeImport+comparisonImports+rows.map((row,index)=>'export function comparecase'+index+'(seed:JsonValue,offset:bigint,amount:bigint,flag:boolean):readonly JsonValue[]{'+row.body+'}').join('\n'),rust=rows.map((_row,index)=>'pub fn comparecase'+index+'(seed:&'+T+',offset:u64,amount:i64,flag:bool)->Vec<'+T+'>{'+C+'vec!['+B+'json_checked_copy(seed)]}').join('\n'),input=data(rust,source,typed);input.files.find(file=>file.path==='src/lib.rs').source='pub mod translation_json_core;\n'+input.files.find(file=>file.path==='src/lib.rs').source;input.files.push({path:'src/translation_json_core.rs',source:BOUNDED_JSON_CORE_SOURCE});input.vectorBindings=rows.map((_row,index)=>({javascriptPath:JS,javascriptName:'comparecase'+index,rustPath:'src/lib.rs',rustName:'comparecase'+index}));const context=createOwnedVectorCandidateContext(input),result=translateOwnedVectorCandidate(source,{context,sourcePath:JS,typescriptOutputPath:TS});return {input,context,result};}
function expected(op,a,b){switch(op){case '===':return a===b;case '!==':return a!==b;case '<':return a<b;case '<=':return a<=b;case '>':return a>b;case '>=':return a>=b;default:throw new Error('independent operation census');}}
test('all six comparisons reuse exact existing native inverse mappings and preserve scalar domains',limits,()=>{for(let index=0;index<comparisonOperators.length;index++){const a=jsonScalarComparisonOperation(comparisonOperators[index]),b=jsonScalarComparisonOperation(nativeOperators[index],{native:true});assert.equal(a,b);assert.equal(a.op,nativeOperators[index]);assert.equal(a.target,comparisonOperators[index]);}for(const [input,wanted]of [['usize','u64'],['u64','u64'],['i64','i64'],['bool','bool'],['str','str']])assert.equal(jsonScalarComparisonDomain(input),wanted);for(const input of ['json','json-ref','f64','text-owned'])assert.equal(jsonScalarComparisonDomain(input),null);for(const op of ['==','!=','+','&','&&'])assert.equal(jsonScalarComparisonOperation(op),null);});
for(const domain of ['u64','i64'])test('six '+domain+' comparison operations retain full batch semantics and both authorities',limits,async()=>{const variable=domain==='u64'?'offset':'amount',rows=comparisonOperators.map(op=>({body:'return [boolean('+variable+op+'1n)];',op}));for(const javascript of [false,true]){const row=comparisonFixture(rows),proposal=sync(row,javascript),project=forward(row,proposal);await verifyTypedTargets(project,api=>{for(const value of domain==='u64'?[0n,1n,2n,18446744073709551615n]:[-9223372036854775808n,-1n,0n,1n,2n,9223372036854775807n])for(let index=0;index<rows.length;index++)assert.deepEqual(api['comparecase'+index](nullValue(),domain==='u64'?value:0n,domain==='i64'?value:0n,false),[boolValue(expected(rows[index].op,value,1n))]);},{childTimeoutMs:20000});for(let index=0;index<rows.length;index++){const entry=project.executableDeclarations.find(entry=>entry.qualifiedName==='comparecase'+index);assert.ok(entry);assert.deepEqual(actualNativeJsonVectorTree(entry.checkedSource().declaration,row.result.program[index],entry.lower()),requestedNativeJsonVectorTree(row.result.program[index]));}assert.equal(proposal.runtimeParity,false);}});
test('borrowed text and bool payload equalities compose with signed and unsigned branch comparisons',limits,async()=>{const rows=[{body:'const selected=readText(seed);if(selected.$==="Some"){return [boolean(selected.field0==="Ω😀")];}else{return [boolean(false)];}'},{body:'const selected=readBool(seed);if(selected.$==="Some"){return [boolean(selected.field0!==flag)];}else{return [boolean(false)];}'},{body:'if(offset>=1n&&amount<0n){return [boolean(true)];}else{return [boolean(false)];}'}],row=comparisonFixture(rows),proposal=sync(row),project=forward(row,proposal);await verifyTypedTargets(project,api=>{for(const input of [stringValue('Ω😀'),stringValue('other'),boolValue(true),boolValue(false),nullValue()])for(const flag of [true,false]){assert.deepEqual(api.comparecase0(input,0n,0n,flag),[boolValue(input.$==='String'&&input.field0==='Ω😀')]);assert.deepEqual(api.comparecase1(input,0n,0n,flag),[boolValue(input.$==='Bool'&&input.field0!==flag)]);}for(const offset of [0n,1n,18446744073709551615n])for(const amount of [-9223372036854775808n,0n,9223372036854775807n])assert.deepEqual(api.comparecase2(nullValue(),offset,amount,false),[boolValue(offset>=1n&&amount<0n)]);},{childTimeoutMs:20000});});
test('mixed signedness comparison remains refused rather than coerced',limits,()=>{assert.throws(()=>comparisonFixture([{body:'return [boolean(offset<amount)];'}]));});
test('four complete scalar comparison equations retain original table/source CST inverses and both phases',limits,()=>{const plan=prepareVectorJsonScalarComparisonsSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});

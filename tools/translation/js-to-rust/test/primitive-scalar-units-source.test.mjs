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
const pureRows=[
 {type:'bool',body:'return true;',expected:()=>true},
 {type:'u64',body:'return 18446744073709551615n;',expected:()=>18446744073709551615n},
 {type:'i64',body:'return -9223372036854775808n;',expected:()=>-9223372036854775808n},
 {type:'bool',body:'return flag;',expected:flag=>flag},
 {type:'u64',body:'return left;',expected:(_flag,left)=>left},
 {type:'i64',body:'return right;',expected:(_flag,_left,right)=>right},
 {type:'bool',body:'return key==="Ω😀";',expected:(_flag,_left,_right,key)=>key==='Ω😀'},
 {type:'bool',body:'return left>1n;',expected:(_flag,left)=>left>1n},
 {type:'i64',body:'return flag?right:0n;',expected:(flag,_left,right)=>flag?right:0n},
 {type:'u64',body:'return flag?1n:2n;',expected:flag=>flag?1n:2n},
 {type:'bool',body:'if(flag){return left>=1n;}else{return right<0n;}',expected:(flag,left,right)=>flag?left>=1n:right<0n},
 {type:'bool',body:'const first="Ω😀";const chosen=flag?key:first;return chosen===first;',expected:(flag,_left,_right,key)=>!flag||key==='Ω😀'},
];
function pureFixture(rows,{imports=''}={}){const source=imports+rows.map((row,index)=>'export function purecase'+index+'(flag,left,right,key){'+row.body+'}').join('\n'),typed=imports+rows.map((row,index)=>'export function purecase'+index+'(flag:boolean,left:bigint,right:bigint,key:string):'+(row.type==='bool'?'boolean':'bigint')+'{'+row.body+'}').join('\n'),rust=rows.map((row,index)=>'pub fn purecase'+index+'(flag:bool,left:u64,right:i64,key:&str)->'+row.type+'{'+(row.type==='bool'?'false':row.type==='u64'?'0_u64':'0_i64')+'}').join('\n'),input=data(rust,source,typed);input.vectorBindings=rows.map((_row,index)=>({javascriptPath:JS,javascriptName:'purecase'+index,rustPath:'src/lib.rs',rustName:'purecase'+index}));const context=createOwnedVectorCandidateContext(input),result=translateOwnedVectorCandidate(source,{context,sourcePath:JS,typescriptOutputPath:TS});return {input,context,result};}
for(let start=0;start<pureRows.length;start+=6){const selected=pureRows.slice(start,start+6);for(const javascript of [false,true])test('pure primitive source-unit caller batch '+start+' authority '+javascript,limits,async()=>{const row=pureFixture(selected),proposal=sync(row,javascript),project=forward(row,proposal);assert.equal(proposal.selectedFunctions.length,selected.length);assert.ok(row.result.program.every(item=>item.vectorOrigin.kind==='primitive-scalar'));assert.equal(proposal.rustEdits[0].after.includes('translation_json_core'),false);await verifyTypedTargets(project,api=>{for(const flag of [true,false])for(const left of [0n,1n,18446744073709551615n])for(const right of [-9223372036854775808n,0n,9223372036854775807n])for(const key of ['','Ω😀','other'])for(let index=0;index<selected.length;index++)assert.equal(api['purecase'+index](flag,left,right,key),selected[index].expected(flag,left,right,key));},{childTimeoutMs:20000});for(let index=0;index<selected.length;index++){const item=row.result.program[index],entry=project.executableDeclarations.find(entry=>entry.qualifiedName==='purecase'+index),own=entry.checkedSource().declaration,lowered=entry.lower(),domain=originalPrimitiveScalarDomain(own,lowered);assert.equal(domain.kind,'primitive-scalar');assert.equal(domain.type,selected[index].type);assert.deepEqual(actualNativeJsonVectorTree(own,item,lowered),requestedNativeJsonVectorTree(item));}assert.equal(proposal.runtimeParity,false);assert.equal(proposal.rustExecuted,false);});}
test('closed primitive boundary retains bigint and Unicode checks even for unused inputs',limits,async()=>{const row=pureFixture(pureRows.slice(0,1)),runtime=await prepareOwnedVectorCandidateRuntime(row.result.program);for(const args of [[true,-1n,0n,''],[true,18446744073709551616n,0n,''],[true,0n,-9223372036854775809n,''],[true,0n,9223372036854775808n,''],[1,0n,0n,''],[true,0,0n,''],[true,0n,0n,'\ud800']])assert.throws(()=>evaluateOwnedVectorCandidate(row.result.program,'purecase0',args,runtime));assert.equal(evaluateOwnedVectorCandidate(row.result.program,'purecase0',[false,0n,0n,'Ω😀'],runtime),true);});
test('registered JSON calls cannot silently broaden a closed primitive unit',limits,()=>{assert.throws(()=>pureFixture([{type:'bool',body:'const value=blank();return isNull(value);'}],{imports:'import {json_macro_null as blank} from "../runtime/json-macro-runtime.mjs";\nimport {serde_json_value_is_null as isNull} from "../runtime/json-runtime.mjs";\n'}),/closed primitive|qualified|call/u);});
test('pure primitive synchronization can be reissued over its own native source output',limits,()=>{const row=pureFixture(pureRows.slice(6)),first=sync(row),input=structuredClone(row.input);for(const edit of first.rustEdits)input.files.find(file=>file.path===edit.path).source=edit.after;input.files.find(file=>file.path===JS).source=first.javascript;input.files.find(file=>file.path===TS).source=first.typescript;const second=proposeOwnedVectorNativeSynchronization(input,{sourcePath:JS,typescriptPath:TS,javascript:first.javascript});assert.deepEqual(second.rustEdits,[]);assert.equal(second.typescript,first.typescript);assert.equal(second.runtimeParity,false);});
test('seven complete primitive source equations retain original source CST inverses and exact phases',limits,()=>{const plan=preparePrimitiveScalarUnitsSources();assert.equal(plan.files.length,7);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});

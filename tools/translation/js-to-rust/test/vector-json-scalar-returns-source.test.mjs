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
const scalarImports='import {serde_json_value_is_object as object,serde_json_value_as_bool as asBool,serde_json_value_as_u64 as asUnsigned,serde_json_value_as_i64 as asSigned} from "../runtime/json-runtime.mjs";\nimport {router_field_json_bool_field_or as boolField,router_field_json_u64_field_or as unsignedField,router_field_json_i64_field_or as signedField} from "../runtime/json-fields-runtime.mjs";\n';
const optionalUnsigned=value=>value.$==='Number'&&value.field0.$==='PosInt'?value.field0.field0:null,optionalSigned=value=>value.$==='Number'&&(value.field0.$==='NegInt'||value.field0.$==='PosInt'&&value.field0.field0<=9223372036854775807n)?value.field0.field0:null;
const fieldValue=(seed,key)=>seed.$==='Object'?seed.field0.entries.find(entry=>entry.key===key)?.value??nullValue():nullValue();
const scalarRows=[
 {type:'bool',body:'return object(seed);',expected:(seed)=>seed.$==='Object'},
 {type:'bool',body:'return boolField(seed,key,flag);',expected:(seed,flag,_offset,_amount,key)=>{const value=fieldValue(seed,key);return value.$==='Bool'?value.field0:flag;}},
 {type:'u64',body:'return unsignedField(seed,key,offset);',expected:(seed,_flag,offset,_amount,key)=>optionalUnsigned(fieldValue(seed,key))??offset},
 {type:'i64',body:'return signedField(seed,key,amount);',expected:(seed,_flag,_offset,amount,key)=>optionalSigned(fieldValue(seed,key))??amount},
 {type:'u64',body:'const value=asUnsigned(seed);if(value.$==="Some"){return value.field0;}else{return offset;}',expected:(seed,_flag,offset)=>optionalUnsigned(seed)??offset},
 {type:'i64',body:'const value=asSigned(seed);if(value.$==="Some"){return value.field0;}else{return amount;}',expected:(seed,_flag,_offset,amount)=>optionalSigned(seed)??amount},
 {type:'bool',body:'return offset>=1n&&amount<0n;',expected:(_seed,_flag,offset,amount)=>offset>=1n&&amount<0n},
 {type:'u64',body:'return 18446744073709551615n;',expected:()=>18446744073709551615n},
 {type:'i64',body:'return 0n;',expected:()=>0n},
 {type:'bool',body:'const value=asBool(seed);return value.$==="Some"?value.field0:flag;',expected:(seed,flag)=>seed.$==='Bool'?seed.field0:flag},
 {type:'u64',body:'const value=asUnsigned(seed);return value.$==="None"?0n:value.field0;',expected:seed=>optionalUnsigned(seed)??0n},
 {type:'u64',body:'const value=unsignedField(seed,key,offset);return value;',expected:(seed,_flag,offset,_amount,key)=>optionalUnsigned(fieldValue(seed,key))??offset},
];
function scalarFixture(rows){const source=scalarImports+rows.map((row,index)=>'export function scalarcase'+index+'(seed,flag,offset,amount,key){'+row.body+'}').join('\n'),typed=typeImport+scalarImports+rows.map((row,index)=>'export function scalarcase'+index+'(seed:JsonValue,flag:boolean,offset:bigint,amount:bigint,key:string):'+(row.type==='bool'?'boolean':'bigint')+'{'+row.body+'}').join('\n'),rust=rows.map((row,index)=>'pub fn scalarcase'+index+'(seed:&'+T+',flag:bool,offset:u64,amount:i64,key:&str)->'+row.type+'{'+(row.type==='bool'?'false':row.type==='u64'?'0_u64':'0_i64')+'}').join('\n'),input=data(rust,source,typed);input.files.find(file=>file.path==='src/lib.rs').source='pub mod translation_json_core;\npub mod translation_json_fields_core;\n'+input.files.find(file=>file.path==='src/lib.rs').source;input.files.push({path:'src/translation_json_core.rs',source:BOUNDED_JSON_CORE_SOURCE},{path:'src/translation_json_fields_core.rs',source:JSON_FIELDS_NATIVE_SOURCE});input.vectorBindings=rows.map((_row,index)=>({javascriptPath:JS,javascriptName:'scalarcase'+index,rustPath:'src/lib.rs',rustName:'scalarcase'+index}));const context=createOwnedVectorCandidateContext(input),result=translateOwnedVectorCandidate(source,{context,sourcePath:JS,typescriptOutputPath:TS});return {input,context,result};}
for(let start=0;start<scalarRows.length;start+=6){const selected=scalarRows.slice(start,start+6);for(const javascript of [false,true])test('six JSON-input primitive-return callers batch '+start+' authority '+javascript,limits,async()=>{const row=scalarFixture(selected),proposal=sync(row,javascript),project=forward(row,proposal);assert.equal(proposal.selectedFunctions.length,selected.length);assert.ok(row.result.program.every(item=>item.vectorOrigin.kind==='json-scalar'));await verifyTypedTargets(project,api=>{const seeds=[nullValue(),arrayValue([]),boolValue(true),boolValue(false),unsignedValue(0n),unsignedValue(18446744073709551615n),signedValue(-9223372036854775808n),objectValue([['value',boolValue(true)]]),objectValue([['value',unsignedValue(9n)]]),objectValue([['value',signedValue(-9n)]])];for(const seed of seeds)for(const flag of [true,false])for(const offset of [0n,1n,18446744073709551615n])for(const amount of [-9223372036854775808n,0n,9223372036854775807n]){const before=structuredClone(seed);for(let index=0;index<selected.length;index++)assert.equal(api['scalarcase'+index](seed,flag,offset,amount,'value'),selected[index].expected(seed,flag,offset,amount,'value'));assert.deepEqual(seed,before);}},{childTimeoutMs:20000});for(let index=0;index<selected.length;index++){const item=row.result.program[index],entry=project.executableDeclarations.find(entry=>entry.qualifiedName==='scalarcase'+index),own=entry.checkedSource().declaration,lowered=entry.lower(),domain=originalJsonScalarDomain(own,lowered);assert.equal(domain.kind,'json-scalar');assert.equal(domain.type,selected[index].type);assert.deepEqual(actualNativeJsonVectorTree(own,item,lowered),requestedNativeJsonVectorTree(item));}assert.equal(proposal.runtimeParity,false);assert.equal(proposal.rustExecuted,false);});}
test('repeated scalar synchronization rejoins canonical owners from actual JSON inputs',limits,()=>{const row=scalarFixture(scalarRows.slice(0,6)),first=sync(row),input=structuredClone(row.input);for(const edit of first.rustEdits)input.files.find(file=>file.path===edit.path).source=edit.after;input.files.find(file=>file.path===JS).source=first.javascript;input.files.find(file=>file.path===TS).source=first.typescript;const second=proposeOwnedVectorNativeSynchronization(input,{sourcePath:JS,typescriptPath:TS,javascript:first.javascript});assert.deepEqual(second.rustEdits,[]);assert.equal(second.javascript,first.javascript);assert.equal(second.typescript,first.typescript);assert.equal(second.runtimeParity,false);});
test('primitive return domains refuse incompatible written keywords and signed overflows',limits,()=>{for(const [type,body]of [['bool','return offset;'],['u64','return -1n;'],['i64','return 18446744073709551615n;']])assert.throws(()=>scalarFixture([{type,body,expected:()=>null}]));});
test('eight complete scalar-return equations retain original canonical validator/tail copies and exact phases',limits,()=>{const plan=prepareVectorJsonScalarReturnsSources();assert.equal(plan.files.length,8);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});

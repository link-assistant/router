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
import {prepareScalarLocalDomainsSources} from '../../prepare-scalar-local-domains-sources.mjs';
const scalarTypeImports='import type {json_macro_i64 as signedType,json_macro_u64 as unsignedType} from "../runtime/json-macro-runtime.mjs";\n',localRows=[
 {type:'bool',body:'const amount=0n;return amount<1n;',typed:'const amount:Parameters<typeof signedType>[0]=0n;return amount<1n;',expected:()=>true},
 {type:'bool',body:'const count=1n;return count===left;',typed:'const count:Parameters<typeof unsignedType>[0]=1n;return count===left;',expected:(_flag,left)=>left===1n},
 {type:'i64',body:'const amount=right;return amount;',typed:'const amount:Parameters<typeof signedType>[0]=right;return amount;',expected:(_flag,_left,right)=>right},
 {type:'i64',body:'const first=1n;const amount=first;return amount;',typed:'const first=1n;const amount:Parameters<typeof signedType>[0]=first;return amount;',expected:()=>1n},
 {type:'bool',body:'const amount=-9223372036854775808n;return amount<0n;',typed:'const amount:Parameters<typeof signedType>[0]=-9223372036854775808n;return amount<0n;',expected:()=>true},
 {type:'bool',body:'if(flag){const amount=0n;return amount===right;}else{const count=0n;return count===left;}',typed:'if(flag){const amount:Parameters<typeof signedType>[0]=0n;return amount===right;}else{const count:Parameters<typeof unsignedType>[0]=0n;return count===left;}',expected:(flag,left,right)=>flag?right===0n:left===0n},
];
function localFixture(rows=localRows){const source=rows.map((row,index)=>'export function localcase'+index+'(flag,left,right,key){'+row.body+'}').join('\n'),typed=scalarTypeImports+rows.map((row,index)=>'export function localcase'+index+'(flag:boolean,left:bigint,right:bigint,key:string):'+(row.type==='bool'?'boolean':'bigint')+'{'+row.typed+'}').join('\n'),rust=rows.map((row,index)=>'pub fn localcase'+index+'(flag:bool,left:u64,right:i64,key:&str)->'+row.type+'{'+(row.type==='bool'?'false':row.type==='u64'?'0_u64':'0_i64')+'}').join('\n'),input=data(rust,source,typed);input.vectorBindings=rows.map((_row,index)=>({javascriptPath:JS,javascriptName:'localcase'+index,rustPath:'src/lib.rs',rustName:'localcase'+index}));const context=createOwnedVectorCandidateContext(input),result=translateOwnedVectorCandidate(source,{context,sourcePath:JS,typescriptOutputPath:TS});return {input,context,result};}
for(const javascript of [false,true])test('six explicit scalar local domains survive canonical paired source and authority '+javascript,limits,async()=>{const row=localFixture(),proposal=sync(row,javascript),project=forward(row,proposal);assert.ok(proposal.typescript.includes('import type { json_macro_i64 as __ro_json_macro_i64'));assert.ok(proposal.typescript.includes('Parameters<typeof __ro_json_macro_i64>[0]'));assert.ok(proposal.typescript.includes('Parameters<typeof __ro_json_macro_u64>[0]'));assert.equal(proposal.javascript.includes('import type'),false);await verifyTypedTargets(project,api=>{for(const flag of [true,false])for(const left of [0n,1n,18446744073709551615n])for(const right of [-9223372036854775808n,0n,9223372036854775807n])for(let index=0;index<localRows.length;index++)assert.equal(api['localcase'+index](flag,left,right,''),localRows[index].expected(flag,left,right));},{childTimeoutMs:20000});for(const item of row.result.program){const entry=project.executableDeclarations.find(entry=>entry.qualifiedName===item.vectorOrigin.original.qualifiedName);assert.ok(entry);assert.deepEqual(actualNativeJsonVectorTree(entry.checkedSource().declaration,item,entry.lower()),requestedNativeJsonVectorTree(item));}assert.equal(proposal.runtimeParity,false);assert.equal(proposal.rustExecuted,false);});
test('local domain annotations do not coerce unproved unsigned inputs or overflowing literals',limits,()=>{for(const row of [{type:'i64',body:'const amount=left;return amount;',typed:'const amount:Parameters<typeof signedType>[0]=left;return amount;'},{type:'i64',body:'const amount=18446744073709551615n;return amount;',typed:'const amount:Parameters<typeof signedType>[0]=18446744073709551615n;return amount;'},{type:'u64',body:'const count=-1n;return count;',typed:'const count:Parameters<typeof unsignedType>[0]=-1n;return count;'}])assert.throws(()=>localFixture([row]));});
test('JavaScript literal edits retain only matching immutable local type declarations',limits,async()=>{const row=localFixture(),edited=row.input.files.find(file=>file.path===JS).source.replace('const amount=0n;return amount<1n;','const amount=2n;return amount<1n;'),proposal=proposeOwnedVectorNativeSynchronization(row.input,{sourcePath:JS,typescriptPath:TS,javascript:edited}),project=forward(row,proposal);await verifyTypedTargets(project,api=>{assert.equal(api.localcase0(false,0n,0n,''),false);},{childTimeoutMs:20000});assert.ok(proposal.typescript.includes('Parameters<typeof __ro_json_macro_i64>[0]'));assert.equal(proposal.runtimeParity,false);});
test('type-only local witnesses are resolved from actual fixed runtime/declarations not an imported spelling',limits,()=>{const row=localFixture(),input=structuredClone(row.input);input.files.find(file=>file.path===TS).source=input.files.find(file=>file.path===TS).source.replace('../runtime/json-macro-runtime.mjs','../fake.mjs');input.files.push({path:'typed/fake.mjs',source:'export function json_macro_i64(value){return value;}export function json_macro_u64(value){return value;}'});assert.throws(()=>translateOwnedVectorCandidate(input.files.find(file=>file.path===JS).source,{context:createOwnedVectorCandidateContext(input),sourcePath:JS,typescriptOutputPath:TS}));});
test('signed and unsigned local annotations are reproduced in a fresh second source synchronization',limits,()=>{const row=localFixture(),first=sync(row),input=structuredClone(row.input);for(const edit of first.rustEdits)input.files.find(file=>file.path===edit.path).source=edit.after;input.files.find(file=>file.path===JS).source=first.javascript;input.files.find(file=>file.path===TS).source=first.typescript;const second=proposeOwnedVectorNativeSynchronization(input,{sourcePath:JS,typescriptPath:TS,javascript:first.javascript});assert.deepEqual(second.rustEdits,[]);assert.equal(second.typescript,first.typescript);assert.equal(second.javascript,first.javascript);assert.equal(second.runtimeParity,false);});
test('four complete scalar local equations retain originals CST inverses and exact phases',limits,()=>{const plan=prepareScalarLocalDomainsSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});

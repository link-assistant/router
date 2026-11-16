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
const stdRows=[
 ['serde_json_value_get_string','json-ref','"present"'],
 ['serde_json_value_pointer','json-ref','"/a~1b/~0key"'],
 ['serde_json_value_as_str','str',''],
 ['serde_json_value_as_bool','bool',''],
 ['serde_json_value_as_u64','u64',''],
 ['serde_json_value_as_i64','i64',''],
],stdConstructors='import {json_macro_null as blank,json_macro_string as text,json_macro_bool as boolean,json_macro_u64 as unsigned,json_macro_i64 as signed} from "../runtime/json-macro-runtime.mjs";\n';
function stdPayload(role){return role==='json-ref'?objectValue([['nested',arrayValue([stringValue('Ω😀')])]]):role==='str'?stringValue('Ω😀'):role==='bool'?boolValue(true):role==='u64'?unsignedValue(18446744073709551615n):signedValue(-9223372036854775808n);}
function stdInput(row,value=stdPayload(row[1])){return row[0].endsWith('get_string')?objectValue([['present',value]]):row[0].endsWith('pointer')?objectValue([['a/b',objectValue([['~key',value]])]]):value;}
function stdFixture(style=0){
 const imports=stdConstructors+'import { '+stdRows.map((row,index)=>row[0]+' as stdread'+index).join(', ')+' } from "../runtime/json-runtime.mjs";\n',bodies=stdRows.map((row,index)=>{const call='stdread'+index+'(seed'+(row[2]?','+row[2]:'')+')',wrapped=({str:'text',bool:'boolean',u64:'unsigned',i64:'signed'}[row[1]]??'');const some='return ['+(wrapped?wrapped+'(selected.field0)':'selected.field0')+'];',none='return [blank(),blank()];';return 'const selected='+call+';'+(style===0?'if(selected.$==="Some"){'+some+'}else{'+none+'}':style===1?'if(selected.$==="None"){'+none+'}else{'+some+'}':'if(!(selected.$==="None")){'+some+'}else{'+none+'}');}),source=imports+stdRows.map((_row,index)=>'export function stdcase'+index+'(seed){'+bodies[index]+'}').join('\n'),typed=typeImport+imports+stdRows.map((_row,index)=>'export function stdcase'+index+'(seed:JsonValue):readonly JsonValue[]{'+bodies[index]+'}').join('\n'),rust=stdRows.map((_row,index)=>'pub fn stdcase'+index+'(seed:&'+T+')->Vec<'+T+'>{'+C+'vec!['+B+'json_checked_copy(seed)]}').join('\n'),input=data(rust,source,typed);input.files.find(file=>file.path==='src/lib.rs').source='pub mod translation_json_core;\n'+input.files.find(file=>file.path==='src/lib.rs').source;input.files.push({path:'src/translation_json_core.rs',source:BOUNDED_JSON_CORE_SOURCE});input.vectorBindings=stdRows.map((_row,index)=>({javascriptPath:JS,javascriptName:'stdcase'+index,rustPath:'src/lib.rs',rustName:'stdcase'+index}));const context=createOwnedVectorCandidateContext(input),result=translateOwnedVectorCandidate(source,{context,sourcePath:JS,typescriptOutputPath:TS});return {input,context,result};
}
test('standard optional reader catalog has all six intended native signatures without opaque layouts',limits,()=>{assert.equal(stdRows.length,6);for(const [name,payload]of stdRows){const op=ownedJsonReaderOperation(name);assert.ok(op);assert.equal(ownedJsonOptionalPayload(op.ret),payload);const args=op.args.map((_role,index)=>'__ro_arg_'+index);assert.equal(nativeJsonOptionalReaderSource(name,args),'::serde_json::Value::'+op.method+'('+args.join(', ')+')');}for(const name of ['serde_json_value_as_f64','serde_json_value_as_array','serde_json_value_as_object','serde_json_value_as_number','serde_json_value_as_null','serde_json_value_get_usize']){const op=ownedJsonReaderOperation(name);assert.throws(()=>nativeJsonOptionalReaderSource(name,op.args.map((_role,index)=>'__ro_arg_'+index)));}});
for(const style of [0,1,2])test('six standard optional readers share complete Some/None batch style '+style,limits,async()=>{
 const row=stdFixture(style),proposal=sync(row),project=forward(row,proposal);assert.equal(proposal.selectedFunctions.length,6);assert.equal(proposal.rustEdits[0].after.includes('unreachable!'),false);await verifyTypedTargets(project,api=>{for(let index=0;index<stdRows.length;index++){const operation=stdRows[index],seed=stdInput(operation),before=structuredClone(seed),out=api['stdcase'+index](seed);assert.deepEqual(out,[stdPayload(operation[1])]);assert.deepEqual(seed,before);if(operation[1]==='json-ref'){const actual=operation[0].endsWith('get_string')?seed.field0.entries[0].value:seed.field0.entries[0].value.field0.entries[0].value;assert.notEqual(out[0],actual);assert.deepEqual(api['stdcase'+index](stdInput(operation,nullValue())),[nullValue()]);}assert.deepEqual(api['stdcase'+index](nullValue()),[nullValue(),nullValue()]);assert.deepEqual(api['stdcase'+index](arrayValue([])),[nullValue(),nullValue()]);}},{childTimeoutMs:20000});assert.equal(proposal.runtimeParity,false);assert.equal(proposal.rustExecuted,false);
});
test('JavaScript authority retains standard optional reader source order and genuine payload owners',limits,()=>{const row=stdFixture(1),proposal=sync(row,true),project=forward(row,proposal);for(let index=0;index<stdRows.length;index++){const entry=project.executableDeclarations.find(entry=>entry.qualifiedName==='stdcase'+index);assert.ok(entry);assert.deepEqual(actualNativeJsonVectorTree(entry.checkedSource().declaration,row.result.program[index],entry.lower()),requestedNativeJsonVectorTree(row.result.program[index]));}assert.equal(proposal.nativeInstalled,false);});
test('standard optional source renderer refuses unbound text and cannot supply semantic permission',limits,()=>{for(const args of [['seed','"key"'],['seed','callee()'],['seed','__ro_arg_0;panic!()'],['seed'],['seed','__ro_arg_0','extra']])assert.throws(()=>nativeJsonOptionalReaderSource('serde_json_value_get_string',args));});
test('four complete standard optional equations retain whole originals CST inverses and both phases',limits,()=>{const plan=prepareVectorJsonStandardOptionsSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});

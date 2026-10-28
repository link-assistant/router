// Native bounded JSON emitter independent source cases. ALL UNRUN.
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

import {emitOwnedCoreProgram} from '../owned-vector-candidate-operations.mjs';
import {prepareVectorNativeJsonEmitterSources} from '../../prepare-vector-native-json-emitter-sources.mjs';
const emit=row=>emitOwnedCoreProgram(row.result.program,'rust',{nativeJsonSource:true});
test('every owned and shared JSON input is validated before an empty branch',limits,()=>{
 for(const shared of [false,true]){const row=pair('pub fn values(flag:bool,seed:'+(shared?'&':'')+T+')->Vec<'+T+'>{if flag{'+C+'vec!['+(shared?C+'json_copy(seed)':'seed')+']}else{'+C+'vec![]}}','if(flag){return [seed];}else{return [];}',{args:'flag,seed',typedArgs:'flag:boolean,seed:JsonValue'}),native=emit(row);assert.ok(native.includes('let __ro_json_guard_1 = crate::translation_json_core::json_validate('+(shared?'':'&')+'seed);'));assert.ok(native.indexOf('json_validate(')<native.indexOf('if flag'));assert.ok(native.includes('crate::translation_core::vec![]'));assert.equal(native.includes('fn __ro_domain'),false);assert.equal(native.includes('return '),false);}
});
test('native JSON copies preserve immutable local evaluation and independent owned elements',limits,()=>{
 const row=pair('pub fn values(seed:'+T+')->Vec<'+T+'>{'+C+'vec![seed]}','const saved=seed;return [saved,seed];',{args:'seed',typedArgs:'seed:JsonValue'}),native=emit(row);assert.ok(native.includes('let saved = crate::translation_json_core::json_checked_copy(&seed);'));assert.ok(native.includes('crate::translation_core::vec![crate::translation_json_core::json_checked_copy(&saved), crate::translation_json_core::json_checked_copy(&seed)]'));assert.equal(native.includes('__ro_copy('),false);assert.equal(native.includes('__ro_domain('),false);
});
test('JSON constructor children and result validation remain inside the same evaluated block',limits,()=>{
 const imports='import {json_macro_array as array,json_macro_null as blank} from "../runtime/json-macro-runtime.mjs";\n',row=pair('pub fn values()->Vec<'+T+'>{'+C+'vec!['+C+'json!(null)]}','const saved=array([blank(),blank()]);return [saved];',{imports}),native=emit(row);assert.ok(native.includes('let saved = { let __ro_json_'));assert.ok(native.includes('let __ro_result = crate::translation_core::json!('));assert.ok(native.includes(' = crate::translation_json_core::json_validate(&__ro_result); __ro_result }'));assert.ok(native.indexOf('let saved')<native.indexOf('crate::translation_core::vec!['));
});
test('new emission mode does not change existing Rust or TypeScript output and rejects public metadata permits',limits,()=>{
 const row=pair('pub fn values()->Vec<'+T+'>{'+C+'vec![]}','return [];'),normal=emitOwnedVectorCandidateRust(row.result.program);assert.ok(normal.includes('fn __ro_domain'));assert.equal(emitOwnedCoreProgram(row.result.program,'rust',{nativeJsonSource:false}),normal);assert.equal(emitOwnedCoreProgram(row.result.program,'typescript',{nativeJsonSource:false,outputPath:'typed/src/reverse.mts'}),row.result.typescript);assert.throws(()=>emitOwnedCoreProgram(row.result.program,'typescript',{nativeJsonSource:true}));assert.throws(()=>emitOwnedCoreProgram(row.result.program,'rust',{nativeJsonSource:'true'}));assert.throws(()=>emitOwnedCoreProgram([{...row.result.program[0],body:[{kind:'return',value:{kind:'json-vector-literal',items:[],type:'json-list-owned',root:null}}],source:{...row.result.program[0].source,source:'forged'}}],'rust',{nativeJsonSource:true}));assert.throws(()=>emitOwnedCoreProgram([],'rust',{nativeJsonSource:true}));
});
test('three complete native JSON emitter equations preserve full originals and two ordered phases',limits,()=>{const plan=prepareVectorNativeJsonEmitterSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});

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

test('actual by-value Json input produces independent owned canonical elements in reverse/evaluator and retains its original Rust source',limits,async t=>{
 const rust='pub fn values(seed:'+T+')->Vec<'+T+'>{'+C+'vec![seed]}',row=pair(rust,'const held=seed;return [held,seed];',{args:'seed',typedArgs:'seed:JsonValue'});
 assert.equal(row.result.program[0].returns,'json-list-owned');assert.equal(row.result.program[0].vectorOrigin.kind,'json-vector');assert.equal(row.result.program[0].params[0].type,'json');assert.equal(row.result.program[0].vectorOrigin.original.functionSource,rust);assert.ok(row.result.rust.includes('::std::vec::Vec<crate::translation_core::Json>'));
 const runs=await targets(t,row);for(const run of runs){const seed=arrayValue([stringValue('Ω😀'),nullValue()]),out=run(seed);assert.deepEqual(out,[seed,seed]);}for(const run of runs.slice(2)){const seed=arrayValue([nullValue()]),out=run(seed);assert.notEqual(out[0],seed);assert.notEqual(out[0],out[1]);assert.notEqual(out[0].field0,out[1].field0);}
 assert.deepEqual(parseOwnedVectorCandidateMeta(row.result.meta,{context:row.context}),row.result.program);
});
test('shared native Json stays shared in the argument and yields owned vector copies',limits,async t=>{
 const row=pair('pub fn values(seed:&'+T+')->Vec<'+T+'>{'+C+'vec!['+C+'json_copy(seed)]}','return [seed,seed];',{args:'seed',typedArgs:'seed:JsonValue'});assert.equal(row.result.program[0].params[0].type,'json-ref');assert.ok(row.result.rust.includes('seed: &crate::translation_core::Json'));for(const run of await targets(t,row))assert.deepEqual(run(nullValue()),[nullValue(),nullValue()]);
});
test('actual imported constructors and full conditional collection returns compose with existing original-source checking',limits,async t=>{
 const imports='import {json_macro_null as blank,json_macro_bool as boolean} from "../runtime/json-macro-runtime.mjs";\n',row=pair('pub fn values(flag:bool,seed:'+T+')->Vec<'+T+'>{if flag{'+C+'vec![seed]}else{'+C+'vec![]}}','if(flag){const saved=[blank(),boolean(flag),seed];return saved;}else{return [];}',{args:'flag,seed',typedArgs:'flag:boolean,seed:JsonValue',imports});
 for(const run of await targets(t,row)){assert.deepEqual(run(true,nullValue()),[nullValue(),{$:'Bool',field0:true},nullValue()]);assert.deepEqual(run(false,nullValue()),[]);}
});
test('empty branch still validates unused actual Json/bool inputs before its return',limits,async t=>{
 const row=pair('pub fn values(flag:bool,seed:'+T+')->Vec<'+T+'>{if flag{'+C+'vec![seed]}else{'+C+'vec![]}}','if(flag){return [seed];}else{return [];}',{args:'flag,seed',typedArgs:'flag:boolean,seed:JsonValue'}),runs=await targets(t,row);
 for(const run of runs.slice(2)){assert.deepEqual(run(false,nullValue()),[]);for(const bad of [null,true,{},{$:'String',field0:'\ud800'},{$:'Other'}])assert.throws(()=>run(false,bad));for(const bad of [0,1,'true',{},null])assert.throws(()=>run(bad,nullValue()));}
});
test('nominal type names, edited native sources and forged metadata cannot substitute for fresh canonical layout/source checks',limits,()=>{
 const rust='pub fn values(seed:'+T+')->Vec<'+T+'>{'+C+'vec![seed]}',body='return [seed];',options={args:'seed',typedArgs:'seed:JsonValue'};
 assert.throws(()=>pair('pub struct Json;pub fn values(seed:Json)->Vec<Json>{'+C+'vec![seed]}',body,options));
 const row=pair(rust,body,options),meta=row.result.meta.replaceAll('json-vector','json-scalar');assert.notEqual(meta,row.result.meta);assert.throws(()=>parseOwnedVectorCandidateMeta(meta,{context:row.context}));
 const changed={...row.input,files:row.input.files.map(file=>file.path==='src/lib.rs'?{...file,source:file.source.replace('Vec<'+T+'>','Vec<bool>')}:file)},context=createOwnedVectorCandidateContext(changed);assert.throws(()=>parseOwnedVectorCandidateMeta(row.result.meta,{context}));
});
test('sparse spread scalar payload mutation and arbitrary array/constructor shapes remain source refusals',limits,()=>{
 const rust='pub fn values(seed:'+T+')->Vec<'+T+'>{'+C+'vec![seed]}';for(const body of ['return [,seed];','return [...seed];','return [true];','return [{$:"Null"}];','seed.field0=1;return [seed];','return Array.of(seed);','const result=[seed];result.push(seed);return result;'])assert.throws(()=>pair(rust,body,{args:'seed',typedArgs:'seed:JsonValue'}));
 assert.throws(()=>pair(rust,'return [seed];',{args:'seed',typedArgs:'seed:boolean'}));
});
test('complete reverse JSON vector compiler equations retain inverse bytes and both substitution phases',limits,()=>{const plan=prepareVectorJsonReverseSources();assert.equal(plan.files.length,6);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});

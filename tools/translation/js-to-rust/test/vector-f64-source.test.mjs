// Independent complete f64 reverse source cases. ALL UNRUN.
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



test('finite f64 literal reverse source retains negative zero extrema and subnormals in strict TS and evaluator',limits,async t=>{
 const body='return [-0.0,0.5,1.7976931348623157e308,5e-324];',row=translate('pub fn values()->Vec<f64>{'+C+'vec![0.0f64]}','export function values(){'+body+'}','export function values():readonly number[]{'+body+'}');assert.equal(row.result.program[0].returns,'vec:f64');assert.ok(row.result.rust.includes('-0.0_f64'));for(const run of await targets(t,row)){const result=run();assert.ok(Object.is(result[0],-0));assert.deepEqual(result.slice(1),[0.5,Number.MAX_VALUE,Number.MIN_VALUE]);}assert.deepEqual(parseOwnedVectorCandidateMeta(row.result.meta,{context:row.context}),row.result.program);
});
test('fresh native f64 parameters carry IEEE values through source aliases and bool branches without narrowing',limits,async t=>{
 const rust='pub fn values(flag:bool,seed:f64)->Vec<f64>{if flag{'+C+'vec![seed;2]}else{'+C+'vec![]}}',body='const saved=seed;if(flag){return [saved,seed];}else{return [];}',row=translate(rust,'export function values(flag,seed){'+body+'}','export function values(flag:boolean,seed:number):readonly number[]{'+body+'}');for(const run of await targets(t,row))for(const seed of [-0,Number.MIN_VALUE,Number.MAX_VALUE,Infinity,-Infinity,NaN]){const result=run(true,seed);assert.ok(Object.is(result[0],seed));assert.ok(Object.is(result[1],seed));assert.deepEqual(run(false,seed),[]);}
});
test('wrong native domains nonfinite source literals and BigInt inputs remain refusals',limits,async t=>{
 const rust='pub fn values(seed:f64)->Vec<f64>{'+C+'vec![seed;2]}';assert.throws(()=>translate(rust,'export function values(seed){return [seed];}','export function values(seed:bigint):readonly number[]{return [seed];}'));
 for(const body of ['return [1n];','return [1e309];','return [NaN];','return [Infinity];'])assert.throws(()=>translate('pub fn values()->Vec<f64>{'+C+'vec![0.0f64]}','export function values(){'+body+'}','export function values():readonly number[]{'+body+'}'));
 const row=translate(rust,'export function values(seed){return [seed];}','export function values(seed:number):readonly number[]{return [seed];}'),runs=await targets(t,row);for(const run of runs.slice(2))for(const value of [1n,'1',null,{},new Number(1)])assert.throws(()=>run(value));
});

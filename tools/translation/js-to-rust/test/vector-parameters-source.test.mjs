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
import {ownedCoreRuntimeSources} from '../owned-core-source.mjs';
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


test('actual original primitive parameters bind distinct source names and preserve their Rust native types',limits,async t=>{
 const rust='pub fn values(seed:u8)->Vec<u8>{'+C+'vec![seed;3]}',body='const saved=input;return [saved,input];',row=translate(rust,'export function values(input){'+body+'}','export function values(input:bigint):readonly bigint[]{'+body+'}');assert.equal(row.result.program[0].params[0].type,'u8');assert.equal(row.result.program[0].vectorOrigin.original.signature.params.length,1);assert.match(row.result.rust,/__ro_vector_input_0: ::core::primitive::u8/);for(const run of await targets(t,row)){assert.deepEqual(run(0n),[0n,0n]);assert.deepEqual(run(255n),[255n,255n]);}const decoded=parseOwnedVectorCandidateMeta(row.result.meta,{context:row.context});assert.deepEqual(decoded,row.result.program);
});
test('multiple bool parameters preserve source symbols and do not alias equal spellings from other scopes',limits,async t=>{
 const body='const saved=second;return (()=>{const held=saved;return [first,held,second];})();',row=translate('pub fn values(left:bool,right:bool)->Vec<bool>{'+C+'vec![left,right]}','export function values(first,second){'+body+'}','export function values(first:boolean,second:boolean):readonly boolean[]{'+body+'}');for(const run of await targets(t,row))assert.deepEqual(run(true,false),[true,false,false]);
});
test('native signed and machine domains survive reverse type emission',limits,async t=>{
 for(const [type,value] of [['i8',-128n],['u128',340282366920938463463374607431768211455n],['usize',18446744073709551615n],['isize',-9223372036854775808n]]){const row=translate('pub fn values(seed:'+type+')->Vec<'+type+'>{'+C+'vec![seed;2]}','export function values(seed){return [seed,seed];}','export function values(seed:bigint):readonly bigint[]{return [seed,seed];}');assert.ok(row.result.rust.includes('::core::primitive::'+type));for(const run of await targets(t,row))assert.deepEqual(run(value),[value,value]);}
});
test('reverse emitted targets and evaluator enforce all actual original argument bounds including unused zero-output seeds',limits,async t=>{
 const row=translate('pub fn values(seed:u8)->Vec<u8>{'+C+'vec![seed;0]}','export function values(seed){return [];}','export function values(seed:bigint):readonly bigint[]{return [];}'),runs=await targets(t,row);for(const run of runs.slice(2)){assert.deepEqual(run(255n),[]);for(const value of [-1n,256n,1,true,'1',null])assert.throws(()=>run(value));}
});
test('changed arity annotation rest default borrowed and mixed native domains remain explicit refusals',limits,()=>{
 const rust='pub fn values(seed:u8)->Vec<u8>{'+C+'vec![seed;2]}';
 for(const [js,typed] of [['export function values(){return [1n];}','export function values():readonly bigint[]{return [1n];}'],['export function values(seed){return [seed];}','export function values(seed:boolean):readonly bigint[]{return [seed];}'],['export function values(seed=1n){return [seed];}','export function values(seed:bigint=1n):readonly bigint[]{return [seed];}'],['export function values(...seed){return [seed];}','export function values(...seed:bigint[]):readonly bigint[]{return [seed];}']])assert.throws(()=>translate(rust,js,typed));
 assert.throws(()=>translate('pub fn values(seed:u16)->Vec<u8>{'+C+'vec![1u8]}','export function values(seed){return [seed];}','export function values(seed:bigint):readonly bigint[]{return [seed];}'));
 assert.throws(()=>translate('pub fn values(seed:&u8)->Vec<u8>{'+C+'vec![1u8]}','export function values(seed){return [seed];}','export function values(seed:bigint):readonly bigint[]{return [seed];}'));
});

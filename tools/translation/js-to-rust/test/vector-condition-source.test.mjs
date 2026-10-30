// Independent actual conditional vector reverse cases. ALL UNRUN.
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



test('actual Rust vector branches retain fresh scalar domains through emitted JS strict TS reverse and evaluator',limits,async t=>{
 const rust='pub fn values(flag:bool,seed:u8)->Vec<u8>{if flag{'+C+'vec![seed;3]}else{'+C+'vec![0u8]}}',body='if(flag){return [seed,seed];}else{return [0n];}',row=translate(rust,'export function values(flag,seed){'+body+'}','export function values(flag:boolean,seed:bigint):readonly bigint[]{'+body+'}');assert.equal(row.result.program[0].body[0].kind,'if');for(const run of await targets(t,row)){assert.deepEqual(run(true,7n),[7n,7n]);assert.deepEqual(run(false,7n),[0n]);}assert.deepEqual(parseOwnedVectorCandidateMeta(row.result.meta,{context:row.context}),row.result.program);
});
test('boolean short-circuit conditions aliases and else-if retain complete leaf validation and source symbols',limits,async t=>{
 const rust='pub fn values(first:bool,second:bool,seed:u8)->Vec<u8>{if first{'+C+'vec![seed]}else{'+C+'vec![0u8]}}',body='const saved=seed;const choice=first;if(choice&&!second){return [saved];}else if(second||!first){return [0n,1n];}else{return [];}',row=translate(rust,'export function values(first,second,seed){'+body+'}','export function values(first:boolean,second:boolean,seed:bigint):readonly bigint[]{'+body+'}');for(const run of await targets(t,row))for(const first of [true,false])for(const second of [true,false])assert.deepEqual(run(first,second,9n),first&&!second?[9n]:[0n,1n]);
});
test('numeric truthiness calls mutation incomplete branches and wrong scalar leaves are refused',limits,()=>{
 const rust='pub fn values(flag:bool,seed:u8)->Vec<u8>{if flag{'+C+'vec![seed]}else{'+C+'vec![0u8]}}';
 for(const body of ['if(seed){return [seed];}else{return [0n];}','if(external()){return [seed];}else{return [0n];}','if(flag){return [seed];}return [0n];','if(flag){return [seed];}else{return [256n];}','let saved=seed;if(flag){return [saved];}else{return [0n];}','if(flag){seed=1n;return [seed];}else{return [0n];}','if(flag){return [seed];}else{return [flag];}'])assert.throws(()=>translate(rust,'export function values(flag,seed){'+body+'}','export function values(flag:boolean,seed:bigint):readonly bigint[]{'+body+'}'));
});
test('all native input guards still apply before branch selection in emitted reverse target and evaluator',limits,async t=>{
 const rust='pub fn values(flag:bool,seed:u8)->Vec<u8>{if flag{'+C+'vec![seed]}else{'+C+'vec![]}}',body='if(flag){return [seed];}else{return [];}',row=translate(rust,'export function values(flag,seed){'+body+'}','export function values(flag:boolean,seed:bigint):readonly bigint[]{'+body+'}'),runs=await targets(t,row);for(const run of runs.slice(2)){assert.deepEqual(run(false,7n),[]);assert.throws(()=>run(false,256n));assert.throws(()=>run(0,7n));}
});

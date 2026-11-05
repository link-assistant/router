// Independent actual native static text reverse source. ALL UNRUN.
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



test('actual static native str vector returns borrow literals without allocating owned Strings',limits,async t=>{
 const rust='pub fn values()->Vec<&\'static str>{'+C+'vec!["native";2]}',body='return ["","Ω😀","Ω😀"];',row=translate(rust,'export function values(){'+body+'}','export function values():readonly string[]{'+body+'}');assert.equal(row.result.program[0].returns,'vec:str-static');assert.ok(row.result.rust.includes("Vec<&'static ::std::primitive::str>"));assert.ok(!row.result.rust.includes('::std::convert::From<&::std::primitive::str>'));for(const run of await targets(t,row))assert.deepEqual(run(),['','Ω😀','Ω😀']);assert.deepEqual(parseOwnedVectorCandidateMeta(row.result.meta,{context:row.context}),row.result.program);
});
test('actual static str arguments retain explicit native lifetime and reuse the existing Unicode guards',limits,async t=>{
 const rust='pub fn values(flag:bool,seed:&\'static str)->Vec<&\'static str>{if flag{'+C+'vec![seed;2]}else{'+C+'vec![]}}',body='if(flag){return [seed,seed];}else{return [];}',row=translate(rust,'export function values(flag,seed){'+body+'}','export function values(flag:boolean,seed:string):readonly string[]{'+body+'}');assert.ok(row.result.rust.includes("__ro_vector_input_1: &'static ::std::primitive::str"));const runs=await targets(t,row);for(const run of runs){assert.deepEqual(run(true,'Ω😀'),['Ω😀','Ω😀']);assert.deepEqual(run(false,'Ω😀'),[]);}for(const run of runs.slice(2))assert.throws(()=>run(false,'\ud800'));
});
test('elided borrowed source signatures are never relabelled static by a string return annotation',limits,()=>{
 const js='export function values(seed){return [seed];}',typed='export function values(seed:string):readonly string[]{return [seed];}';assert.throws(()=>translate('pub fn values(seed:&str)->Vec<&str>{'+C+'vec![seed;2]}',js,typed));assert.throws(()=>translate('pub fn values(seed:&str)->Vec<&\'static str>{'+C+'vec![seed;0]}',js,typed));
});

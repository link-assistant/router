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
 return [()=>javascript.values(),()=>typed.values(),()=>reverse.values(),()=>evaluateOwnedVectorCandidate(row.result.program,'values',[],runtime)];
}

test('actual complete private source copies retain native spans both CST phases whole inverses and old defaults',limits,()=>{
 const proposal=prepareOwnedVectorCandidateSources();assert.equal(proposal.files.length,3);assert.equal(proposal.defaultAPIsUnchanged,true);assert.equal(proposal.productionSelected,false);
 for(const row of proposal.files){assert.equal(row.current,row.after);assert.equal(row.inverse,row.before);assert.equal(row.before,readFileSync(join(ROOT,row.originalPath),'utf8'));assert.equal(row.sequence.languageRules.length,1);assert.equal(row.sequence.repositoryRules.length,1);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);}
 assert.match(proposal.files[0].after,/finally\{analysis\.vectorProfiles\?\.clear\(\);\}/u);assert.match(proposal.files[2].after,/router-owned-vector-source-candidate-document-v1/u);
});

test('actual bool Vec profile checks edited complete arrays through CST meta strict targets and a fresh-list evaluator',limits,async t=>{
 const row=translate('pub fn values()->Vec<bool>{'+C+'vec![true]}','export function values(){return [false,true];}','export function values():readonly boolean[]{return [false,true];}');
 assert.equal(row.result.program[0].returns,'vec:bool');assert.equal(row.result.program[0].vectorOrigin.original.functionSource,'pub fn values()->Vec<bool>{'+C+'vec![true]}');assert.equal(row.result.program[0].vectorOrigin.original.signature.returns.rustOwnership.source,'Vec');assert.match(row.result.rust,/Vec<bool>/u);assert.match(row.result.rust,/translation_core::vec!\[false, true\]/u);
 const runs=await targets(t,row);for(const run of runs){const first=run(),second=run();assert.deepStrictEqual(first,[false,true]);assert.deepStrictEqual(second,first);assert.notEqual(first,second);}
 const decoded=parseOwnedVectorCandidateMeta(row.result.meta,{context:row.context});assert.deepStrictEqual(decoded,row.result.program);assert.equal(emitOwnedVectorCandidateRust(decoded),row.result.rust);
});

test('empty contextual Vec and actual u8 bounds retain integer width rather than the readonly octet borrow domain',limits,async t=>{
 const row=translate('pub fn values()->Vec<u8>{'+C+'vec![]}','export function values(){return [0n,255n];}','export function values():readonly bigint[]{return [0n,255n];}');assert.equal(row.result.program[0].returns,'vec:u8');assert.match(row.result.rust,/Vec<u8>/u);assert.match(row.result.rust,/0_u8, 255_u8/u);assert.notEqual(row.result.program[0].returns,'bytes-ref');for(const run of await targets(t,row))assert.deepStrictEqual(run(),[0n,255n]);
 assert.throws(()=>translate('pub fn values()->Vec<u8>{'+C+'vec![]}','export function values(){return [256n];}','export function values():readonly bigint[]{return [256n];}'),/outside actual original primitive bounds/u);
});

test('actual signed original primitive supports both boundary literals without granting signedness from JavaScript spelling',limits,async t=>{
 const row=translate('pub fn values()->Vec<i8>{'+C+'vec![0i8]}','export function values(){return [-128n,127n];}','export function values():readonly bigint[]{return [-128n,127n];}');assert.equal(row.result.program[0].returns,'vec:i8');assert.match(row.result.rust,/-128_i8, 127_i8/u);for(const run of await targets(t,row))assert.deepStrictEqual(run(),[-128n,127n]);
 assert.throws(()=>translate('pub fn values()->Vec<i8>{'+C+'vec![0i8]}','export function values(){return [-129n];}','export function values():readonly bigint[]{return [-129n];}'),/outside actual original primitive bounds/u);
});

test('fixed arrays aliases mutation spread repetition borrowed text and mismatched complete pairs remain explicit refusals',limits,()=>{
 const rust='pub fn values()->Vec<bool>{'+C+'vec![true]}',plain='export function values(){return [true];}',typed='export function values():readonly boolean[]{return [true];}';
 assert.throws(()=>translate('pub fn values()->[bool;1]{[true]}',plain,typed),/owned Vec signature/u);
 for(const body of ['const alias=[true];return alias;','const alias=[true];alias.push(false);return alias;','return [...[true]];','return Array(2).fill(true);'])assert.throws(()=>translate(rust,'export function values(){'+body+'}','export function values():readonly boolean[]{'+body+'}'),/array-literal|spread|sparse|call/u);
 assert.throws(()=>translate('pub fn values()->Vec<&\'static '+C+'Str>{'+C+'vec!["text"]}','export function values(){return ["text"];}','export function values():readonly string[]{return ["text"];}'),/borrowed vector element|text remains refused/u);
 assert.throws(()=>translate(rust,plain,typed.replace('[true]','[false]')),/tokens|source/u);
});

test('fresh original joins reject source corruption supplied verdicts unissued clones and forged source/meta fields',limits,()=>{
 const rust='pub fn values()->Vec<u8>{'+C+'vec![0u8]}',source='export function values(){return [255n];}',typed='export function values():readonly bigint[]{return [255n];}',row=translate(rust,source,typed);
 assert.throws(()=>emitOwnedVectorCandidateRust(JSON.parse(JSON.stringify(row.result.program))),/unissued/u);
 const forged=data(rust,source,typed);forged.checkedSemanticProgram={declarations:{}};assert.throws(()=>createOwnedVectorCandidateContext(forged),/unknown source record/u);
 const corrupted=data(rust,source,typed);corrupted.files.find(file=>file.path==='src/translation_core.rs').source+=' ';assert.throws(()=>createOwnedVectorCandidateContext(corrupted),/owned Rust sources differ/u);
 const changed=row.result.meta.replaceAll('255','256');assert.notEqual(changed,row.result.meta);assert.throws(()=>parseOwnedVectorCandidateMeta(changed,{context:row.context}));
 row.result.program[0].body[0].value.items[0].value='256';assert.throws(()=>emitOwnedVectorCandidateRust(row.result.program),/checked function\/meta differs|bounds/u);
 assert.throws(()=>translate(rust.replace('Vec<u8>','Vec<bool>'),source,typed),/actual original executable|bool|owned-vector/u);
});

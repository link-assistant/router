// Independent full module reinput source cases. ALL UNRUN.
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


import {prepareOwnedVectorModulePair} from '../owned-vector-module-pair.mjs';
import {proposeOwnedVectorModuleReinput} from '../owned-vector-module-reinput.mjs';
import {prepareVectorModuleReinputSources} from '../../prepare-vector-module-reinput-sources.mjs';
import {json_macro_array as arrayValue,json_macro_null as nullValue} from '../../json-macro-runtime.mjs';
function reinput(row){const proposal=proposeOwnedVectorModuleReinput(row.input,{sourcePath:JS,typescriptPath:TS,typescript:row.result.typescript}),changed=new Map(proposal.files.map(file=>[file.path,file.after])),input={...row.input,files:row.input.files.map(file=>changed.has(file.path)?{...file,source:changed.get(file.path)}:file)},context=createOwnedVectorCandidateContext(input);return {proposal,input,context,result:{program:parseOwnedVectorCandidateMeta(proposal.meta,{context}),meta:proposal.meta,typescript:proposal.typescript,rust:proposal.rustCandidate}};}

test('native AST erasure preserves comments strings newlines and complete inverse annotation spans',limits,()=>{
 const typed='import type {JsonValue} from "../runtime/json-macro-runtime.mjs";\n// : string as Value must remain a comment\nexport function values(seed: JsonValue): readonly JsonValue[] { const held: JsonValue = seed; return [held]; }',pair=prepareOwnedVectorModulePair(JS,TS,typed);assert.ok(pair.javascript.source.includes('// : string as Value must remain a comment'));assert.ok(!pair.javascript.source.includes('import type'));let inverse=pair.javascript.source;for(const edit of [...pair.erasure.edits].reverse())inverse=inverse.slice(0,edit.afterSpan[0])+edit.expected+inverse.slice(edit.afterSpan[1]);assert.equal(inverse,typed);assert.equal(pair.functions.length,1);assert.equal(pair.functions[0].parameters[0].name,'seed');
});
test('type assertions aliases namespaces executable generic calls and mixed type imports do not broaden erasure',limits,()=>{
 for(const typed of ['type X = bigint; export function values(seed:X):readonly bigint[]{return [seed];}','namespace X {}','export function values(seed:bigint):readonly bigint[]{return [seed as bigint];}','export function values(seed:bigint):readonly bigint[]{return [seed satisfies bigint];}','export function values(seed:bigint):readonly bigint[]{return call<bigint>(seed);}','import {type JsonValue,json_macro_null} from "../runtime/json-macro-runtime.mjs";export function values():readonly JsonValue[]{return [json_macro_null()];}'])assert.throws(()=>prepareOwnedVectorModulePair(JS,TS,typed));
});
test('primitive float owned text and static borrowed scalar vectors accept their emitted full input guard modules',limits,async t=>{
 for(const [native,annotation,value] of [['u8','bigint',255n],['f64','number',-0],['String','string','Ω😀'],["&'static str",'string','Ω😀']]){
  const row=translate('pub fn values(seed:'+native+')->Vec<'+native+'>{'+C+'vec![seed]}','export function values(seed){return [seed,seed];}','export function values(seed:'+annotation+'):readonly '+annotation+'[]{return [seed,seed];}'),current=reinput(row);assert.equal(current.proposal.nativeInstalled,false);assert.equal(current.proposal.nativeFreshnessQualified,false);assert.equal(current.proposal.wholeRouterSynchronization,false);assert.deepEqual(current.proposal.trace.map(row=>row.phase),['language','language','repository']);for(const run of await targets(t,current))assert.deepEqual(run(value),[value,value]);
 }
});
test('canonical JSON input and element copies reach stable full-module reinput without accumulating copies',limits,async t=>{
 const native=C+'Json',row=translate('pub fn values(flag:bool,seed:'+native+')->Vec<'+native+'>{if flag{'+C+'vec![seed]}else{'+C+'vec![]}}','export function values(flag,seed){if(flag){return [seed,seed];}else{return [];}}','import type {JsonValue} from "../runtime/json-macro-runtime.mjs";export function values(flag:boolean,seed:JsonValue):readonly JsonValue[]{if(flag){return [seed,seed];}else{return [];}}'),current=reinput(row),again=reinput(current);assert.equal(again.proposal.typescript,current.proposal.typescript);assert.equal(again.proposal.javascript,current.proposal.javascript);assert.equal(again.proposal.rustCandidate,current.proposal.rustCandidate);
 for(const run of await targets(t,current)){const seed=arrayValue([nullValue()]),out=run(true,seed);assert.deepEqual(out,[seed,seed]);assert.notEqual(out[0].field0,out[1].field0);assert.deepEqual(run(false,seed),[]);assert.throws(()=>run(false,{}));assert.throws(()=>run('false',seed));}
});
test('partial forged and source-shadowed canonical input guard prefixes remain explicit refusals',limits,()=>{
 const row=translate('pub fn values(left:u8,right:u8)->Vec<u8>{'+C+'vec![left,right]}','export function values(left,right){return [left,right];}','export function values(left:bigint,right:bigint):readonly bigint[]{return [left,right];}');
 const lines=row.result.typescript.split('\n'),guard=lines.findIndex(line=>line.includes('if (typeof left'));
 for(const typed of [lines.filter((line,index)=>index!==guard+1).join('\n'),row.result.typescript.replace('left > 255n','left > 256n'),row.result.typescript.replace('new TypeError','new RangeError'),'import {json_macro_null as TypeError} from "../runtime/json-macro-runtime.mjs";\n'+row.result.typescript])assert.throws(()=>proposeOwnedVectorModuleReinput(row.input,{sourcePath:JS,typescriptPath:TS,typescript:typed}));
});
test('fresh native source is still required and public proposal fields cannot grant native installation',limits,()=>{
 const row=translate('pub fn values()->Vec<bool>{'+C+'vec![true]}','export function values(){return [false];}','export function values():readonly boolean[]{return [false];}'),current=reinput(row);for(const file of current.proposal.files){assert.equal(file.inverse,row.input.files.find(input=>input.path===file.path).source);assert.equal(file.history.inverse,file.before);}const changed={...row.input,files:row.input.files.map(file=>file.path==='src/lib.rs'?{...file,source:'pub fn values()->Vec<u8>{'+C+'vec![1u8]}'}:file)};assert.throws(()=>proposeOwnedVectorModuleReinput(changed,{sourcePath:JS,typescriptPath:TS,typescript:row.result.typescript}));assert.throws(()=>proposeOwnedVectorModuleReinput(row.input,{sourcePath:JS,typescriptPath:TS,typescript:row.result.typescript,checked:true}));
});
test('nine complete module reinput equations retain native original/CST inverses and exactly two phase names',limits,()=>{const plan=prepareVectorModuleReinputSources();assert.equal(plan.files.length,9);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});

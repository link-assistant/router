import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {rustPackageSourcePath} from '../../repository-layout.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE as facade,ROUTER_CORE_PRIMITIVES_SOURCE as primitives,ROUTER_CORE_RANGES_SOURCE as ranges,ROUTER_CORE_BASE64_SOURCE as base64,ROUTER_CORE_JSON_COLLECTIONS_SOURCE as collections} from '../../router-core-source-data.mjs';
import {ownedCoreRuntimeSources} from '../owned-vector-candidate-source.mjs';
import {createOwnedVectorCandidateContext,translateOwnedVectorCandidate,parseOwnedVectorCandidateMeta,emitOwnedVectorCandidateRust,prepareOwnedVectorCandidateRuntime,evaluateOwnedVectorCandidate} from '../owned-vector-candidate.mjs';

const ROOT=fileURLToPath(new URL('../../../../',import.meta.url)),JS='app/src/list.mjs',TS='typed/src/list.mts',C='crate::translation_core::';
const original=path=>readFileSync(join(ROOT,rustPackageSourcePath(ROOT,path)),'utf8');

test('fresh external-file inline module identity selects its genuine original graph view and qualified signature',{timeout:60000},async()=>{
 const rust='pub mod nested {pub fn values()->Vec<bool>{'+C+'vec![true]}}',source='export function values(){return [false,true];}',typed='export function values():readonly boolean[]{return [false,true];}';
 const input={runtimeRoot:'app/runtime',declarationRoot:'typed/runtime',vectorBindings:[{javascriptPath:JS,javascriptName:'values',rustPath:'src/lists.rs',rustName:'lists.nested.values'}],files:[
  ...ownedCoreRuntimeSources('app/runtime','typed/runtime'),
  {path:'src/lib.rs',source:'pub mod translation_core; pub mod lists; pub fn values()->Vec<u8>{'+C+'vec![1u8]}'},
  {path:'src/lists.rs',source:rust},{path:'src/translation_core.rs',source:facade},{path:'src/translation_core/primitives.rs',source:primitives},{path:'src/translation_core/ranges.rs',source:ranges},{path:'src/translation_core/base64.rs',source:base64},{path:'src/translation_core/json_collections.rs',source:collections},
  {path:'Cargo.toml',source:original('Cargo.toml')},{path:'Cargo.lock',source:original('Cargo.lock')},{path:JS,source},{path:TS,source:typed},
 ]};
 const context=createOwnedVectorCandidateContext(input),result=translateOwnedVectorCandidate(source,{context,sourcePath:JS,typescriptOutputPath:'typed/src/reverse.mts'}),item=result.program[0];
 assert.equal(item.returns,'vec:bool');assert.equal(item.vectorOrigin.original.path,'src/lists.rs');assert.equal(item.vectorOrigin.original.source,rust);assert.equal(item.vectorOrigin.original.qualifiedName,'lists.nested.values');assert.equal(item.vectorOrigin.binding.rustName,'lists.nested.values');assert.equal(item.vectorOrigin.original.functionSource,'pub fn values()->Vec<bool>{'+C+'vec![true]}');
 assert.match(result.rust,/Vec<bool>/u);assert.match(result.rust,/translation_core::vec!\[false, true\]/u);assert.match(result.typescript,/readonly boolean\[\]/u);assert.equal(result.productionSelected,false);
 const parsed=parseOwnedVectorCandidateMeta(result.meta,{context});assert.deepStrictEqual(parsed,result.program);assert.equal(emitOwnedVectorCandidateRust(parsed),result.rust);
 const runtime=await prepareOwnedVectorCandidateRuntime(result.program),first=evaluateOwnedVectorCandidate(result.program,'values',[],runtime),second=evaluateOwnedVectorCandidate(result.program,'values',[],runtime);assert.deepStrictEqual(first,[false,true]);assert.deepStrictEqual(second,first);assert.notEqual(first,second);
 const forged=structuredClone(input);forged.vectorBindings[0].rustName='values';assert.throws(()=>translateOwnedVectorCandidate(source,{context:createOwnedVectorCandidateContext(forged),sourcePath:JS}),/actual original executable Rust function is absent or ambiguous/u);
 const wrongPrimitive=structuredClone(input);wrongPrimitive.vectorBindings[0].rustPath='src/lib.rs';wrongPrimitive.vectorBindings[0].rustName='values';assert.throws(()=>translateOwnedVectorCandidate(source,{context:createOwnedVectorCandidateContext(wrongPrimitive),sourcePath:JS}),/primitive array return type|integer literal|bool|outside actual/u);
});

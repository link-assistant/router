// Independent Result callback body/core composition SOURCE. All UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {proposeCoreOwnedResultMethodCorpus} from '../migrate-core-owned-result-methods.mjs';
import {proposeCoreOwnedResultMethodCorpus as proposeSourceBoundOwnedResult} from '../source-bound-owned-migrate-core-owned-result-methods.mjs';
import {proposeSourceBoundOwnedCoreStage} from '../source-bound-owned-core-bulk.mjs';
import {OWNED_RESULT_NATIVE_SOURCE} from '../owned-result-native-source.mjs';
import {PRIMITIVE_RESULT_NATIVE_SOURCE} from '../primitive-result-native-source.mjs';
import {TEXT_NATIVE_SOURCE} from '../text-native-source.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE,ROUTER_CORE_BASE64_SOURCE} from '../router-core-source-data.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {translateProject} from '../project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {verifyTypedTargets} from './text-typed-targets.mjs';
import {proposeCorePrimitiveResultMethodCorpus as ordinaryPrimitive} from '../migrate-core-primitive-result-methods.mjs';
import {proposeCorePrimitiveResultMethodCorpus as boundPrimitive} from '../source-bound-owned-migrate-core-primitive-result-methods.mjs';
import {readCoreCarrierCallSource} from '../core-carrier-call-source.mjs';
import {rustTokens} from '../rust-structure.mjs';
import {prepareResultCallbackTextSources} from '../prepare-result-callback-text-sources.mjs';
const limits={timeout:60000},root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')},ok=field0=>({$:'Ok',field0}),err=field0=>({$:'Err',field0}),tokens=source=>rustTokens(source).filter(row=>row.type!=='comment');
const ownedBodies=`pub fn mapped(value:Result<String,String>)->Result<String,String>{value.map(|item|item.trim().to_owned())}
pub fn local(value:Result<String,String>)->Result<String,String>{value.and_then(|item|{let cleaned=item.trim().to_owned();Ok(cleaned)})}
pub fn cleaned_error(value:Result<String,String>)->Result<String,String>{value.map_err(|error|error.trim().to_owned())}
pub fn recovered(value:Result<String,String>)->String{value.unwrap_or_else(|error|error.trim().to_owned())}
pub fn rethrown(value:Result<String,String>)->Result<String,String>{value.or_else(|error|Err(error.trim().to_owned()))}
pub fn defaulted(value:Result<String,String>,other:String)->String{value.map(|item|item.trim().to_owned()).unwrap_or(other)}
pub fn local_error(value:Result<String,String>)->Result<String,String>{value.map_err(|error|{let cleaned=error.trim().to_owned();return cleaned;})}
pub fn qualified(value:String)->Result<String,String>{crate::translation_owned_results_core::text_ok(value).map(|item|item.trim().to_owned())}
`;
const primitiveBodies=`pub fn primitive_error(value:Result<u64,String>)->Result<u64,String>{value.map_err(|error|error.trim().to_owned())}
pub fn primitive_recover(value:Result<u64,String>)->u64{value.unwrap_or_else(|error|error.trim().len() as u64)}
pub fn primitive_rethrow(value:Result<u64,String>)->Result<u64,String>{value.or_else(|error|Err(error.trim().to_owned()))}
pub fn primitive_local(value:Result<u64,String>)->Result<u64,String>{value.map_err(|error|{let cleaned=error.trim().to_owned();cleaned})}
pub fn primitive_qualified(error:&str)->Result<u64,String>{crate::translation_primitive_results_core::u64_err(error).map_err(|error|error.trim().to_owned())}
`;
function restoreChild(child){let source=child.after.source;for(const row of [...child.mapping].reverse())if(row.kind==='substitution')source=source.slice(0,row.after[0])+row.expected+source.slice(row.after[1]);assert.equal(source,child.before.source);assert.equal(child.wrapper.functionOwnerProved,false);assert.equal(child.semanticAuthority,false);assert.deepEqual(child.trace.map(row=>row.phase),['language','repository']);}
for(const [label,propose,body,count]of [['ordinary primitive',ordinaryPrimitive,primitiveBodies,5],['source-bound primitive',boundPrimitive,primitiveBodies,5],['ordinary owned',proposeCoreOwnedResultMethodCorpus,ownedBodies,8],['source-bound owned',proposeSourceBoundOwnedResult,ownedBodies,8]])test(label+' lowers full original success/error bodies locals and qualified inputs with child and parent inverses',limits,()=>{
 const request=input(body),row=rejoin(propose(request),request.files['src/lib.rs']);assert.equal(row.edits.length,count);for(const selection of row.selections){assert.ok(selection.callbackTextSourceHistories.length);assert.equal(selection.executableAdmission,false);for(const child of selection.callbackTextSourceHistories)restoreChild(child);}
});
test('qualified Result library calls and explicit standard constructors keep exact source-only success/error roles',limits,()=>{
 const bindings=new Map([['value',{kind:'result',domain:'text'}],['count',{kind:'result',domain:'u64'}],['owned',{kind:'payload',domain:'text-owned'}],['label',{kind:'payload',domain:'str'}]]);for(const [source,kind,domain]of [['crate::translation_owned_results_core::text_ok(owned)','result','text'],['crate::translation_primitive_results_core::u64_err(label)','result','u64'],['crate::translation_owned_results_core::text_unwrap(value)','payload','text-owned'],['crate::translation_owned_results_core::text_unwrap_or(Ok(owned),owned)','payload','text-owned'],['crate::translation_primitive_results_core::u64_unwrap_or(Err(owned),7_u64)','payload','u64']]){const selected=readCoreCarrierCallSource(tokens(source),bindings);assert.equal(selected.kind,kind,source);assert.equal(selected.domain,domain,source);assert.equal(selected.executableAdmission,false);}for(const source of ['crate::translation_owned_results_core::text_ok(label)','crate::translation_primitive_results_core::u64_err(owned)','crate::translation_owned_results_core::text_unwrap(count)','crate::translation_primitive_results_core::u64_unwrap_or(Err(label),7_u64)'])assert.equal(readCoreCarrierCallSource(tokens(source),bindings),null,source);
});
test('consecutive actual primitive and owning Result stages emit all13 original functions in JS and strict TS',limits,async()=>{
 const request=input(ownedBodies+primitiveBodies),first=await proposeSourceBoundOwnedCoreStage('primitive-result-methods',request),next={...request,files:first.after},second=await proposeSourceBoundOwnedCoreStage('owned-result-methods',next),files=second.after,result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});await verifyTypedTargets(result,api=>{for(const name of ['mapped','local']){assert.deepEqual(api[name](ok(' é😀 ')),ok('é😀'));assert.deepEqual(api[name](err(' untouched ')),err(' untouched '));}for(const name of ['cleaned_error','local_error','rethrown']){assert.deepEqual(api[name](ok(' untouched ')),ok(' untouched '));assert.deepEqual(api[name](err(' é😀 ')),err('é😀'));}assert.equal(api.recovered(err(' é😀 ')),'é😀');assert.equal(api.recovered(ok(' untouched ')),' untouched ');assert.equal(api.defaulted(ok(' é😀 '),'unused'),'é😀');assert.equal(api.defaulted(err('error'),'fallback'),'fallback');assert.deepEqual(api.qualified(' é😀 '),ok('é😀'));for(const name of ['primitive_error','primitive_local','primitive_rethrow']){assert.deepEqual(api[name](ok(18446744073709551615n)),ok(18446744073709551615n));assert.deepEqual(api[name](err(' é😀 ')),err('é😀'));}assert.equal(api.primitive_recover(err(' é😀 ')),6n);assert.equal(api.primitive_recover(ok(18446744073709551615n)),18446744073709551615n);assert.deepEqual(api.primitive_qualified(' é😀 '),err('é😀'));},{childTimeoutMs:20000});
});
test('all8 complete source equations retain both rule phases original full inverses and false semantic authority',limits,()=>{
 const plan=prepareResultCallbackTextSources();assert.equal(plan.files.length,8);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(row=>row.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
function input(body){return {entry:'src/lib.rs',compilationProfile:PRODUCTION_PROFILE,dependencyInputs:{...cargo},files:{'src/lib.rs':'pub mod translation_core;\npub mod translation_text_core;\npub mod translation_primitive_results_core;\npub mod translation_owned_results_core;\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE,'src/translation_text_core.rs':TEXT_NATIVE_SOURCE,'src/translation_primitive_results_core.rs':PRIMITIVE_RESULT_NATIVE_SOURCE,'src/translation_owned_results_core.rs':OWNED_RESULT_NATIVE_SOURCE}};}
function rejoin(proposal,source){const row=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.ok(row);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,source);assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);assert.deepEqual(row.trace.map(part=>part.phase),['language','repository']);assert.equal(proposal.executableAdmission,false);return row;}

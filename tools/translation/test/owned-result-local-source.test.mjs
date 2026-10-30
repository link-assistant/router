// Independent owned Result alias/capture regression SOURCE. Every case UNRUN.
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
import {prepareOwnedResultLocalSources} from '../prepare-owned-result-local-sources.mjs';
const limits={timeout:60000},root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')};
function input(body){return {entry:'src/lib.rs',compilationProfile:PRODUCTION_PROFILE,dependencyInputs:{...cargo},files:{'src/lib.rs':'pub mod translation_core;\npub mod translation_text_core;\npub mod translation_primitive_results_core;\npub mod translation_owned_results_core;\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE,'src/translation_text_core.rs':TEXT_NATIVE_SOURCE,'src/translation_primitive_results_core.rs':PRIMITIVE_RESULT_NATIVE_SOURCE,'src/translation_owned_results_core.rs':OWNED_RESULT_NATIVE_SOURCE}};}
function rejoin(proposal,source){const row=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.ok(row);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,source);assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);assert.deepEqual(row.trace.map(part=>part.phase),['language','repository']);assert.equal(proposal.executableAdmission,false);return row;}
const source=[
 'pub fn chain(value:Result<String,String>,fallback:String)->String{let alias=value;let mapped=alias.map(|item|item);mapped.unwrap_or(fallback)}',
 'pub fn created()->String{let created:Result<String,String> = Ok("é😀".to_owned());created.unwrap()}',
 'pub fn failed()->String{let created:Result<String,String> = Err("failure".to_owned());created.unwrap_or("fallback".to_owned())}',
 'pub fn captured(value:Result<String,String>,other:String)->Result<String,String>{let fallback=other;let alias=value;alias.map(|item|fallback)}',
].join('\n');
for(const [name,propose]of [['ordinary',proposeCoreOwnedResultMethodCorpus],['source-bound',proposeSourceBoundOwnedResult]])test(name+' actual owned aliases constructors selected results and captures retain source inverses',limits,()=>{
 const request=input(source),proposal=propose(request),row=rejoin(proposal,request.files['src/lib.rs']);assert.equal(row.edits.length,5);assert.deepEqual(row.selections.map(part=>part.operation),['text_to_text_map','text_unwrap_or','text_unwrap','text_unwrap_or','text_to_text_map']);assert.ok(row.selections.every(part=>part.localReceiverSource));for(const selected of row.selections){assert.equal(selected.localReceiverSource.semanticAuthority,false);assert.equal(selected.localReceiverSource.sourceAuthority,false);assert.equal(selected.oldTraitDispatchProved,false);assert.equal(selected.oldDropTimingProved,false);assert.equal(selected.executableAdmission,false);}assert.equal(proposalNative(proposal),true);
});
function proposalNative(proposal){return proposal.after['src/translation_owned_results_core.rs']===OWNED_RESULT_NATIVE_SOURCE&&proposal.after['src/translation_primitive_results_core.rs']===PRIMITIVE_RESULT_NATIVE_SOURCE;}
for(const [name,propose]of [['ordinary',proposeCoreOwnedResultMethodCorpus],['source-bound',proposeSourceBoundOwnedResult]])test(name+' unknown annotations wrong payloads forward aliases and ended scopes grant no owned receiver',limits,()=>{
 for(const body of [
  'pub fn f(value:Result<String,String>)->String{let later_result=later.unwrap();let later=value;later_result}',
  'pub fn f(value:Result<String,String>)->String{{let hidden=value;}hidden.unwrap()}',
  'pub fn f(value:Result<String,String>)->String{let unknown:Result<String,String> = effect();unknown.unwrap()}',
  'pub fn f()->String{let wrong:Result<String,String> = Ok(false);wrong.unwrap()}',
  'pub fn f(value:Result<String,String>)->String{let mut alias=value;alias.unwrap()}',
 ]){const request=input(body),row=rejoin(propose(request),request.files['src/lib.rs']);assert.equal(row.edits.length,0,body);}
});
test('existing owned-result bulk stage receives full source callers in fresh JS and strict TS',limits,async()=>{
 const request=input(source),proposal=await proposeSourceBoundOwnedCoreStage('owned-result-methods',request),row=rejoin(proposal,request.files['src/lib.rs']);assert.equal(row.edits.length,5);const files=proposal.after,result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});for(const name of ['chain','created','failed','captured'])assert.ok(result.meta.executable.some(row=>row.name===name),JSON.stringify(result.meta.refused));await verifyTypedTargets(result,api=>{for(const value of ['','é😀','failure']){assert.equal(api.chain({$:'Ok',field0:value},'unused'),value);assert.equal(api.chain({$:'Err',field0:value},'fallback'),'fallback');assert.deepEqual(api.captured({$:'Ok',field0:value},'captured'),{$:'Ok',field0:'captured'});assert.deepEqual(api.captured({$:'Err',field0:value},'unused'),{$:'Err',field0:value});}assert.equal(api.created(),'é😀');assert.equal(api.failed(),'fallback');},{childTimeoutMs:20000});
});
test('five complete source equations retain original modules native owners both phases and every inverse',limits,()=>{
 const plan=prepareOwnedResultLocalSources();assert.equal(plan.files.length,5);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});

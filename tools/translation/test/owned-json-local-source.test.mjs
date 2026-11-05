// Independent owned/shared JSON alias regression SOURCE. Every case UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {rustTokens} from '../rust-structure.mjs';
import {createOwnedJsonLocalSource} from '../owned-json-local-source.mjs';
import {proposeCoreOwnedCarrierCorpus} from '../migrate-core-owned-carriers.mjs';
import {proposeCoreOwnedCarrierCorpus as proposeSourceBoundCarrier} from '../source-bound-owned-migrate-core-owned-carriers.mjs';
import {proposeSourceBoundOwnedCoreStage} from '../source-bound-owned-core-bulk.mjs';
import {OWNED_OUTCOME_NATIVE_SOURCE} from '../owned-outcome-native-source.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE,ROUTER_CORE_BASE64_SOURCE} from '../router-core-source-data.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {translateProject} from '../project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {json_macro_null as nil,json_macro_bool as boolean,json_macro_string as text} from '../json-macro-runtime.mjs';
import {prepareOwnedJsonLocalSources} from '../prepare-owned-json-local-sources.mjs';
const limits={timeout:60000},root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')},T='crate::translation_core::Json',O='crate::translation_core::Maybe<'+T+'>',R='crate::translation_core::Outcome<'+T+',::std::string::String>',tokens=source=>rustTokens(source).filter(row=>row.type!=='comment');
function input(body){return {entry:'src/lib.rs',compilationProfile:PRODUCTION_PROFILE,dependencyInputs:{...cargo},files:{'src/lib.rs':'pub mod translation_core;\npub mod translation_carriers_core;\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE,'src/translation_carriers_core.rs':OWNED_OUTCOME_NATIVE_SOURCE}};}
function rejoin(proposal,source){const row=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.ok(row);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,source);assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);assert.deepEqual(row.trace.map(part=>part.phase),['language','repository']);assert.equal(proposal.executableAdmission,false);return row;}
test('actual owned and shared source aliases stay distinct and lexical facts disappear at scope exits',limits,()=>{
 const source='let owned=value;probe(owned);{let reference=&owned;probe(reference);}probe(reference);',rows=tokens(source),provider=createOwnedJsonLocalSource(rows,new Map([['value',{kind:'result',borrowed:false}]]),new Set(['value'])),probes=rows.flatMap((row,at)=>row.text==='probe'?[{position:row.start,name:rows[at+2].text}]:[]);for(const [at,probe]of probes.entries()){assert.deepEqual(provider.at(probe.position).get(probe.name),[{kind:'result',borrowed:false},{kind:'result',borrowed:true},undefined][at]);const fact=provider.evidence(probe.name);if(fact){assert.equal(fact.sourceAuthority,false);assert.equal(fact.semanticAuthority,false);assert.ok(source.slice(...fact.span).startsWith('let '));}}assert.throws(()=>provider.at(0),/monotonic/u);
});
const source=[
 `pub fn optional(value:${O},fallback:${T})->${T}{let alias=value;let alternative=fallback;alias.unwrap_or(alternative)}`,
 `pub fn chained(value:${R},fallback:${T})->${T}{let chosen=value.ok();chosen.unwrap_or(fallback)}`,
 `pub fn borrowed(value:&${R})->${O}{let alias=value;alias.clone().ok()}`,
 `pub fn required(value:${O})->${R}{let alias=value;alias.ok_or_else(||"missing".to_owned())}`,
].join('\n');
for(const [name,propose]of [['ordinary',proposeCoreOwnedCarrierCorpus],['source-bound',proposeSourceBoundCarrier]])test(name+' actual aliases retain single-use receivers defaults and full source inverses',limits,()=>{
 const request=input(source),proposal=propose(request),row=rejoin(proposal,request.files['src/lib.rs']);assert.equal(row.edits.length,5);assert.deepEqual(row.selections.map(part=>part.operation),['json_option_or','json_result_to_option','json_option_or','json_result_to_option','json_option_to_result']);assert.equal(row.selections.find(part=>part.function==='borrowed').explicitClone,true);assert.equal(row.selections.find(part=>part.function==='borrowed').borrowedInput,true);for(const selected of row.selections){assert.equal(selected.receiverBodyUses,1);assert.equal(selected.oldTraitDispatchProved,false);assert.equal(selected.oldDropTimingProved,false);assert.equal(selected.executableAdmission,false);if(selected.localReceiverSource){assert.equal(selected.localReceiverSource.semanticAuthority,false);assert.equal(selected.localReceiverSource.sourceAuthority,false);}}assert.equal(proposal.after['src/translation_carriers_core.rs'],OWNED_OUTCOME_NATIVE_SOURCE);
});
for(const [name,propose]of [['ordinary',proposeCoreOwnedCarrierCorpus],['source-bound',proposeSourceBoundCarrier]])test(name+' repeated locals defaults shared consumers and out-of-scope or unknown roles remain unproved',limits,()=>{
 for(const body of [
  `pub fn f(value:${R})->${O}{let alias=value;alias.ok();alias.ok()}`,
  `pub fn f(value:${R})->${O}{{let hidden=value;}hidden.ok()}`,
  `pub fn f(value:${R})->${O}{let output=later.ok();let later=value;output}`,
  `pub fn f(value:${R})->${O}{let unknown=effect();unknown.ok()}`,
  `pub fn f(value:&${R})->${O}{let alias=value;alias.ok()}`,
  `pub fn f(value:${O},fallback:${T})->${T}{let alias=value;let reference=&fallback;alias.unwrap_or(reference)}`,
 ]){const request=input(body),row=rejoin(propose(request),request.files['src/lib.rs']);assert.equal(row.edits.length,0,body);}
 const fallback=input(`pub fn f(value:${R})->${O}{let mut unrelated=0;value.ok()}`);assert.equal(rejoin(propose(fallback),fallback.files['src/lib.rs']).edits.length,1);
});
test('existing fixed bulk stage receives complete alias callers in independent JS and strict TS',limits,async()=>{
 const request=input(source),proposal=await proposeSourceBoundOwnedCoreStage('owned-carriers',request),row=rejoin(proposal,request.files['src/lib.rs']);assert.equal(row.edits.length,5);const files=proposal.after,result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});for(const name of ['optional','chained','borrowed','required'])assert.ok(result.meta.executable.some(row=>row.name===name),JSON.stringify(result.meta.refused));await verifyTypedTargets(result,api=>{for(const value of [nil(),boolean(false),text('é😀')]){assert.deepEqual(api.optional({$:'Some',field0:value},nil()),value);assert.deepEqual(api.optional({$:'None'},value),value);assert.deepEqual(api.chained({$:'Ok',field0:value},nil()),value);assert.deepEqual(api.chained({$:'Err',field0:'old'},value),value);assert.deepEqual(api.borrowed({$:'Ok',field0:value}),{$:'Some',field0:value});assert.deepEqual(api.required({$:'Some',field0:value}),{$:'Ok',field0:value});}assert.deepEqual(api.borrowed({$:'Err',field0:'old'}),{$:'None'});assert.deepEqual(api.required({$:'None'}),{$:'Err',field0:'missing'});},{childTimeoutMs:20000});
});
test('five complete source equations retain original helper selectors both adapters and both inverses',limits,()=>{
 const plan=prepareOwnedJsonLocalSources();assert.equal(plan.files.length,5);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});

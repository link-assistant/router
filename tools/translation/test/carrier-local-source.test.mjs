// Independent source-order/constructor/capture regressions SOURCE. All UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {rustTokens} from '../rust-structure.mjs';
import {createPrimitiveCarrierLocalSource,readCarrierAliasOperand,encodeCarrierRole} from '../primitive-carrier-local-source.mjs';
import {proposeCorePrimitiveOptionMethodCorpus as ordinaryOption} from '../migrate-core-primitive-option-methods.mjs';
import {proposeCorePrimitiveOptionMethodCorpus as sourceOption} from '../source-bound-owned-migrate-core-primitive-option-methods.mjs';
import {proposeCorePrimitiveOptionCallbackMethodCorpus as ordinaryCallback} from '../migrate-core-primitive-option-callback-methods.mjs';
import {proposeCorePrimitiveOptionCallbackMethodCorpus as sourceCallback} from '../source-bound-owned-migrate-core-primitive-option-callback-methods.mjs';
import {proposeCorePrimitiveResultMethodCorpus as ordinaryResult} from '../migrate-core-primitive-result-methods.mjs';
import {proposeCorePrimitiveResultMethodCorpus as sourceResult} from '../source-bound-owned-migrate-core-primitive-result-methods.mjs';
import {proposeSourceBoundOwnedCoreStage} from '../source-bound-owned-core-bulk.mjs';
import {PRIMITIVE_OPTION_NATIVE_SOURCE} from '../primitive-option-native-source.mjs';
import {PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE} from '../primitive-option-callback-native-source.mjs';
import {PRIMITIVE_RESULT_NATIVE_SOURCE} from '../primitive-result-native-source.mjs';
import {TEXT_NATIVE_SOURCE} from '../text-native-source.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE,ROUTER_CORE_BASE64_SOURCE} from '../router-core-source-data.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {translateProject} from '../project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {verifyTypedTargets} from './text-typed-targets.mjs';
import {prepareCarrierLocalSources} from '../prepare-carrier-local-sources.mjs';
const limits={timeout:60000},root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')},tokens=source=>rustTokens(source).filter(row=>row.type!=='comment'),payload=domain=>({kind:'payload',domain}),optional=domain=>({kind:'option',domain}),result=domain=>({kind:'result',domain});
function input(body,family){const modules=family==='result'?{'translation_text_core':TEXT_NATIVE_SOURCE,'translation_primitive_results_core':PRIMITIVE_RESULT_NATIVE_SOURCE}:family==='callback'?{'translation_text_core':TEXT_NATIVE_SOURCE,'translation_primitive_option_core':PRIMITIVE_OPTION_NATIVE_SOURCE,'translation_primitive_option_callbacks_core':PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE}:{'translation_primitive_option_core':PRIMITIVE_OPTION_NATIVE_SOURCE},files={'src/lib.rs':'pub mod translation_core;\n'+Object.keys(modules).map(name=>'pub mod '+name+';').join('\n')+'\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE};for(const [name,source]of Object.entries(modules))files['src/'+name+'.rs']=source;return {entry:'src/lib.rs',files,dependencyInputs:{...cargo},compilationProfile:PRODUCTION_PROFILE};}
function rejoin(proposal,source){const row=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.ok(row);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,source);assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);assert.deepEqual(row.trace.map(part=>part.phase),['language','repository']);assert.equal(proposal.executableAdmission,false);return row;}
test('typed source constructors and scoped aliases appear after semicolons while unknown annotations grant no fact',limits,()=>{
 const source='let first:Option<u64> = Some(0);probe(first);{let inner=first;probe(inner);}probe(inner);let missing:Option<u64> = None;probe(missing);let unknown:Option<u64> = effect();probe(unknown);',rows=tokens(source),provider=createPrimitiveCarrierLocalSource(rows,new Map(),new Set(),{readWrittenRole:rows=>rows.map(row=>row.text).join('')==='Option<u64>'?optional('u64'):null}),probes=rows.flatMap((row,at)=>row.text==='probe'?[{position:row.start,name:rows[at+2].text}]:[]);for(const [at,probe]of probes.entries()){const visible=provider.at(probe.position),actual=visible.get(probe.name);assert.deepEqual(actual,[optional('u64'),optional('u64'),undefined,optional('u64'),undefined][at]);assert.deepEqual(new Map(visible).get(probe.name),actual);const evidence=provider.evidence(probe.name);if(evidence){assert.equal(evidence.sourceAuthority,false);assert.equal(evidence.semanticAuthority,false);assert.ok(source.slice(...evidence.span).startsWith('let '));}}assert.throws(()=>provider.at(0),/monotonic/u);
});
test('constructor kind namespace literal bounds and declared domain must actually agree',limits,()=>{
 const bindings=new Map([['count',encodeCarrierRole(payload('u64'))],['json',encodeCarrierRole({kind:'json',domain:'json'})]]);for(const [source,wanted]of [['Some(count)',optional('u64')],['std::option::Option::Some(1_u64)',optional('u64')],['Ok(false)',result('bool')],['json.as_u64()',optional('u64')],['Err("failure".to_owned())',result('u64')]]){const actual=readCarrierAliasOperand(tokens(source),bindings,source.startsWith('Err')?result('u64'):null);assert.deepEqual(actual,wanted,source);}
 for(const source of ['Option::Ok(0_u64)','Result::Some(0_u64)','None','Err("borrowed")','Some(18446744073709551616_u64)','Some(effect())','Some(1)','custom::Some(0_u64)','json.custom()'])assert.equal(readCarrierAliasOperand(tokens(source),bindings),null,source);
});
test('callback snapshots contain current captured payload locals without future or ended-scope bindings',limits,()=>{
 const source='let captured=7_u64;{let ended=0_u64;}probe(captured);let future=1_u64;',rows=tokens(source),probe=rows.find(row=>row.text==='probe'),provider=createPrimitiveCarrierLocalSource(rows,new Map([['input',optional('u64')]]),new Set(['input']),{readWrittenRole:()=>null}),snapshot=new Map(provider.at(probe.start));assert.deepEqual(snapshot.get('captured'),payload('u64'));assert.deepEqual(snapshot.get('input'),optional('u64'));assert.equal(snapshot.has('ended'),false);assert.equal(snapshot.has('future'),false);
});
const variants=[['ordinary Option','option',ordinaryOption],['source-bound Option','option',sourceOption],['ordinary callback','callback',ordinaryCallback],['source-bound callback','callback',sourceCallback],['ordinary Result','result',ordinaryResult],['source-bound Result','result',sourceResult]];
for(const [name,family,propose]of variants)test(name+' actual alias and closed constructor callers retain complete source inverses',limits,()=>{
 const body=family==='result'?[
  'pub fn alias(value:Result<u64,String>)->u64{let alias=value;let mapped=alias.map(|item|item);mapped.unwrap_or(9)}',
  'pub fn created()->u64{let created:Result<u64,String> = Ok(0);created.unwrap_or(9)}',
  'pub fn failed()->u64{let created:Result<u64,String> = Err("failure".to_owned());created.unwrap_or(9)}',
 ].join('\n'):[
  'pub fn alias(value:Option<u64>,other:Option<u64>)->u64{let alias=value;let chosen=alias.or(other);chosen.unwrap_or(9)}',
  'pub fn created()->u64{let created:Option<u64> = Some(0);created.unwrap_or(9)}',
  'pub fn absent()->u64{let absent:Option<u64> = None;absent.unwrap_or(9)}',
 ].join('\n'),request=input(body,family),row=rejoin(propose(request),request.files['src/lib.rs']);assert.equal(row.edits.length,4);for(const selected of row.selections){assert.ok(selected.localReceiverSource);assert.equal(selected.localReceiverSource.sourceAuthority,false);assert.equal(selected.localReceiverSource.semanticAuthority,false);assert.equal(selected.oldTraitDispatchProved,false);assert.equal(selected.oldDropTimingProved,false);assert.equal(selected.executableAdmission,false);}
});
for(const [name,family,propose]of variants)test(name+' scope future unknown annotated and wrong-domain locals remain unproved',limits,()=>{
 const type=family==='result'?'Result<u64,String>':'Option<u64>',constructor=family==='result'?'Ok(false)':'Some(false)';for(const body of [
  'pub fn f(value:'+type+')->u64{{let hidden=value;}hidden.unwrap_or(9)}',
  'pub fn f(value:'+type+')->u64{let output=later.unwrap_or(9);let later=value;output}',
  'pub fn f(value:'+type+')->u64{let unknown:'+type+' = effect();unknown.unwrap_or(9)}',
  'pub fn f()->u64{let mismatched:'+type+' = '+constructor+';mismatched.unwrap_or(9)}',
 ]){const request=input(body,family),row=rejoin(propose(request),request.files['src/lib.rs']);assert.equal(row.edits.length,0,body);}
});
for(const family of ['option','callback','result'])test(family+' fixed bulk stage receives alias and capture behavior in fresh JS and strict TS',limits,async()=>{
 const body=family==='option'?'pub fn choose(value:Option<u64>,other:Option<u64>)->u64{let alias=value;let chosen=alias.or(other);chosen.unwrap_or(9)}':family==='callback'?'pub fn choose(value:Option<u64>)->u64{let alias=value;let mapped=alias.map(|item|item);mapped.unwrap_or(9)}':'pub fn choose(value:Result<u64,String>)->u64{let alias=value;let mapped=alias.map(|item|item);mapped.unwrap_or(9)}',stage={option:'primitive-option-methods',callback:'primitive-option-callback-methods',result:'primitive-result-methods'}[family],request=input(body,family),proposal=await proposeSourceBoundOwnedCoreStage(stage,request),row=rejoin(proposal,request.files['src/lib.rs']);assert.equal(row.edits.length,2);const files=proposal.after,translated=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});assert.ok(translated.meta.executable.some(row=>row.name==='choose'),JSON.stringify(translated.meta.refused));await verifyTypedTargets(translated,api=>{for(const value of [0n,1n,18446744073709551615n])assert.equal(api.choose(...(family==='option'?[{$:'Some',field0:value},{$:'None'}]:[{$:family==='result'?'Ok':'Some',field0:value}])),value);assert.equal(api.choose(...(family==='option'?[{$:'None'},{$:'None'}]:[family==='result'?{$:'Err',field0:'é😀'}:{$:'None'}])),9n);if(family==='option')assert.equal(api.choose({$:'None'},{$:'Some',field0:0n}),0n);},{childTimeoutMs:20000});
});
for(const [family,stage]of [['callback','primitive-option-callback-methods'],['result','primitive-result-methods']])test(family+' callback can preserve an actual earlier captured payload alias',limits,async()=>{
 const type=family==='result'?'Result<u64,String>':'Option<u64>',request=input('pub fn captured(value:'+type+')->u64{let fallback=7_u64;let alias=value;let mapped=alias.map(|item|fallback);mapped.unwrap_or(9)}',family),proposal=await proposeSourceBoundOwnedCoreStage(stage,request),row=rejoin(proposal,request.files['src/lib.rs']);assert.equal(row.edits.length,2);const files=proposal.after,translated=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});assert.ok(translated.meta.executable.some(row=>row.name==='captured'),JSON.stringify(translated.meta.refused));await verifyTypedTargets(translated,api=>{assert.equal(api.captured({$:family==='result'?'Ok':'Some',field0:0n}),7n);assert.equal(api.captured(family==='result'?{$:'Err',field0:'old'}:{$:'None'}),9n);},{childTimeoutMs:20000});
});
test('seven complete source equations retain original compiler modules and all phase inverses',limits,()=>{
 const plan=prepareCarrierLocalSources();assert.equal(plan.files.length,7);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});

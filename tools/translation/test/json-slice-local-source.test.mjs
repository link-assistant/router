// Independent slice/vector alias and callback regression SOURCE. All UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {rustTokens} from '../rust-structure.mjs';
import {createJsonSliceLocalSource} from '../json-slice-local-source.mjs';
import {proposeCoreJsonCollectionsCorpus as ordinaryMap} from '../migrate-core-json-collections.mjs';
import {proposeCoreJsonCollectionsCorpus as sourceMap} from '../source-bound-owned-migrate-core-json-collections.mjs';
import {proposeCoreJsonIterationCorpus as ordinaryIteration} from '../migrate-core-json-iterations.mjs';
import {proposeCoreJsonIterationCorpus as sourceIteration} from '../source-bound-owned-migrate-core-json-iterations.mjs';
import {proposeSourceBoundOwnedCoreStage} from '../source-bound-owned-core-bulk.mjs';
import {JSON_ITERATION_NATIVE_SOURCE} from '../json-iteration-native-source.mjs';
import {JSON_STATE_NATIVE_SOURCE} from '../json-state-native-source.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE,ROUTER_CORE_BASE64_SOURCE} from '../router-core-source-data.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {translateProject} from '../project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {json_macro_null as nil,json_macro_bool as boolean,json_macro_string as text} from '../json-macro-runtime.mjs';
import {prepareJsonSliceLocalSources} from '../prepare-json-slice-local-sources.mjs';
const limits={timeout:60000},root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')},T='crate::translation_core::Json',M='crate::translation_core::Maybe',tokens=source=>rustTokens(source).filter(row=>row.type!=='comment');
function input(body,family){const files={'src/lib.rs':'pub mod translation_core;\n'+(family==='iteration'?'pub mod translation_collections_core;\npub mod translation_state_core;\n':'')+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE};if(family==='iteration'){files['src/translation_collections_core.rs']=JSON_ITERATION_NATIVE_SOURCE;files['src/translation_state_core.rs']=JSON_STATE_NATIVE_SOURCE;}return {entry:'src/lib.rs',files,dependencyInputs:{...cargo},compilationProfile:PRODUCTION_PROFILE};}
function rejoin(proposal,source){const row=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.ok(row);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,source);assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);assert.deepEqual(row.trace.map(part=>part.phase),['language','repository']);assert.equal(proposal.executableAdmission,false);return row;}
test('original slice vector and explicit as_slice alias DATA follows actual source order and scope',limits,()=>{
 const source='let borrowed=slice;probe(borrowed);let owned=vector;probe(owned);{let view=owned.as_slice();probe(view);}probe(view);',rows=tokens(source),provider=createJsonSliceLocalSource(rows,new Map([['slice','json-slice'],['vector','json-vector']]),new Set(['slice','vector'])),probes=rows.flatMap((row,at)=>row.text==='probe'?[{position:row.start,name:rows[at+2].text}]:[]);for(const [at,probe]of probes.entries()){assert.equal(provider.at(probe.position).get(probe.name),['json-slice','json-vector','json-slice',undefined][at]);const evidence=provider.evidence(probe.name);if(evidence){assert.equal(evidence.sourceAuthority,false);assert.equal(evidence.semanticAuthority,false);assert.ok(source.slice(...evidence.span).startsWith('let '));}}assert.throws(()=>provider.at(0),/monotonic/u);
});
const mapped=[
 `pub fn alias(values:&[${T}])->Vec<${T}>{let items=values;items.iter().map(|value|{value.clone()}).collect()}`,
 `pub fn owned(values:Vec<${T}>)->Vec<${T}>{values.iter().map(|value|{value.clone()}).collect()}`,
 `pub fn view(values:Vec<${T}>)->Vec<${T}>{let items=values.as_slice();items.iter().map(|value|{value.clone()}).collect()}`,
].join('\n'),iterated=[
 `pub fn alias(values:&[${T}])->bool{let items=values;items.iter().any(|value|value.is_null())}`,
 `pub fn owned(values:Vec<${T}>)->bool{values.iter().all(|value|!value.is_null())}`,
 `pub fn view(values:Vec<${T}>)->${M}<${T}>{let items=values.as_slice();items.iter().find(|value|value.is_null()).cloned()}`,
].join('\n');
const variants=[['ordinary map','map',ordinaryMap],['source-bound map','map',sourceMap],['ordinary iteration','iteration',ordinaryIteration],['source-bound iteration','iteration',sourceIteration]];
for(const [name,family,propose]of variants)test(name+' actual aliases vector borrows and complete original callbacks retain both source phases',limits,()=>{
 const request=input(family==='map'?mapped:iterated,family),proposal=propose(request),row=rejoin(proposal,request.files['src/lib.rs']);assert.equal(row.edits.length,3);assert.equal(row.selections.find(part=>part.function==='owned').receiverRole,'json-vector');assert.equal(row.selections.find(part=>part.function==='alias').localReceiverSource.domain,'json-slice');assert.ok(row.after.source.includes('values.as_slice()'));assert.ok(row.after.source.includes('let items=values.as_slice();'));for(const selected of row.selections){assert.equal(selected.oldTraitDispatchProved,false);assert.equal(selected.executableAdmission,false);if(selected.localReceiverSource)assert.equal(selected.localReceiverSource.semanticAuthority,false);}
});
for(const [name,family,propose]of variants)test(name+' unknown future mismatched ended-scope receivers mutation and custom vector identities remain unproved',limits,()=>{
 const ending=family==='map'?'.iter().map(|value|{value.clone()}).collect()':'.iter().any(|value|value.is_null())',ret=family==='map'?'Vec<'+T+'>':'bool';for(const body of [
  `pub fn f(values:&[${T}])->${ret}{let items=unknown();items${ending}}`,
  `pub fn f(values:&[${T}])->${ret}{{let items=values;}items${ending}}`,
  `pub fn f(values:&[${T}])->${ret}{let items:&[bool]=values;items${ending}}`,
  `pub fn f(values:&[${T}])->${ret}{let output=later${ending};let later=values;output}`,
  `pub fn f(values:&[${T}])->${ret}{let mut items=values;items${ending}}`,
  `pub fn f(values:Other)->${ret}{values${ending}}`,
 ]){const request=input(body,family),row=rejoin(propose(request),request.files['src/lib.rs']);assert.equal(row.edits.length,0,body);}
});
for(const [family,stage]of [['map','json-collections'],['iteration','json-iterations']])test(family+' fixed bulk stage receives actual source callers in independent JS and strict TS',limits,async()=>{
 const request=input(family==='map'?mapped:iterated,family),proposal=await proposeSourceBoundOwnedCoreStage(stage,request),row=rejoin(proposal,request.files['src/lib.rs']);assert.equal(row.edits.length,3);const files=proposal.after,result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});for(const name of ['alias','owned','view'])assert.ok(result.meta.executable.some(row=>row.name===name),JSON.stringify(result.meta.refused));await verifyTypedTargets(result,api=>{const values=Object.freeze([nil(),boolean(false),text('é😀')]),empty=Object.freeze([]);if(family==='map'){for(const name of ['alias','owned','view']){assert.deepEqual(api[name](values),values);assert.deepEqual(api[name](empty),empty);}}else{assert.equal(api.alias(values),true);assert.equal(api.alias(empty),false);assert.equal(api.owned(values),false);assert.equal(api.owned(empty),true);assert.deepEqual(api.view(values),{$:'Some',field0:nil()});assert.deepEqual(api.view(empty),{$:'None'});}},{childTimeoutMs:20000});
});
test('eight complete source equations retain original selectors adapters native owners and both inverses',limits,()=>{
 const plan=prepareJsonSliceLocalSources();assert.equal(plan.files.length,8);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});

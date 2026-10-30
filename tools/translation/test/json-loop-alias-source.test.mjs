// Independent loop alias regression SOURCE. Every case is UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {proposeCoreJsonLoopCorpus as ordinary} from '../migrate-core-json-loops.mjs';
import {proposeCoreJsonLoopCorpus as sourceBound} from '../source-bound-owned-migrate-core-json-loops.mjs';
import {proposeSourceBoundOwnedCoreStage} from '../source-bound-owned-core-bulk.mjs';
import {JSON_ITERATION_NATIVE_SOURCE} from '../json-iteration-native-source.mjs';
import {JSON_STATE_NATIVE_SOURCE} from '../json-state-native-source.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE,ROUTER_CORE_BASE64_SOURCE} from '../router-core-source-data.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {translateProject} from '../project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {json_macro_null as nil,json_macro_bool as boolean,json_macro_string as text,json_macro_array as array,json_macro_object as object} from '../json-macro-runtime.mjs';
import {prepareJsonLoopAliasSources} from '../prepare-json-loop-alias-sources.mjs';
const limits={timeout:60000},root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')},C='crate::translation_core::',T=C+'Json',S='crate::translation_state_core::';
const append=S+'json_append(result,value.clone())',body=[
 `pub fn alias(values:&[${T}],initial:${T})->${T}{let items=values;let borrowed=items;let mut result=initial;for value in borrowed{result=${append};}result}`,
 `pub fn owned(values:Vec<${T}>,initial:${T})->${T}{let mut result=initial;for value in values.iter(){result=${append};}result}`,
 `pub fn view(values:Vec<${T}>,initial:${T})->${T}{let items=values.as_slice();let mut result=initial;for value in items{result=${append};}result}`,
 `pub fn replaced(values:&Vec<${T}>,initial:${T})->${T}{let items=values;let mut result=${C}json_copy(&initial);for value in items.iter(){result=${C}json_with_field(result,"last",value.clone());}result}`,
].join('\n');
function input(source=body){return {entry:'src/lib.rs',compilationProfile:PRODUCTION_PROFILE,dependencyInputs:{...cargo},files:{'src/lib.rs':'pub mod translation_core;\npub mod translation_collections_core;\npub mod translation_state_core;\n// Ω😀 prefix\n'+source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE,'src/translation_collections_core.rs':JSON_ITERATION_NATIVE_SOURCE,'src/translation_state_core.rs':JSON_STATE_NATIVE_SOURCE}};}
function rejoin(proposal,source){const row=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.ok(row);assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,source);assert.deepEqual(row.trace.map(part=>part.phase),['language','repository']);assert.equal(proposal.executableAdmission,false);return row;}
for(const [name,propose]of [['ordinary',ordinary],['source-bound',sourceBound]])test(name+' loop aliases retain complete prefix source and real layered fold/state/core substitutions',limits,()=>{
 const request=input(),proposal=propose(request),row=rejoin(proposal,request.files['src/lib.rs']);assert.equal(row.edits.length,4);assert.ok(row.after.source.includes('let items=values;let borrowed=items;'));assert.ok(row.after.source.includes('json_fold(values.as_slice(), initial'));assert.ok(row.after.source.includes('json_fold(items.as_slice(), '+C+'json_copy(&initial)'));assert.equal(row.selections.find(part=>part.function==='alias').localReceiverSource.domain,'json-slice');assert.equal(row.selections.find(part=>part.function==='owned').receiverRole,'json-vector');for(const selected of row.selections){assert.equal(selected.oldTraitDispatchProved,false);assert.equal(selected.oldDropTimingProved,false);assert.equal(selected.executableAdmission,false);}for(const phase of row.trace)assert.ok(phase.rules.some(rule=>rule.edits.length));
});
for(const [name,propose]of [['ordinary',ordinary],['source-bound',sourceBound]])test(name+' consuming vectors unknown prefixes mutable aliases and broader loops remain untouched',limits,()=>{
 const make=(type,prefix,receiver,update=append,tail='result')=>`pub fn f(values:${type},initial:${T})->${T}{${prefix}let mut result=initial;for value in ${receiver}{result=${update};}${tail}}`;for(const source of [
 make(`Vec<${T}>`,'','values'),make(`Vec<${T}>`,'let items=values;','items'),make(`&[${T}]`,'let items=unknown();','items'),make(`&[${T}]`,'let items:&[bool]=values;','items'),make(`&[${T}]`,'let mut items=values;','items'),make(`&[${T}]`,'let result=values;','values'),make(`&[${T}]`,'let items=values;let items=values;','items'),make(`&[${T}]`,'','values',append+';break'),make(`&[${T}]`,'','values',append,'initial'),make('Other','','values.iter()'),
 ]){const request=input(source),row=rejoin(propose(request),request.files['src/lib.rs']);assert.equal(row.edits.length,0,source);}
});
test('actual fixed loop stage receives empty ordered false null Unicode and fallback behaviors in JS and strict TS',limits,async()=>{
 const request=input(),proposal=await proposeSourceBoundOwnedCoreStage('json-loops',request),row=rejoin(proposal,request.files['src/lib.rs']);assert.equal(row.edits.length,4);const files=proposal.after,result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});for(const name of ['alias','owned','view','replaced'])assert.ok(result.meta.executable.some(row=>row.name===name),JSON.stringify(result.meta.refused));await verifyTypedTargets(result,api=>{const values=Object.freeze([nil(),boolean(false),text('é😀')]);for(const name of ['alias','owned','view']){assert.deepEqual(api[name](values,array([])),array(values));assert.deepEqual(api[name]([],text('unchanged')),text('unchanged'));}assert.deepEqual(api.replaced(values,nil()),object([['last',text('é😀')]]));assert.deepEqual(api.replaced([],nil()),nil());},{childTimeoutMs:20000});
});
test('four complete source equations retain every original owner both phases and source inverses',limits,()=>{
 const plan=prepareJsonLoopAliasSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});

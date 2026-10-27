// Independent real two-family fixed-point receiving SOURCE. Entire file UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import * as option from '../primitive-option-runtime.mjs';
import {PRIMITIVE_OPTION_CONTRACTS,emitPrimitiveOptionDeclarations} from '../primitive-option-contracts.mjs';
import {PRIMITIVE_OPTION_NATIVE_SOURCE} from '../primitive-option-native-source.mjs';
import {INTEGER_NATIVE_SOURCE} from '../integer-native-source.mjs';
import {proposeCorePrimitiveOptionMethodCorpus as ordinary} from '../migrate-core-primitive-option-methods.mjs';
import {proposeCorePrimitiveOptionMethodCorpus as sourceBound} from '../source-bound-owned-migrate-core-primitive-option-methods.mjs';
import {proposeCorePrimitiveOptionCallbackMethodCorpus as ordinaryCallback} from '../migrate-core-primitive-option-callback-methods.mjs';
import {proposeCorePrimitiveOptionCallbackMethodCorpus as sourceCallback} from '../source-bound-owned-migrate-core-primitive-option-callback-methods.mjs';
import {PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE} from '../primitive-option-callback-native-source.mjs';
import {TEXT_NATIVE_SOURCE} from '../text-native-source.mjs';
import {proposeSourceBoundOwnedCoreStage} from '../source-bound-owned-core-bulk.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE,ROUTER_CORE_BASE64_SOURCE} from '../router-core-source-data.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {translateProject} from '../project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {verifyTypedTargets} from './text-typed-targets.mjs';
import {collectSourceBoundOwnedCoreFixedPoint,SOURCE_BOUND_CORE_FIXED_POINT_LIMITS} from '../source-bound-owned-core-fixed-point.mjs';
import {prepareCoreFixedPointSources} from '../prepare-core-fixed-point-sources.mjs';
const limits={timeout:60000},root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')};
const bodies='pub fn selected(value:&str)->String{value.strip_prefix("x").unwrap_or("fallback").to_owned()}';
test('actual original Option/text adopters revisit a preceding stage then receive JS strict TS with every full packet inverse',limits,async()=>{
 const request=input(bodies,true),packets=[],result=await collectSourceBoundOwnedCoreFixedPoint({...request,stages:['primitive-option-methods','text-methods']},packet=>{if(packet.proposal){for(const row of packet.proposal.proposals){assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,row.before.source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let source=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')source=source.slice(0,part.after[0])+part.expected+source.slice(part.after[1]);assert.equal(source,row.before.source);}packets.push({round:packet.round,stage:packet.stage,changed:packet.changedFiles.length});}});assert.equal(result.receipt.stabilized,true);assert.equal(result.receipt.rounds<=SOURCE_BOUND_CORE_FIXED_POINT_LIMITS.rounds,true);assert.ok(packets.some(row=>row.round>0&&row.stage==='primitive-option-methods'&&row.changed));assert.equal(request.files['src/lib.rs'].includes('value.strip_prefix'),true);const files=result.files,translated=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});assert.ok(translated.meta.executable.some(row=>row.name==='selected'),JSON.stringify(translated.meta.refused));await verifyTypedTargets(translated,api=>{assert.equal(api.selected('xé😀'),'é😀');assert.equal(api.selected('other'),'fallback');assert.equal(api.selected('x'),'');},{childTimeoutMs:20000});assert.equal(result.semanticAuthority,false);assert.equal(result.receipt.coverageComplete,false);
});
test('three complete copied source equations preserve every original routing guard and both CST phases',limits,()=>{
 const plan=prepareCoreFixedPointSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(row=>row.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);assert.equal(plan.semanticAuthority,false);
});
function input(body=bodies,callbacks=false){const modules={translation_integer_core:INTEGER_NATIVE_SOURCE,translation_primitive_option_core:PRIMITIVE_OPTION_NATIVE_SOURCE,...(callbacks?{translation_text_core:TEXT_NATIVE_SOURCE,translation_primitive_option_callbacks_core:PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE}:{})},files={'src/lib.rs':'pub mod translation_core;\n'+Object.keys(modules).map(name=>'pub mod '+name+';').join('\n')+'\n// Ω😀 actual additional Option source\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE};for(const [name,source]of Object.entries(modules))files['src/'+name+'.rs']=source;return {entry:'src/lib.rs',files,dependencyInputs:{...cargo},compilationProfile:PRODUCTION_PROFILE};}
function rejoin(proposal,source){const row=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,source);assert.deepEqual(row.trace.map(part=>part.phase),['language','repository']);assert.equal(proposal.executableAdmission,false);return row;}

// Independent bulk source/behavior/refusal SOURCE. All cases remain unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {proposeSourceBoundOwnedCoreStage,proposeSourceBoundOwnedCoreStages} from '../source-bound-owned-core-bulk.mjs';
import {prepareSourceBoundOwnedCoreBulkSources} from '../prepare-source-bound-owned-core-bulk-sources.mjs';
import {TEXT_NATIVE_SOURCE} from '../text-native-source.mjs';
import {PRIMITIVE_OPTION_NATIVE_SOURCE} from '../primitive-option-native-source.mjs';
import {INTEGER_NATIVE_SOURCE} from '../integer-native-source.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_BASE64_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
import {translateProjectWithFlatEnclosingSemanticMeta} from '../project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {verifyTypedTargets} from './text-typed-targets.mjs';
const limits={timeout:60000},root=new URL('../../../',import.meta.url),entry='rust/src/lib.rs',cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')};
const source='pub mod translation_core;pub mod translation_text_core;pub mod translation_primitive_option_core;pub mod translation_integer_core;\n#[rustfmt::skip]pub fn blank(value:&str)->bool{value.trim().is_empty()}\n#[rustfmt::skip]pub fn fallback(value:Option<u64>)->u64{value.unwrap_or(17)}\n#[rustfmt::skip]pub fn increment(value:u64)->u64{value.saturating_add(1)}\n';
function request(stages=['text-methods','primitive-option-methods','integer-methods','primitives']){return {entry,compilationProfile:PRODUCTION_PROFILE,dependencyInputs:{...cargo},stages,files:{[entry]:source,'rust/src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'rust/src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'rust/src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'rust/src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE,'rust/src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'rust/src/translation_text_core.rs':TEXT_NATIVE_SOURCE,'rust/src/translation_primitive_option_core.rs':PRIMITIVE_OPTION_NATIVE_SOURCE,'rust/src/translation_integer_core.rs':INTEGER_NATIVE_SOURCE}};}
function inverse(proposal){for(const row of proposal.proposals){assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,row.before.source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let source=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')source=source.slice(0,part.after[0])+part.expected+source.slice(part.after[1]);assert.equal(source,row.before.source);}}
test('sequential original method families receive complete previous after maps and preserve attributes',limits,async()=>{
 const input=request(),original={...input.files};let current=original,count=0;
 for await(const packet of proposeSourceBoundOwnedCoreStages(input)){assert.equal(packet.stage,input.stages[count]);assert.equal(packet.index,count++);assert.deepEqual({...packet.proposal.before},current);assert.ok(packet.proposal.proposals.some(row=>row.selections.length>0),packet.stage);assert.equal(packet.executableAdmission,false);assert.equal(packet.sourceInverseIsReverseExecution,false);assert.equal(packet.newAcrossInvocationCache,false);assert.equal(packet.applicationSourcesInstalled,false);inverse(packet.proposal);current={...packet.proposal.after};}
 assert.equal(count,4);assert.deepEqual(input.files,original);assert.equal(current[entry].split('#[rustfmt::skip]').length,4);
 const result=translateProjectWithFlatEnclosingSemanticMeta({entry,paths:Object.keys(current),readSource:path=>current[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo),jsonMacroDependencies:loadJsonMacroSourceProof(cargo)});for(const name of ['blank','fallback','increment'])assert.ok(result.meta.executable.some(row=>row.name===name),name);
 await verifyTypedTargets(result,api=>{assert.equal(api.blank(' \t\u0085\u3000'),true);assert.equal(api.blank('\uFEFF'),false);assert.equal(api.blank('\u200B'),false);assert.equal(api.blank(' 😀 '),false);assert.equal(api.fallback({$:'None'}),17n);assert.equal(api.fallback({$:'Some',field0:0n}),0n);assert.equal(api.fallback({$:'Some',field0:18446744073709551615n}),18446744073709551615n);assert.equal(api.increment(0n),1n);assert.equal(api.increment(18446744073709551615n),18446744073709551615n);},{childTimeoutMs:20000});
});
test('next source strings are captured independently of mutable yielded proposal data',limits,async()=>{
 const input=request(['text-methods','integer-methods']),iterator=proposeSourceBoundOwnedCoreStages(input),first=await iterator.next(),expected=first.value.proposal.after[entry];first.value.proposal.after[entry]='fn forged(){}';const second=await iterator.next();assert.equal(second.value.proposal.before[entry],expected);assert.notEqual(second.value.proposal.before[entry],'fn forged(){}');await iterator.return();assert.equal(input.files[entry],source);
});
test('source Cargo profile and stage mutations across yields refuse before another proposal',limits,async()=>{
 for(const change of [input=>{input.files[entry]+='\n';},input=>{input.dependencyInputs.lock+='\n';},input=>{input.stages.reverse();},input=>{input.compilationProfile={flags:{test:true}};}]){const input=request(['text-methods','integer-methods']),iterator=proposeSourceBoundOwnedCoreStages(input);assert.equal((await iterator.next()).done,false);change(input);await assert.rejects(iterator.next(),/changed/u);}
});
test('unknown duplicate sparse proxy or accessor requests cannot select arbitrary code',limits,async()=>{
 await assert.rejects(proposeSourceBoundOwnedCoreStage('../untrusted',{}),/unknown fixed/u);await assert.rejects(proposeSourceBoundOwnedCoreStage({toString(){throw Error('must not invoke');}},{}),/explicit known/u);
 for(const stages of [['text-methods','text-methods'],new Array(1),['unknown']])await assert.rejects(proposeSourceBoundOwnedCoreStages(request(stages)).next(),/stage/u);
 const stages=['text-methods'];Object.defineProperty(stages,'0',{get(){throw Error('must not invoke');}});await assert.rejects(proposeSourceBoundOwnedCoreStages(request(stages)).next(),/own stage/u);
 const input=request();input.files=new Proxy(input.files,{ownKeys(){throw Error('must not invoke');}});await assert.rejects(proposeSourceBoundOwnedCoreStages(input).next(),/ordinary own source/u);
 const ambiguous=request();delete ambiguous.entry;ambiguous.files['src/lib.rs']='pub fn other(){}';await assert.rejects(proposeSourceBoundOwnedCoreStages(ambiguous).next(),/one explicit original entry/u);
});
test('all complete original copies retain native import owners ordered phases and full inverses',limits,()=>{
 const plan=prepareSourceBoundOwnedCoreBulkSources();assert.equal(plan.files.length,27);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});

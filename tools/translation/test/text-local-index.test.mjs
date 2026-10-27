// Independent text alias/index regression SOURCE. All cases UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {rustTokens} from '../rust-structure.mjs';
import {createTextLocalArgumentSource} from '../text-local-argument-source.mjs';
import {proposeCoreTextMethodCorpus} from '../migrate-core-text-methods.mjs';
import {proposeCoreTextMethodCorpus as proposeSourceBoundText} from '../source-bound-owned-migrate-core-text-methods.mjs';
import {proposeSourceBoundOwnedCoreStage} from '../source-bound-owned-core-bulk.mjs';
import {TEXT_NATIVE_SOURCE} from '../text-native-source.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE,ROUTER_CORE_BASE64_SOURCE} from '../router-core-source-data.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {translateProject} from '../project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {verifyTypedTargets} from './text-typed-targets.mjs';
import {prepareTextLocalIndexSources} from '../prepare-text-local-index-sources.mjs';
const limits={timeout:60000},root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')},tokens=source=>rustTokens(source).filter(row=>row.type!=='comment');
function input(body){return {entry:'src/lib.rs',compilationProfile:PRODUCTION_PROFILE,dependencyInputs:{...cargo},files:{'src/lib.rs':'pub mod translation_core;\npub mod translation_text_core;\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE,'src/translation_text_core.rs':TEXT_NATIVE_SOURCE}};}
function rejoin(proposal,source){const row=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.ok(row);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,source);assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);assert.deepEqual(row.trace.map(part=>part.phase),['language','repository']);assert.equal(proposal.executableAdmission,false);return row;}
test('borrowed typed raw literal and owned-view aliases retain exact chronological source spans',limits,()=>{
 const source='let typed:&str=value;probe(typed);{let hidden=typed;probe(hidden);}probe(hidden);let view=owned.as_str();probe(view);let literal=r#"😀"#;probe(literal);',rows=tokens(source),provider=createTextLocalArgumentSource(rows,new Map([['value','str'],['owned','text-owned']])),probes=rows.flatMap((row,at)=>row.text==='probe'?[{position:row.start,name:rows[at+2].text}]:[]);for(const [at,probe]of probes.entries()){assert.equal(provider.at(probe.position).get(probe.name),['str','str',undefined,'str','str'][at]);const fact=provider.evidence(probe.name);if(fact){assert.equal(fact.sourceAuthority,false);assert.equal(fact.semanticAuthority,false);assert.ok(source.slice(...fact.span).startsWith('let '));assert.ok(Object.isFrozen(fact.span));}}assert.equal(provider.evidence('view').bridge,'as_str');assert.equal(provider.evidence('literal').originBinding,null);
});
for(const [name,propose]of [['ordinary',proposeCoreTextMethodCorpus],['source-bound',proposeSourceBoundText]])test(name+' selected text results and byte-index projections retain full original source and scalar language rules',limits,()=>{
 const request=input('// Ω😀 original coordinates\n'+[
  'pub fn chain(value:&str)->bool{let cleaned:&str=value.trim();let alias=cleaned;alias.contains("x")}',
  'pub fn first(value:&str)->Option<u64>{let alias=value;alias.find("😀").map(|index| index as u64)}',
  "pub fn last(value:&str)->Option<u64>{value.rfind('😀').map(|offset| offset as u64)}",
 ].join('\n')),row=rejoin(propose(request),request.files['src/lib.rs']);assert.equal(row.edits.length,4);assert.deepEqual(row.selections.map(part=>part.operation),['trim','contains','find','rfind']);assert.equal(row.selections.find(part=>part.operation==='contains').localReceiverSource.originBinding,'cleaned');assert.equal(row.languageEdits.length,1);assert.ok(row.languageSourceHistory);assert.equal(row.languageSourceHistory.inverse,request.files['src/lib.rs']);for(const selected of row.selections){assert.equal(selected.oldTraitDispatchProved,false);assert.equal(selected.oldDropTimingProved,false);assert.equal(selected.executableAdmission,false);}
});
for(const [name,propose]of [['ordinary',proposeCoreTextMethodCorpus],['source-bound',proposeSourceBoundText]])test(name+' arbitrary callbacks unknown owners future declarations and ended scopes stay unproved',limits,()=>{
 for(const body of [
  'pub fn f(value:&str)->Option<u64>{value.find("x").map(|index| other as u64)}',
  'pub fn f(value:&str)->Option<u64>{value.find("x").map(|index| effect(index))}',
  'pub fn f(value:&str)->Option<u64>{value.find("x").map(|index| index as u32)}',
  'pub fn f(value:&str)->bool{let result=later.is_empty();let later=value;result}',
  'pub fn f(value:&str)->bool{{let hidden=value;}hidden.is_empty()}',
  'pub fn f(value:&str)->bool{let unknown=value.custom();unknown.is_empty()}',
  'pub fn f(value:Custom)->Option<u64>{value.find("x").map(|index| index as u64)}',
  'pub fn f(value:&str)->bool{let mut alias=value;alias.is_empty()}',
 ]){const request=input(body),row=rejoin(propose(request),request.files['src/lib.rs']);assert.equal(row.edits.length,0,body);}
 const scoped=input('pub fn f(value:&str)->bool{{let inner=value;inner.is_empty();}inner.contains("x")}'),row=rejoin(propose(scoped),scoped.files['src/lib.rs']);assert.equal(row.edits.length,1);assert.equal(row.selections[0].operation,'is_empty');
});
test('existing fixed bulk stage receives independent UTF-8 byte-index behavior in JS and strict TS',limits,async()=>{
 const request=input('pub fn first(value:&str,pattern:&str)->Option<u64>{let alias=value;alias.find(pattern).map(|index| index as u64)}\npub fn last(value:&str,pattern:&str)->Option<u64>{value.rfind(pattern).map(|offset| offset as u64)}'),proposal=await proposeSourceBoundOwnedCoreStage('text-methods',request),row=rejoin(proposal,request.files['src/lib.rs']);assert.equal(row.edits.length,2);const files=proposal.after,result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});for(const name of ['first','last'])assert.ok(result.meta.executable.some(part=>part.name===name),JSON.stringify(result.meta.refused));await verifyTypedTargets(result,api=>{for(const [value,pattern,first,last]of [['é😀x😀','😀',2n,7n],['aéa','a',0n,3n],['😀','',0n,4n],['','',0n,0n],['é','x',null,null]]){assert.deepEqual(api.first(value,pattern),first===null?{$:'None'}:{$:'Some',field0:first});assert.deepEqual(api.last(value,pattern),last===null?{$:'None'}:{$:'Some',field0:last});}},{childTimeoutMs:20000});
});
test('four complete construction equations retain originals owners both phases and every inverse',limits,()=>{
 const plan=prepareTextLocalIndexSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});

// Independent chronological integer alias regression SOURCE. Every case UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {rustTokens} from '../rust-structure.mjs';
import {createPrimitiveLocalArgumentSource,readPrimitiveAliasOperand} from '../primitive-local-argument-source.mjs';
import {proposeCoreIntegerMethodCorpus} from '../migrate-core-integer-methods.mjs';
import {proposeCoreIntegerMethodCorpus as proposeSourceBoundInteger} from '../source-bound-owned-migrate-core-integer-methods.mjs';
import {proposeSourceBoundOwnedCoreStage} from '../source-bound-owned-core-bulk.mjs';
import {INTEGER_NATIVE_SOURCE} from '../integer-native-source.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE,ROUTER_CORE_BASE64_SOURCE} from '../router-core-source-data.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {translateProject} from '../project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {prepareIntegerLocalAliasSources} from '../prepare-integer-local-alias-sources.mjs';
const limits={timeout:60000},root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')},tokens=source=>rustTokens(source).filter(row=>row.type!=='comment');
function input(body){return {entry:'src/lib.rs',compilationProfile:PRODUCTION_PROFILE,dependencyInputs:{...cargo},files:{'src/lib.rs':'pub mod translation_core;\npub mod translation_integer_core;\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE,'src/translation_integer_core.rs':INTEGER_NATIVE_SOURCE}};}
function rejoin(proposal,source){const row=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.ok(row);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,source);assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);assert.equal(proposal.executableAdmission,false);assert.doesNotMatch(row.after.source,/translation_compatibility_integer_core/u);return row;}
test('primitive alias DATA follows source semicolons and lexical lifetimes',limits,()=>{
 const source='probe(value);let first=value;probe(first);{let inner=first;probe(inner);}probe(inner);',rows=tokens(source),provider=createPrimitiveLocalArgumentSource(rows,new Map([['value','u64']])),probes=rows.flatMap((row,at)=>row.text==='probe'?[{position:row.start,argument:rows[at+2]}]:[]);for(const [index,probe]of probes.entries()){assert.equal(provider.at(probe.position).get(probe.argument.text),['u64','u64','u64',undefined][index]);const fact=provider.evidence(probe.argument.text);if(fact){assert.equal(fact.sourceAuthority,false);assert.equal(fact.semanticAuthority,false);assert.ok(Object.isFrozen(fact.initializerSpan));assert.equal(source.slice(...fact.initializerSpan),index===1?'value':'first');}}assert.throws(()=>provider.at(0),/monotonic/u);
});
test('native suffixes and primitive bounds require a genuine bounded domain',limits,()=>{
 for(const [value,wanted]of [['255_u8','u8'],['-128_i8','i8'],['65535_u16','u16'],['-2147483648_i32','i32'],['18446744073709551615_u64','u64'],['-9223372036854775808_i64','i64'],['340282366920938463463374607431768211455_u128','u128'],['-170141183460469231731687303715884105728_i128','i128'],['i16::MIN','i16'],['u32::MAX','u32']])assert.equal(readPrimitiveAliasOperand(tokens(value),new Map())?.kind,wanted,value);
 for(const value of ['256_u8','-129_i8','18446744073709551616_u64','-9223372036854775809_i64','340282366920938463463374607431768211456_u128','-0_u64','1','1.0','custom()','value.as_ref()','u64::OTHER'])assert.equal(readPrimitiveAliasOperand(tokens(value),new Map()),null,value);
});
test('failed new alias census retains the original parameter-only lane',limits,()=>{
 for(const body of ['let (first,second)=pair;','let value=value;','let alias=value;let alias=value;','let u64=value;','for (other,index) in collection {}'])assert.equal(createPrimitiveLocalArgumentSource(tokens(body),new Map([['value','u64']])),null,body);
 assert.equal(createPrimitiveLocalArgumentSource(tokens('let text=value;'),new Map([['value','u64']]),new Set(['value','text'])),null);
});
for(const [name,propose]of [['ordinary',proposeCoreIntegerMethodCorpus],['source-bound',proposeSourceBoundInteger]])test(name+' aliases selected primitive results and closed native literals use complete CST substitutions',limits,()=>{
 const request=input('// Ω😀 keeps original UTF-16 positions\n'+[
  'pub fn chain(value:u64)->u64{let alias=value;let first=alias.saturating_add(1);first.saturating_mul(2)}',
  'pub fn argument(value:u64)->u64{let amount=1_u64;value.saturating_add(amount)}',
  'pub fn minimum()->i64{let first=-9223372036854775808_i64;first.saturating_abs()}',
  'pub fn maximum()->u64{let first=u64::MAX;first.wrapping_add(1)}',
 ].join('\n')),row=rejoin(propose(request),request.files['src/lib.rs']);assert.equal(row.edits.length,5);assert.deepEqual(row.selections.map(part=>part.operation),['u64_saturating_add','u64_saturating_mul','u64_saturating_add','i64_saturating_abs','u64_wrapping_add']);assert.equal(row.selections[1].localReceiverSource.kind,'complete-selected-primitive-result-alias');for(const selected of row.selections){assert.equal(selected.oldTraitDispatchProved,false);assert.equal(selected.executableAdmission,false);if(selected.localReceiverSource){assert.equal(selected.localReceiverSource.semanticAuthority,false);assert.ok(request.files['src/lib.rs'].slice(...selected.localReceiverSource.span).startsWith('let '));}}assert.deepEqual(row.trace.map(part=>part.phase),['language','repository']);
});
for(const [name,propose]of [['ordinary',proposeCoreIntegerMethodCorpus],['source-bound',proposeSourceBoundInteger]])test(name+' unknown forward scoped mismatched and Option aliases grant no numeric receiver',limits,()=>{
 for(const body of [
  'pub fn f(value:u64)->u64{let first=later.saturating_add(1);let later=value;first}',
  'pub fn f(value:u64)->u64{{let inner=value;}inner.saturating_add(1)}',
  'pub fn f(value:u64)->u64{let alias:i64=value;alias.saturating_add(1)}',
  'pub fn f(value:u64)->u64{let alias=unknown();alias.saturating_add(1)}',
  'pub fn f()->u64{let alias=1;alias.saturating_add(1)}',
 ]){const request=input(body),row=rejoin(propose(request),request.files['src/lib.rs']);assert.equal(row.edits.length,0,body);}
 const checked=input('pub fn f(value:u64)->u64{let result=value.checked_add(1);result.saturating_add(1)}'),row=rejoin(propose(checked),checked.files['src/lib.rs']);assert.equal(row.edits.length,1);assert.equal(row.selections[0].operation,'u64_checked_add');
 const fallback=input('pub fn f(value:u64)->u64{let mut unrelated=0;value.saturating_add(1)}');assert.equal(rejoin(propose(fallback),fallback.files['src/lib.rs']).edits.length,1);
});
test('fixed bulk stage uses new aliases and both receiving targets retain boundary behavior',limits,async()=>{
 const request=input('pub fn chain(value:u64)->u64{let alias=value;let first=alias.saturating_add(1);first.saturating_mul(2)}'),proposal=await proposeSourceBoundOwnedCoreStage('integer-methods',request),row=rejoin(proposal,request.files['src/lib.rs']);assert.equal(row.edits.length,2);const files=proposal.after,result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});assert.ok(result.meta.executable.some(part=>part.name==='chain'),JSON.stringify(result.meta.refused));await verifyTypedTargets(result,api=>{for(const [value,wanted]of [[0n,2n],[1n,4n],[9223372036854775807n,18446744073709551615n],[18446744073709551615n,18446744073709551615n]])assert.equal(api.chain(value),wanted);},{childTimeoutMs:20000});
});
test('five complete source equations retain originals owners two phases and every inverse',limits,()=>{
 const plan=prepareIntegerLocalAliasSources();assert.equal(plan.files.length,5);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});

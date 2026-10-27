// Independent qualified native integer source regression SOURCE. All UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {rustTokens} from '../rust-structure.mjs';
import {readPrimitiveWrittenAliasDomain,readPrimitiveAliasOperand} from '../primitive-local-argument-source.mjs';
import {readPrimitiveLocalExpression} from '../primitive-local-expression-source.mjs';
import {proposeCoreIntegerMethodCorpus as ordinary} from '../migrate-core-integer-methods.mjs';
import {proposeCoreIntegerMethodCorpus as sourceBound} from '../source-bound-owned-migrate-core-integer-methods.mjs';
import {proposeSourceBoundOwnedCoreStage} from '../source-bound-owned-core-bulk.mjs';
import {INTEGER_NATIVE_SOURCE} from '../integer-native-source.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE,ROUTER_CORE_BASE64_SOURCE} from '../router-core-source-data.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {translateProject} from '../project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {prepareQualifiedIntegerSources} from '../prepare-qualified-integer-sources.mjs';
const limits={timeout:60000},tokens=source=>rustTokens(source).filter(row=>row.type!=='comment'),root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')};
test('the existing ten written native domains and their actual MIN/MAX paths share the same bounded grammar',limits,()=>{
 for(const domain of ['u8','i8','u16','i16','u32','i32','u64','i64','u128','i128'])for(const prefix of ['','core::primitive::','::core::primitive::','std::primitive::','::std::primitive::']){assert.equal(readPrimitiveWrittenAliasDomain(tokens(prefix+domain)),domain);for(const bound of ['MIN','MAX'])assert.equal(readPrimitiveAliasOperand(tokens(prefix+domain+'::'+bound),new Map())?.kind,domain);}
 const rows=tokens('(::core::primitive::u64::MAX-value)/2'),value=readPrimitiveLocalExpression(rows,new Map([['value','u64']]),{readAtom:readPrimitiveAliasOperand});assert.equal(value.kind,'u64');assert.equal(value.binding,null);for(const source of ['Other::u64','my::core::primitive::u64','::core::u64','usize','u256'])assert.equal(readPrimitiveWrittenAliasDomain(tokens(source)),null,source);for(const source of ['Other::u64::MAX','::core::primitive::u64::OTHER','::core::primitive::u64::MAX()','::core::primitive::Unknown::MAX'])assert.equal(readPrimitiveAliasOperand(tokens(source),new Map()),null,source);
});
const original=[
 'pub fn direct(value: ::core::primitive::u64)->::core::primitive::u64{value.saturating_add(::core /* keep */ ::primitive::u64::MAX)}',
 'pub fn alias(value: ::std::primitive::i64)->i64{let amount: ::core::primitive::i64=value;amount.saturating_abs()}',
 'pub fn literal()->u64{let highest=(::core::primitive::u64::MAX);highest.wrapping_add(1)}',
 'pub fn computed(value: ::core::primitive::u64)->u64{let next=value+0;next.saturating_mul(::std::primitive::u64::MAX)}',
].join('\n');
function input(body=original){return {entry:'src/lib.rs',compilationProfile:PRODUCTION_PROFILE,dependencyInputs:{...cargo},files:{'src/lib.rs':'pub mod translation_core;\npub mod translation_integer_core;\n// Ω😀 preserves source offsets\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE,'src/translation_integer_core.rs':INTEGER_NATIVE_SOURCE}};}
function rejoin(proposal,source){const row=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,source);assert.deepEqual(row.trace.map(part=>part.phase),['language','repository']);assert.equal(proposal.executableAdmission,false);return row;}
for(const [name,propose]of [['ordinary',ordinary],['source-bound',sourceBound]])test(name+' complete qualified parameter alias literal expression and argument sources retain native spelling and trivia',limits,()=>{
 const request=input(),row=rejoin(propose(request),request.files['src/lib.rs']);assert.equal(row.edits.length,4);assert.ok(row.after.source.includes('::core /* keep */ ::primitive::u64::MAX'));assert.ok(row.after.source.includes('let highest=(::core::primitive::u64::MAX);'));assert.ok(row.after.source.includes('value: ::core::primitive::u64'));for(const selected of row.selections){assert.equal(selected.oldTraitDispatchProved,false);assert.equal(selected.executableAdmission,false);}
});
for(const [name,propose]of [['ordinary',ordinary],['source-bound',sourceBound]])test(name+' custom qualified names and unknown static-bound domains remain unproved',limits,()=>{
 for(const body of ['pub fn f(value:Other::u64)->u64{value.saturating_add(1)}','pub fn f()->u64{let value=Other::u64::MAX;value.saturating_add(1)}','pub fn f(value:u64)->u64{value.saturating_add(::core::primitive::i64::MAX)}']){const request=input(body);assert.equal(rejoin(propose(request),request.files['src/lib.rs']).edits.length,0,body);}
});
test('the actual fixed integer stage receives qualified original source and independent JS strict TS native boundary cases',limits,async()=>{
 const request=input(),proposal=await proposeSourceBoundOwnedCoreStage('integer-methods',request),row=rejoin(proposal,request.files['src/lib.rs']);assert.equal(row.edits.length,4);const files=proposal.after,result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});for(const name of ['direct','alias','literal','computed'])assert.ok(result.meta.executable.some(row=>row.name===name),JSON.stringify(result.meta.refused));await verifyTypedTargets(result,api=>{for(const value of [0n,1n,18446744073709551615n])assert.equal(api.direct(value),18446744073709551615n);assert.equal(api.alias(-9223372036854775808n),9223372036854775807n);assert.equal(api.alias(-1n),1n);assert.equal(api.alias(0n),0n);assert.equal(api.literal(),0n);assert.equal(api.computed(0n),0n);assert.equal(api.computed(1n),18446744073709551615n);assert.equal(api.computed(2n),18446744073709551615n);},{childTimeoutMs:20000});
});
test('four complete native-owner source equations retain all originals both phases and full inverses',limits,()=>{
 const plan=prepareQualifiedIntegerSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});

// Independent complete integer method chain SOURCE. All cases UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readJsonFieldCallSource,readJsonFieldReferenceSourceRole} from '../json-field-call-source.mjs';
import {rustTokens} from '../rust-structure.mjs';
import {proposeCoreTextMethodCorpus as ordinaryText} from '../migrate-core-text-methods.mjs';
import {proposeCoreTextMethodCorpus as boundText} from '../source-bound-owned-migrate-core-text-methods.mjs';
import {proposeCorePrimitiveOptionMethodCorpus as ordinaryOption} from '../migrate-core-primitive-option-methods.mjs';
import {proposeCorePrimitiveOptionMethodCorpus as boundOption} from '../source-bound-owned-migrate-core-primitive-option-methods.mjs';
import {proposeCorePrimitiveOptionCallbackMethodCorpus as ordinaryCallback} from '../migrate-core-primitive-option-callback-methods.mjs';
import {proposeCorePrimitiveOptionCallbackMethodCorpus as boundCallback} from '../source-bound-owned-migrate-core-primitive-option-callback-methods.mjs';
import {proposeSourceBoundOwnedCoreStage} from '../source-bound-owned-core-bulk.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE,ROUTER_CORE_BASE64_SOURCE} from '../router-core-source-data.mjs';
import {JSON_FIELDS_NATIVE_SOURCE} from '../json-fields-native-source.mjs';
import {TEXT_NATIVE_SOURCE} from '../text-native-source.mjs';
import {PRIMITIVE_OPTION_NATIVE_SOURCE} from '../primitive-option-native-source.mjs';
import {PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE} from '../primitive-option-callback-native-source.mjs';
import {INTEGER_NATIVE_SOURCE} from '../integer-native-source.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {translateProject} from '../project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {verifyTypedTargets} from './text-typed-targets.mjs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {json_macro_null as nil,json_macro_bool as bool,json_macro_string as text,json_macro_object as object,json_macro_u64 as unsigned,json_macro_i64 as signed} from '../json-macro-runtime.mjs';
import {proposeCoreIntegerMethodCorpus as ordinaryInteger} from '../migrate-core-integer-methods.mjs';
import {proposeCoreIntegerMethodCorpus as boundInteger} from '../source-bound-owned-migrate-core-integer-methods.mjs';
import {readPrimitiveCoreCallSource,readPrimitiveCoreParameterSourceRole} from '../primitive-core-call-source.mjs';
import {collectSourceBoundOwnedCoreFixedPoint} from '../source-bound-owned-core-fixed-point.mjs';
import {readQualifiedSourceCallPrefixTokens} from '../qualified-source-call-tokens.mjs';
import {readPrimitiveLocalExpression} from '../primitive-local-expression-source.mjs';
import {readPrimitiveLocalComparisonSource} from '../primitive-local-comparison-source.mjs';
import {readPrimitiveAliasOperand} from '../primitive-local-argument-source.mjs';
import {readPrimitiveRoleExpressionSource} from '../primitive-carrier-expression-source.mjs';
import {readCarrierAliasOperand} from '../primitive-carrier-local-source.mjs';
import {PRIMITIVE_RESULT_NATIVE_SOURCE} from '../primitive-result-native-source.mjs';
import {OWNED_RESULT_NATIVE_SOURCE} from '../owned-result-native-source.mjs';
import {proposeCorePrimitiveResultMethodCorpus as ordinaryResult} from '../migrate-core-primitive-result-methods.mjs';
import {proposeCorePrimitiveResultMethodCorpus as boundResult} from '../source-bound-owned-migrate-core-primitive-result-methods.mjs';
import {readPrimitiveLocalBooleanSource} from '../primitive-local-boolean-source.mjs';
import {proposeCoreOwnedResultMethodCorpus as ordinaryOwned} from '../migrate-core-owned-result-methods.mjs';
import {proposeCoreOwnedResultMethodCorpus as boundOwned} from '../source-bound-owned-migrate-core-owned-result-methods.mjs';
import {readCarrierConditionalSource} from '../carrier-conditional-source.mjs';
import {readCarrierBranchLocalSource} from '../carrier-branch-local-source.mjs';
import * as callback from '../primitive-option-callback-runtime.mjs';
import {PRIMITIVE_OPTION_CALLBACK_CONTRACTS,emitPrimitiveOptionCallbackDeclarations} from '../primitive-option-callback-contracts.mjs';
import {readQualifiedSourceMacroTokens} from '../qualified-source-call-tokens.mjs';
import {readCoreFormattingMacroSource} from '../core-formatting-macro-source.mjs';
import {readPrimitiveOptionCallbackCallSource} from '../primitive-option-callback-call-source.mjs';
import {readCoreCarrierContractSourceRole} from '../core-carrier-call-source.mjs';
import {proposeCallbackCoreBodySource} from '../callback-core-body-source.mjs';
import {prepareIntegerMethodChainSources} from '../prepare-integer-method-chain-sources.mjs';
const limits={timeout:60000},root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')},some=field0=>({$:'Some',field0}),none={$:'None'},I='crate::translation_integer_core::';
const integerBodies=`pub fn fused(value:u64)->u64{value.saturating_add(2).wrapping_mul(3).clamp(4,100)}
pub fn signed(value:i64)->i64{value.wrapping_add(2).saturating_abs().min(10)}
pub fn checked(value:u64,divisor:u64)->Option<u64>{value.saturating_add(2).checked_div(divisor)}
pub fn core(value:u64)->u64{${I}u64_saturating_add(value,1_u64).saturating_mul(2).max(3)}
pub fn defaulted(value:u64,divisor:u64)->u64{let pending=value.saturating_add(2).checked_div(divisor);pending.unwrap_or(0)}
`;
const callbackBody='pub fn callback(value:Option<u64>)->Option<u64>{value.map(|number|number.saturating_add(2).wrapping_mul(3).clamp(4,100))}';
const bodies=integerBodies+callbackBody;
for(const [label,propose]of [['ordinary integer',ordinaryInteger],['source-bound integer',boundInteger]])test(label+' selects complete original chains in one source substitution each',limits,()=>{
 const request=input(integerBodies),row=rejoin(propose(request),request.files['src/lib.rs']);assert.equal(row.edits.length,5);assert.deepEqual(row.selections.map(row=>row.operations.length),[3,3,2,2,2]);for(const selection of row.selections){assert.equal(selection.operation,selection.operations.at(-1));assert.equal(selection.method,selection.methods.at(-1));assert.equal(selection.sourceAuthority,false);assert.equal(selection.semanticAuthority,false);assert.equal(selection.executableAdmission,false);}assert.ok(row.edits.some(row=>row.expected==='value.saturating_add(2).wrapping_mul(3).clamp(4,100)'));
});
for(const [label,propose]of [['ordinary integer',ordinaryInteger],['source-bound integer',boundInteger]])test(label+' refuses an over-bound complete chain without retaining an earlier partial function edit',limits,()=>{
 const body='pub fn too_long(value:u64)->u64{let earlier=value.saturating_add(1);value'+'.saturating_add(1)'.repeat(65)+'}',request=input(body),row=rejoin(propose(request),request.files['src/lib.rs']);assert.equal(row.edits.length,0);assert.equal(row.after.source,request.files['src/lib.rs']);assert.ok(row.preserved.some(row=>row.reason.includes('exceeds64')));
});
test('shared callback body integer engine emits one complete chain child instead of one child per link',limits,()=>{
 const body='number.saturating_add(2).wrapping_mul(3).clamp(4,100)',proposal=proposeCallbackCoreBodySource(body,new Map([['number',{kind:'payload',domain:'u64'}]]));assert.deepEqual(proposal.bodySourceHistories.map(row=>row.name),['integer']);assert.equal(proposal.bodySourceHistories[0].proposal.selections[0].operations.length,3);assert.equal(proposal.sourceStagesComplete,false);assert.equal(proposal.executableAdmission,false);assert.equal(proposal.before.source,body);
});
for(const [label,propose]of [['ordinary Option callback',ordinaryCallback],['source-bound Option callback',boundCallback]])test(label+' adopts complete actual callback chains and full original parent source inverses',limits,()=>{
 const request=input(callbackBody),row=rejoin(propose(request),request.files['src/lib.rs']);assert.equal(row.edits.length,1);const child=row.selections[0].callbackTextSourceHistories[0];assert.equal(child.bodySourceHistories[0].proposal.selections[0].operations.length,3);assert.equal(row.selections[0].executableAdmission,false);
});
test('all six original integer chain callers receive independent JS and strict TypeScript across native limits and Option boundaries',limits,async()=>{
 const request=input();let files=request.files;for(const stage of ['integer-methods','primitive-option-methods','primitive-option-callback-methods'])files=(await proposeSourceBoundOwnedCoreStage(stage,{...request,files})).after;const result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});await verifyTypedTargets(result,api=>{assert.equal(api.fused(0n),6n);assert.equal(api.fused(3n),15n);assert.equal(api.fused(18446744073709551615n),100n);assert.equal(api.signed(-3n),1n);assert.equal(api.signed(9223372036854775807n),10n);assert.equal(api.signed(-9223372036854775808n),10n);assert.deepEqual(api.checked(3n,1n),some(5n));assert.deepEqual(api.checked(3n,0n),none);assert.equal(api.core(0n),3n);assert.equal(api.core(3n),8n);assert.equal(api.defaulted(3n,0n),0n);assert.equal(api.defaulted(3n,1n),5n);assert.deepEqual(api.callback(some(3n)),some(15n));assert.deepEqual(api.callback(some(18446744073709551615n)),some(100n));assert.deepEqual(api.callback(none),none);},{childTimeoutMs:20000});
});
test('partially known chains cannot admit an actual incompatible later argument',limits,async()=>{
 const request=input('pub fn bad(value:u64,extra:i64)->u64{value.saturating_add(2).saturating_add(extra)}'),proposal=await proposeSourceBoundOwnedCoreStage('integer-methods',request),files=proposal.after,result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});assert.equal(result.meta.executable.some(row=>row.name==='bad'),false);
});
test('two complete compiler source equations retain immutable native owners originals phases and full CST inverses',limits,()=>{
 const plan=prepareIntegerMethodChainSources();assert.equal(plan.files.length,2);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(row=>row.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
function input(body=bodies){const modules={translation_json_fields_core:JSON_FIELDS_NATIVE_SOURCE,translation_text_core:TEXT_NATIVE_SOURCE,translation_primitive_option_core:PRIMITIVE_OPTION_NATIVE_SOURCE,translation_primitive_option_callbacks_core:PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE,translation_integer_core:INTEGER_NATIVE_SOURCE,translation_primitive_results_core:PRIMITIVE_RESULT_NATIVE_SOURCE,translation_owned_results_core:OWNED_RESULT_NATIVE_SOURCE},files={'src/lib.rs':'pub mod translation_core;\n'+Object.keys(modules).map(name=>'pub mod '+name+';').join('\n')+'\n// Ω😀 actual stage composition source\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE};for(const [name,source]of Object.entries(modules))files['src/'+name+'.rs']=source;return {entry:'src/lib.rs',files,dependencyInputs:{...cargo},compilationProfile:PRODUCTION_PROFILE};}
function rejoin(proposal,source){const row=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,source);assert.deepEqual(row.trace.map(part=>part.phase),['language','repository']);assert.equal(proposal.executableAdmission,false);return row;}

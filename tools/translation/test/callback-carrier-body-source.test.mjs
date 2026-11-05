// Independent actual nested carrier callback body SOURCE. All cases UNRUN.
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
import {proposeCallbackCarrierBodySource} from '../callback-carrier-body-source.mjs';
import {proposeCallbackCoreBodySource} from '../callback-core-body-source.mjs';
import {prepareCallbackCarrierBodySources} from '../prepare-callback-carrier-body-sources.mjs';
const limits={timeout:60000},root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')},some=field0=>({$:'Some',field0}),none={$:'None'},ok=field0=>({$:'Ok',field0}),err=field0=>({$:'Err',field0}),R='crate::translation_primitive_results_core::';
const optionBodies=`pub fn option_nested(value:Option<u64>,inner:Option<u64>)->Option<u64>{value.and_then(|outer|inner.map(|number|number.saturating_add(outer)))}
pub fn option_result(value:Option<bool>)->Option<u64>{value.and_then(|_flag|{let pending=${R}u64_ok(3_u64);pending.map(|number|number.saturating_add(2)).ok()})}
pub fn lazy_nested(value:Option<u64>)->u64{value.unwrap_or_else(||{let pending=${R}u64_ok(7_u64);pending.map(|number|number.saturating_add(2)).unwrap_or(0_u64)})}
pub fn three_option(value:Option<u64>,middle:Option<u64>,inner:Option<u64>)->Option<u64>{value.and_then(|outer|middle.and_then(|part|inner.map(|number|number.saturating_add(outer).saturating_add(part))))}
`;
const resultBody='pub fn result_nested(value:Result<u64,String>,inner:Option<u64>)->Result<u64,String>{value.and_then(|outer|inner.map(|number|number.saturating_add(outer)).ok_or("missing".to_owned()))}';
const ownedBody='pub fn owned_nested(value:Result<String,String>,pending:Option<&str>)->Result<String,String>{value.and_then(|_original|pending.map(|item|item.trim().to_owned()).ok_or("missing".to_owned()))}';
const bodies=optionBodies+resultBody+ownedBody;
function restored(child){let source=child.after.source;for(const row of [...child.mapping].reverse())if(row.kind==='substitution')source=source.slice(0,row.after[0])+row.expected+source.slice(row.after[1]);assert.equal(source,child.before.source);assert.equal(transportConcreteSyntaxMeta(child.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(child.after.meta).source,child.after.source);assert.deepEqual(child.trace.map(row=>row.phase),['language','repository']);assert.equal(child.wrapper.functionOwnerProved,false);assert.equal(child.wrapper.temporaryTypesAreSourceData,true);assert.equal(child.sourceAuthority,false);assert.equal(child.semanticAuthority,false);assert.equal(child.executableAdmission,false);return child;}
test('four actual carrier selectors can be reused on complete callback body source with full child inverses',limits,()=>{
 const scope=new Map([['pending',{kind:'option',domain:'u64'}],['result',{kind:'result',domain:'u64'}],['text',{kind:'result',domain:'text'}]]);for(const [family,body]of [['option-methods','pending.unwrap_or(0_u64)'],['option-callback-methods','pending.map(|number|number.saturating_add(2))'],['primitive-result-methods','result.map(|number|number.saturating_add(2))'],['owned-result-methods','text.map(|message|message.trim().to_owned())']]){const proposal=restored(proposeCallbackCarrierBodySource(body,scope,{family}));assert.ok(proposal.edits.length);for(const edit of proposal.edits)assert.equal(body.slice(...edit.span),edit.expected);assert.ok(proposal.selections.every(row=>row.functionOwnerProved===false));}
 assert.throws(()=>proposeCallbackCarrierBodySource('pending.unwrap()',scope,{family:'constructor'}),/Closed carrier body/u);assert.throws(()=>proposeCallbackCarrierBodySource('pending.unwrap()',scope,{callbackBodyProposer:42}),/internal adapter/u);assert.equal(proposeCallbackCarrierBodySource('unknown.map(|number|number)',scope),null);
});
test('recursive existing source body rules retain complete intermediate histories and bounded source-only receipts',limits,()=>{
 const scope=new Map([['inner',{kind:'option',domain:'u64'}],['outer',{kind:'payload',domain:'u64'}]]),body='inner.map(|number|number.saturating_add(outer))',proposal=restored(proposeCallbackCoreBodySource(body,scope));assert.ok(proposal.after.source.includes('translation_primitive_option_callbacks_core'));assert.ok(proposal.after.source.includes('translation_integer_core'));assert.ok(proposal.bodySourceHistories.some(row=>row.name==='option-callback-methods'));assert.equal(proposal.sourceStagesStable,true);assert.equal(proposal.sourceStagesComplete,false);assert.ok(Buffer.byteLength(JSON.stringify(proposal),'utf8')<=8388608);let current=body;for(const stage of proposal.bodySourceHistories){assert.equal(stage.proposal.before.source,current);restored(stage.proposal);current=stage.proposal.after.source;}assert.equal(current,proposal.after.source);assert.equal(proposeCallbackCoreBodySource(body,scope,{sourceDepth:8}),null);for(const sourceDepth of [-1,0.5,NaN])assert.throws(()=>proposeCallbackCoreBodySource(body,scope,{sourceDepth}),/source depth/u);assert.equal(proposeCallbackCoreBodySource('x'.repeat(65537),scope),null);
});
for(const [label,propose,body,count]of [['ordinary Option callback',ordinaryCallback,optionBodies,4],['source-bound Option callback',boundCallback,optionBodies,4],['ordinary Result',ordinaryResult,resultBody,1],['source-bound Result',boundResult,resultBody,1],['ordinary owning Result',ordinaryOwned,ownedBody,1],['source-bound owning Result',boundOwned,ownedBody,1]])test(label+' bulk substitutes nested callback families while retaining every original outer and child body',limits,()=>{
 const request=input(body),row=rejoin(propose(request),request.files['src/lib.rs']);assert.equal(row.edits.length,count);assert.ok(row.selections.every(row=>row.executableAdmission===false));for(const selection of row.selections)for(const child of selection.callbackTextSourceHistories){restored(child);assert.ok(child.bodySourceHistories.length);for(const stage of child.bodySourceHistories)restored(stage.proposal);}assert.equal(row.after.source.includes('::translation_compatibility_'),false);
});
test('all six actual nested carrier source callers receive independent JavaScript and strict TypeScript',limits,async()=>{
 const request=input();let files=request.files;for(const stage of ['primitive-option-callback-methods','primitive-result-methods','owned-result-methods'])files=(await proposeSourceBoundOwnedCoreStage(stage,{...request,files})).after;const result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});await verifyTypedTargets(result,api=>{assert.deepEqual(api.option_nested(some(3n),some(4n)),some(7n));assert.deepEqual(api.option_nested(none,some(4n)),none);assert.deepEqual(api.option_nested(some(3n),none),none);assert.deepEqual(api.option_nested(some(18446744073709551615n),some(4n)),some(18446744073709551615n));assert.deepEqual(api.option_result(some(false)),some(5n));assert.deepEqual(api.option_result(none),none);assert.equal(api.lazy_nested(none),9n);assert.equal(api.lazy_nested(some(3n)),3n);assert.deepEqual(api.three_option(some(1n),some(2n),some(3n)),some(6n));assert.deepEqual(api.three_option(some(1n),none,some(3n)),none);assert.deepEqual(api.result_nested(ok(3n),some(4n)),ok(7n));assert.deepEqual(api.result_nested(ok(3n),none),err('missing'));assert.deepEqual(api.result_nested(err('Ω😀'),some(4n)),err('Ω😀'));assert.deepEqual(api.owned_nested(ok('unused'),some(' é😀 ')),ok('é😀'));assert.deepEqual(api.owned_nested(ok('unused'),none),err('missing'));assert.deepEqual(api.owned_nested(err('Ω😀'),some(' é😀 ')),err('Ω😀'));},{childTimeoutMs:20000});
});
test('nested source body proposals cannot admit an incompatible actual receiver',limits,async()=>{
 const request=input('pub fn bad(value:Option<u64>,inner:u64)->Option<u64>{value.and_then(|outer|inner.map(|number|number.saturating_add(outer)))}'),proposal=await proposeSourceBoundOwnedCoreStage('primitive-option-callback-methods',request),files=proposal.after,result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});assert.equal(result.meta.executable.some(row=>row.name==='bad'),false);
});
test('twelve complete compiler source equations retain native selected helpers originals phases and full CST inverses',limits,()=>{
 const plan=prepareCallbackCarrierBodySources();assert.equal(plan.files.length,12);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(row=>row.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
function input(body=bodies){const modules={translation_json_fields_core:JSON_FIELDS_NATIVE_SOURCE,translation_text_core:TEXT_NATIVE_SOURCE,translation_primitive_option_core:PRIMITIVE_OPTION_NATIVE_SOURCE,translation_primitive_option_callbacks_core:PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE,translation_integer_core:INTEGER_NATIVE_SOURCE,translation_primitive_results_core:PRIMITIVE_RESULT_NATIVE_SOURCE,translation_owned_results_core:OWNED_RESULT_NATIVE_SOURCE},files={'src/lib.rs':'pub mod translation_core;\n'+Object.keys(modules).map(name=>'pub mod '+name+';').join('\n')+'\n// Ω😀 actual stage composition source\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE};for(const [name,source]of Object.entries(modules))files['src/'+name+'.rs']=source;return {entry:'src/lib.rs',files,dependencyInputs:{...cargo},compilationProfile:PRODUCTION_PROFILE};}
function rejoin(proposal,source){const row=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,source);assert.deepEqual(row.trace.map(part=>part.phase),['language','repository']);assert.equal(proposal.executableAdmission,false);return row;}

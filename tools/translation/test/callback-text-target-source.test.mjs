// Independent explicitly contextual borrowed text Into SOURCE. All UNRUN.
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
import {proposeCallbackIntegerBodySource} from '../callback-integer-body-source.mjs';
import {proposeCallbackCoreBodySource} from '../callback-core-body-source.mjs';
import {prepareCallbackTextTargetSources} from '../prepare-callback-text-target-sources.mjs';
import {proposeCallbackCoreBodySource} from '../callback-core-body-source.mjs';
import {proposeCallbackTextBodySource} from '../callback-text-body-source.mjs';
const limits={timeout:60000},root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')},some=field0=>({$:'Some',field0}),none={$:'None'},ok=field0=>({$:'Ok',field0}),err=field0=>({$:'Err',field0});
const bodies=`pub fn direct(value:Option<&str>)->Option<String>{value.map(|text|text.into())}
pub fn blocked(value:Option<&str>)->Option<String>{value.map(|text|{text.into()})}
pub fn written(value:Option<&str>)->Option<String>{value.map(|text|->String{text.into()})}
pub fn trimmed(value:Option<&str>)->Option<String>{value.map(|text|text.trim().into())}
pub fn lazy(value:Option<u64>,message:&str)->Result<u64,String>{value.ok_or_else(||message.into())}
pub fn mapped(value:Result<&str,String>)->Result<String,String>{value.map(|text|text.into())}
`;
function inverse(row){let source=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')source=source.slice(0,part.after[0])+part.expected+source.slice(part.after[1]);assert.equal(source,row.before.source);assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);assert.deepEqual(row.trace.map(stage=>stage.phase),['language','repository']);return row;}
for(const [label,propose]of [['ordinary Option',ordinaryCallback],['source-bound Option',boundCallback]])test(label+' propagates explicit owning source targets across expression block typed chained and lazy callbacks',limits,()=>{
 const request=input(),row=inverse(propose(request).proposals.find(row=>row.file==='src/lib.rs'));assert.equal(row.edits.length,5);assert.ok(row.after.source.includes('crate::translation_text_core::to_owned('));for(const selection of row.selections){assert.equal(selection.executableAdmission,false);for(const history of selection.callbackTextSourceHistories??[]){inverse(history);assert.equal(history.functionOwnerProved,false);}}
});
for(const [label,propose]of [['ordinary Result',ordinaryOwned],['source-bound Result',boundOwned]])test(label+' maps borrowed text into the explicit owning Result callback destination',limits,()=>{
 const request=input(),row=inverse(propose(request).proposals.find(row=>row.file==='src/lib.rs'));assert.equal(row.edits.length,1);assert.ok(row.after.source.includes('crate::translation_text_core::to_owned('));
});
test('callback wrapper declaration types remain DATA and all body substitutions keep exact original inverses',limits,()=>{
 const scope=new Map([['value',{kind:'payload',domain:'str'}]]);for(const body of ['value.into()','{value.into()}','{return value.into();}','value.trim().into()'])for(const propose of [proposeCallbackTextBodySource,proposeCallbackCoreBodySource]){const row=inverse(propose(body,scope,{expectedOutput:'text-owned'}));assert.equal(row.wrapper.temporaryTypesAreSourceData,true);assert.equal(row.wrapper.functionOwnerProved,false);assert.ok(row.wrapper.source.includes('->String'));assert.equal(row.after.source.includes('.into()'),false);}assert.equal(proposeCallbackTextBodySource('value.into()',scope),null);assert.equal(proposeCallbackCoreBodySource('value.into()',scope),null);assert.equal(proposeCallbackTextBodySource('value.into()',new Map([['value',{kind:'payload',domain:'text-owned'}]]),{expectedOutput:'text-owned'}),null);
});
test('all six actual complete callers receive independent JS strict TS and original carrier behavior',limits,async()=>{
 const request=input();let files=(await proposeSourceBoundOwnedCoreStage('primitive-option-callback-methods',request)).after;files=(await proposeSourceBoundOwnedCoreStage('owned-result-methods',{...request,files})).after;const result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});await verifyTypedTargets(result,api=>{for(const name of ['direct','blocked','written']){assert.deepEqual(api[name](some('é😀')),some('é😀'));assert.deepEqual(api[name](none),none);}assert.deepEqual(api.trimmed(some(' é😀 ')),some('é😀'));assert.deepEqual(api.lazy(some(0n),'error'),ok(0n));assert.deepEqual(api.lazy(none,'é😀'),err('é😀'));assert.deepEqual(api.mapped(ok('é😀')),ok('é😀'));assert.deepEqual(api.mapped(err('error')),err('error'));},{childTimeoutMs:20000});
});
test('six complete compiler equations retain full original sources native owners phases and exact inverses',limits,()=>{
 const plan=prepareCallbackTextTargetSources();assert.equal(plan.files.length,6);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
function input(body=bodies){const modules={translation_json_fields_core:JSON_FIELDS_NATIVE_SOURCE,translation_text_core:TEXT_NATIVE_SOURCE,translation_primitive_option_core:PRIMITIVE_OPTION_NATIVE_SOURCE,translation_primitive_option_callbacks_core:PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE,translation_integer_core:INTEGER_NATIVE_SOURCE,translation_primitive_results_core:PRIMITIVE_RESULT_NATIVE_SOURCE,translation_owned_results_core:OWNED_RESULT_NATIVE_SOURCE},files={'src/lib.rs':'pub mod translation_core;\n'+Object.keys(modules).map(name=>'pub mod '+name+';').join('\n')+'\n// Ω😀 actual stage composition source\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE};for(const [name,source]of Object.entries(modules))files['src/'+name+'.rs']=source;return {entry:'src/lib.rs',files,dependencyInputs:{...cargo},compilationProfile:PRODUCTION_PROFILE};}
function rejoin(proposal,source){const row=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,source);assert.deepEqual(row.trace.map(part=>part.phase),['language','repository']);assert.equal(proposal.executableAdmission,false);return row;}

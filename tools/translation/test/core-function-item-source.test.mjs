// Independent exact-path core function item callback SOURCE. All UNRUN.
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
import {readQualifiedSourcePathTokens} from '../qualified-source-call-tokens.mjs';
import {createKnownCoreCallbackFunctionSource} from '../known-core-callback-function-source.mjs';
import {prepareCoreFunctionItemSources} from '../prepare-core-function-item-sources.mjs';
const limits={timeout:60000},root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')},tokens=source=>rustTokens(source).filter(row=>row.type!=='comment'),some=field0=>({$:'Some',field0}),none={$:'None'},ok=field0=>({$:'Ok',field0}),err=field0=>({$:'Err',field0}),T='crate::translation_text_core::',I='crate::translation_integer_core::',O='crate::translation_primitive_option_core::',R='crate::translation_primitive_results_core::',W='crate::translation_owned_results_core::';
const optionBodies=`pub fn empty(value:Option<&str>)->Option<bool>{value.map(${T}is_empty)}
pub fn copied(value:Option<&str>)->Option<String>{value.map(${T}to_owned)}
pub fn absolute(value:Option<i64>)->Option<i64>{value.map(${I}i64_saturating_abs)}
pub fn identity(value:Option<u64>)->Option<u64>{value.and_then(${O}u64_some)}
pub fn alternative(value:Option<String>)->Option<String>{value.or_else(${O}text_owned_none)}
pub fn predicate(value:Option<&str>)->bool{value.is_some_and(${T}is_empty)}
pub fn hygiene(value:Option<&str>,__router_callback_argument:&str)->Option<String>{value.map(${T}to_owned)}
`;
const resultBodies=`pub fn absolute_result(value:Result<i64,String>)->Result<i64,String>{value.map(${I}i64_saturating_abs)}
pub fn chained(value:Result<u64,String>)->Result<u64,String>{value.and_then(${R}u64_ok)}
`;
const ownedBody=`pub fn recovered(value:Result<String,String>)->Result<String,String>{value.or_else(${W}text_ok)}`;
const bodies=optionBodies+resultBodies+ownedBody;
function restore(child){let source=child.after.source;for(const row of [...child.mapping].reverse())if(row.kind==='substitution')source=source.slice(0,row.after[0])+row.expected+source.slice(row.after[1]);assert.equal(source,child.before.source);assert.equal(transportConcreteSyntaxMeta(child.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(child.after.meta).source,child.after.source);assert.deepEqual(child.trace.map(row=>row.phase),['language','repository']);assert.equal(child.wrapper.functionOwnerProved,false);assert.equal(child.sourceAuthority,false);assert.equal(child.semanticAuthority,false);assert.equal(child.executableAdmission,false);assert.equal(child.functionItem.sameFunctionPathRetained,true);assert.equal(child.functionItem.sourceBindingProved,false);assert.equal(child.functionItem.callbackTypesChecked,false);return child;}
test('complete qualified path syntax stays closed and original function item reification retains its exact function path and CST inverse',limits,()=>{
 const source='crate:: /* Ω😀 */ translation_text_core::to_owned',rows=tokens(source),syntax=readQualifiedSourcePathTokens(rows);assert.deepEqual(syntax.path,['crate','translation_text_core','to_owned']);assert.equal(syntax.sourceAuthority,false);const choose=createKnownCoreCallbackFunctionSource(source,rows,new Set(['__router_callback_argument'])),first=choose(rows,['str']),second=choose(rows,['str']);assert.equal(first.role.domain,'text-owned');assert.equal(first.sourceHistory.functionItem.argument,'__router_callback_argument_1');assert.equal(second.sourceHistory.functionItem.argument,'__router_callback_argument_2');restore(first.sourceHistory);assert.ok(first.replacement.includes(source));assert.equal(first.sourceHistory.before.source,source);for(const bad of ['crate::','crate::module::function()','crate::module::function::<u64>','unknown'])assert.equal(readQualifiedSourcePathTokens(tokens(bad)),null,bad);
});
test('only existing exact core functions with matching zero/one payload input are reified',limits,()=>{
 for(const [source,inputs,kind,domain]of [[T+'is_empty',['str'],'payload','bool'],[I+'i64_saturating_abs',['i64'],'payload','i64'],[O+'u64_some',['u64'],'option','u64'],[O+'text_owned_none',[],'option','text-owned'],[R+'u64_ok',['u64'],'result','u64']]){const rows=tokens(source),row=createKnownCoreCallbackFunctionSource(source,rows)(rows,inputs);assert.equal(row.role.kind,kind);assert.equal(row.role.domain,domain);restore(row.sourceHistory);}
 for(const [source,inputs]of [['str::is_empty',['str']],[T+'is_empty',['text-owned']],[T+'unknown',['str']],[T+'router_text_is_empty',['str']],[I+'u64_saturating_add',['u64']],[O+'u64_some',[]]]){const rows=tokens(source);assert.equal(createKnownCoreCallbackFunctionSource(source,rows)(rows,inputs),null,source);}
 const source=T+'is_empty',rows=tokens(source);assert.throws(()=>createKnownCoreCallbackFunctionSource('changed',rows)(rows,['str']),/original callback function item/u);
});
for(const [label,propose,body,count]of [['ordinary Option callback',ordinaryCallback,optionBodies,7],['source-bound Option callback',boundCallback,optionBodies,7],['ordinary Result',ordinaryResult,resultBodies,2],['source-bound Result',boundResult,resultBodies,2],['ordinary owning Result',ordinaryOwned,ownedBody,1],['source-bound owning Result',boundOwned,ownedBody,1]])test(label+' reuses actual core function items with complete original parent and child inverses',limits,()=>{
 const request=input(body),row=rejoin(propose(request),request.files['src/lib.rs']);assert.equal(row.edits.length,count);for(const selection of row.selections){assert.equal(selection.executableAdmission,false);assert.ok(selection.callbackTextSourceHistories.length);for(const child of selection.callbackTextSourceHistories)restore(child);}if(body===optionBodies){const selection=row.selections.find(row=>row.function==='hygiene');assert.notEqual(selection.callbackTextSourceHistories[0].functionItem.argument,'__router_callback_argument');}
});
test('function-item source plans retain the existing32 successful body-proposal limit',limits,()=>{
 const body='pub fn bounded(value:Option<&str>)->bool{'+Array.from({length:40},(_,at)=>'let _item'+at+'=value.map('+T+'is_empty);').join('')+'true}',request=input(body),row=rejoin(ordinaryCallback(request),request.files['src/lib.rs']);assert.equal(row.edits.length,32);assert.ok(row.after.source.includes('let _item39=value.map('+T+'is_empty)'));
});
test('all ten actual core function-item callers receive independent JavaScript and strict TypeScript',limits,async()=>{
 const request=input();let files=request.files;for(const stage of ['primitive-option-callback-methods','primitive-result-methods','owned-result-methods'])files=(await proposeSourceBoundOwnedCoreStage(stage,{...request,files})).after;const result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});await verifyTypedTargets(result,api=>{assert.deepEqual(api.empty(some('')),some(true));assert.deepEqual(api.empty(some('é😀')),some(false));assert.deepEqual(api.empty(none),none);assert.deepEqual(api.copied(some('é😀')),some('é😀'));assert.deepEqual(api.copied(none),none);assert.deepEqual(api.absolute(some(-9223372036854775808n)),some(9223372036854775807n));assert.deepEqual(api.absolute(none),none);assert.deepEqual(api.identity(some(0n)),some(0n));assert.deepEqual(api.identity(none),none);assert.deepEqual(api.alternative(some('é😀')),some('é😀'));assert.deepEqual(api.alternative(none),none);assert.equal(api.predicate(some('')),true);assert.equal(api.predicate(some('é😀')),false);assert.equal(api.predicate(none),false);assert.deepEqual(api.hygiene(some('é😀'),'outer'),some('é😀'));assert.deepEqual(api.absolute_result(ok(-3n)),ok(3n));assert.deepEqual(api.absolute_result(err('Ω😀')),err('Ω😀'));assert.deepEqual(api.chained(ok(0n)),ok(0n));assert.deepEqual(api.chained(err('Ω😀')),err('Ω😀'));assert.deepEqual(api.recovered(ok('value')),ok('value'));assert.deepEqual(api.recovered(err('Ω😀')),ok('Ω😀'));},{childTimeoutMs:20000});
});
test('known function items with incompatible original payloads remain nonexecutable',limits,async()=>{
 const request=input(`pub fn bad(value:Option<String>)->Option<bool>{value.map(${T}is_empty)}`),proposal=await proposeSourceBoundOwnedCoreStage('primitive-option-callback-methods',request),files=proposal.after,result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});assert.equal(result.meta.executable.some(row=>row.name==='bad'),false);
});
test('six full compiler source equations retain immutable native owners originals phases and CST inverses',limits,()=>{
 const plan=prepareCoreFunctionItemSources();assert.equal(plan.files.length,6);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(row=>row.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
function input(body=bodies){const modules={translation_json_fields_core:JSON_FIELDS_NATIVE_SOURCE,translation_text_core:TEXT_NATIVE_SOURCE,translation_primitive_option_core:PRIMITIVE_OPTION_NATIVE_SOURCE,translation_primitive_option_callbacks_core:PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE,translation_integer_core:INTEGER_NATIVE_SOURCE,translation_primitive_results_core:PRIMITIVE_RESULT_NATIVE_SOURCE,translation_owned_results_core:OWNED_RESULT_NATIVE_SOURCE},files={'src/lib.rs':'pub mod translation_core;\n'+Object.keys(modules).map(name=>'pub mod '+name+';').join('\n')+'\n// Ω😀 actual stage composition source\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE};for(const [name,source]of Object.entries(modules))files['src/'+name+'.rs']=source;return {entry:'src/lib.rs',files,dependencyInputs:{...cargo},compilationProfile:PRODUCTION_PROFILE};}
function rejoin(proposal,source){const row=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,source);assert.deepEqual(row.trace.map(part=>part.phase),['language','repository']);assert.equal(proposal.executableAdmission,false);return row;}

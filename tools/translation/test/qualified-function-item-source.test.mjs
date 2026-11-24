// Independent exact original qualified callback SOURCE. All cases UNRUN.
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
import {createQualifiedCallbackFunctionSource} from '../qualified-callback-function-source.mjs';
import {prepareQualifiedFunctionItemSources} from '../prepare-qualified-function-item-sources.mjs';
const limits={timeout:60000},root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')},tokens=source=>rustTokens(source).filter(row=>row.type!=='comment'),some=field0=>({$:'Some',field0}),none={$:'None'},ok=field0=>({$:'Ok',field0}),err=field0=>({$:'Err',field0}),T='crate::translation_text_core::',I='crate::translation_integer_core::',O='crate::translation_primitive_option_core::',R='crate::translation_primitive_results_core::',W='crate::translation_owned_results_core::';
const declarations=`pub fn original_empty(value:&str)->bool{${T}is_empty(value)}
pub fn original_copy(value:&str)->String{${T}to_owned(value)}
pub fn original_trim(value:&str)->&str{${T}trim(value)}
pub fn original_some(value:u64)->Option<u64>{${O}u64_some(value)}
pub fn original_none()->Option<String>{${O}text_owned_none()}
pub fn original_zero()->u64{0_u64}
pub fn original_absolute(value:i64)->i64{${I}i64_saturating_abs(value)}
pub fn original_ok(value:u64)->Result<u64,String>{${R}u64_ok(value)}
pub fn original_error(value:String)->String{value}
pub fn original_recover(_error:String)->u64{0_u64}
pub fn original_text_ok(value:String)->Result<String,String>{${W}text_ok(value)}
`;
const optionBodies=`pub fn copied(value:Option<&str>)->Option<String>{value.map(crate::original_copy)}
pub fn empty(value:Option<&str>)->Option<bool>{value.map(crate::original_empty)}
pub fn trimmed(value:Option<&str>)->Option<&str>{value.map(crate::original_trim)}
pub fn chained(value:Option<u64>)->Option<u64>{value.and_then(crate::original_some)}
pub fn alternative(value:Option<String>)->Option<String>{value.or_else(crate::original_none)}
pub fn defaulted(value:Option<u64>)->u64{value.unwrap_or_else(crate::original_zero)}
pub fn predicate(value:Option<&str>)->bool{value.is_some_and(crate::original_empty)}
pub fn hygiene(value:Option<&str>,__router_callback_argument:&str,__meta_callback_argument:&str)->Option<String>{value.map(crate::original_copy)}
`;
const resultBodies=`pub fn absolute_result(value:Result<i64,String>)->Result<i64,String>{value.map(crate::original_absolute)}
pub fn chained_result(value:Result<u64,String>)->Result<u64,String>{value.and_then(crate::original_ok)}
pub fn mapped_error(value:Result<u64,String>)->Result<u64,String>{value.map_err(crate::original_error)}
pub fn recovered(value:Result<u64,String>)->u64{value.unwrap_or_else(crate::original_recover)}
`;
const ownedBodies=`pub fn mapped_text(value:Result<String,String>)->Result<String,String>{value.map(crate::original_error)}
pub fn recovered_text(value:Result<String,String>)->Result<String,String>{value.or_else(crate::original_text_ok)}
`;
const bodies=declarations+optionBodies+resultBodies+ownedBodies;
function restore(child){let source=child.after.source;for(const row of [...child.mapping].reverse())if(row.kind==='substitution')source=source.slice(0,row.after[0])+row.expected+source.slice(row.after[1]);assert.equal(source,child.before.source);assert.equal(transportConcreteSyntaxMeta(child.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(child.after.meta).source,child.after.source);assert.deepEqual(child.trace.map(row=>row.phase),['language','repository']);assert.equal(child.wrapper.functionOwnerProved,false);assert.equal(child.sourceAuthority,false);assert.equal(child.semanticAuthority,false);assert.equal(child.executableAdmission,false);assert.equal(child.functionItem.sameFunctionPathRetained,true);assert.equal(child.functionItem.returnRoleFromContextOnly,true);assert.equal(child.functionItem.sourceBindingProved,false);assert.equal(child.functionItem.callbackTypesChecked,false);return child;}
test('general function-item language rule retains the exact path and repository rule binds fresh names with complete CST inverses',limits,()=>{
 const source='crate:: /* Ω😀 */ original_copy',rows=tokens(source),choose=createQualifiedCallbackFunctionSource(source,rows,new Set(['__router_callback_argument','__meta_callback_argument'])),first=choose(rows,['str'],{kind:'payload',domain:'text-owned'}),second=choose(rows,['str'],{kind:'payload',domain:'text-owned'});restore(first.sourceHistory);restore(second.sourceHistory);assert.equal(first.sourceHistory.functionItem.argument,'__router_callback_argument_1');assert.equal(first.sourceHistory.functionItem.neutral,'__meta_callback_argument_1');assert.notEqual(second.sourceHistory.functionItem.argument,first.sourceHistory.functionItem.argument);assert.ok(first.replacement.includes(source));assert.ok(!first.replacement.includes('__meta_callback_argument_1'));assert.deepEqual(first.role,{kind:'payload',domain:'text-owned'});
});
test('zero-argument and bounded qualified standard paths remain same-path DATA with explicit contextual roles',limits,()=>{
 for(const [source,inputs,expected]of [['crate::original_zero',[],{kind:'payload',domain:'u64'}],['str::is_empty',['str'],{kind:'payload',domain:'bool'}],['std::primitive::str::trim',['str'],{kind:'payload',domain:'str'}],['String::from',['str'],{kind:'payload',domain:'text-owned'}],['crate::original_some',['u64'],{kind:'option',domain:'u64'}]]){const rows=tokens(source),selected=createQualifiedCallbackFunctionSource(source,rows)(rows,inputs,expected);restore(selected.sourceHistory);assert.ok(selected.replacement.includes(source+'('));}
 for(const [source,inputs,expected]of [['function_value',['u64'],{kind:'payload',domain:'u64'}],['crate::function::<u64>',['u64'],{kind:'payload',domain:'u64'}],['crate::function as fn(u64)->u64',['u64'],{kind:'payload',domain:'u64'}],['crate::translation_integer_core::u64_saturating_add',['u64'],{kind:'payload',domain:'u64'}],['crate::function',['json'],{kind:'payload',domain:'bool'}],['crate::function',['u64'],null]]){const rows=tokens(source);assert.equal(createQualifiedCallbackFunctionSource(source,rows)(rows,inputs,expected),null,source);}
 const source='crate::original_copy',rows=tokens(source);assert.throws(()=>createQualifiedCallbackFunctionSource('changed',rows)(rows,['str'],{kind:'payload',domain:'text-owned'}),/original qualified callback/u);
});
for(const [label,propose,body,count]of [['ordinary Option callback',ordinaryCallback,optionBodies,8],['source-bound Option callback',boundCallback,optionBodies,8],['ordinary Result',ordinaryResult,resultBodies,4],['source-bound Result',boundResult,resultBodies,4],['ordinary owning Result',ordinaryOwned,ownedBodies,2],['source-bound owning Result',boundOwned,ownedBodies,2]])test(label+' composes general original qualified callbacks without redirecting their bindings',limits,()=>{
 const request=input(declarations+body),row=rejoin(propose(request),request.files['src/lib.rs']);assert.equal(row.edits.length,count);for(const selection of row.selections){assert.equal(selection.executableAdmission,false);for(const child of selection.callbackTextSourceHistories)restore(child);}
});
test('standard-spelling source candidates retain their exact original paths and every unchecked authority dimension',limits,()=>{
 for(const [path,output]of [['str::is_empty','bool'],['str::trim','&str'],['String::from','String']]){const request=input('pub fn selected(value:Option<&str>)->Option<'+output+'>{value.map('+path+')}'),row=rejoin(ordinaryCallback(request),request.files['src/lib.rs']);assert.equal(row.edits.length,1);assert.ok(row.after.source.includes(path+'('));restore(row.selections[0].callbackTextSourceHistories[0]);}
});
test('general qualified function candidates retain the32 shared callback body-proposal limit',limits,()=>{
 const request=input('pub fn bounded(value:Option<&str>)->bool{'+Array.from({length:40},(_,at)=>'let _item'+at+'=value.is_some_and(crate::original_empty);').join('')+'true}'),row=rejoin(ordinaryCallback(request),request.files['src/lib.rs']);assert.equal(row.edits.length,32);assert.ok(row.after.source.includes('let _item39=value.is_some_and(crate::original_empty)'));
});
test('fourteen actual named callback callers receive independently checked JavaScript and strict TypeScript',limits,async()=>{
 const request=input();let files=request.files;for(const stage of ['primitive-option-callback-methods','primitive-result-methods','owned-result-methods'])files=(await proposeSourceBoundOwnedCoreStage(stage,{...request,files})).after;const result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});await verifyTypedTargets(result,api=>{assert.deepEqual(api.copied(some('é😀')),some('é😀'));assert.deepEqual(api.copied(none),none);assert.deepEqual(api.empty(some('')),some(true));assert.deepEqual(api.trimmed(some(' é😀 ')),some('é😀'));assert.deepEqual(api.chained(some(0n)),some(0n));assert.deepEqual(api.alternative(none),none);assert.deepEqual(api.alternative(some('value')),some('value'));assert.equal(api.defaulted(none),0n);assert.equal(api.defaulted(some(3n)),3n);assert.equal(api.predicate(some('')),true);assert.equal(api.predicate(none),false);assert.deepEqual(api.hygiene(some('é😀'),'outer','other'),some('é😀'));assert.deepEqual(api.absolute_result(ok(-9223372036854775808n)),ok(9223372036854775807n));assert.deepEqual(api.absolute_result(err('Ω😀')),err('Ω😀'));assert.deepEqual(api.chained_result(ok(0n)),ok(0n));assert.deepEqual(api.mapped_error(err('Ω😀')),err('Ω😀'));assert.equal(api.recovered(err('Ω😀')),0n);assert.equal(api.recovered(ok(3n)),3n);assert.deepEqual(api.mapped_text(ok('é😀')),ok('é😀'));assert.deepEqual(api.mapped_text(err('Ω😀')),err('Ω😀'));assert.deepEqual(api.recovered_text(err('Ω😀')),ok('Ω😀'));},{childTimeoutMs:20000});
});
test('a contextual return guess never admits a missing function or an incompatible actual callback return',limits,async()=>{
 for(const body of ['pub fn bad(value:Option<u64>)->Option<u64>{value.map(crate::missing)}','pub fn actually_bool(_value:u64)->bool{true}pub fn bad(value:Option<u64>)->Option<u64>{value.map(crate::actually_bool)}']){const request=input(body),proposal=await proposeSourceBoundOwnedCoreStage('primitive-option-callback-methods',request),files=proposal.after,result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});assert.equal(result.meta.executable.some(row=>row.name==='bad'),false);}
});
test('five complete source equations preserve the entire original source engine both sequences and inverse',limits,()=>{
 const plan=prepareQualifiedFunctionItemSources();assert.equal(plan.files.length,5);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}const copied=plan.files.find(row=>row.path==='tools/translation/qualified-callback-function-source.mjs');assert.ok(copied.before.includes('export function applyLayeredCoreAdoptionSource'));assert.ok(copied.after.includes('export function applyQualifiedCallbackFunctionSource'));assert.equal(plan.receivingExecuted,false);
});
function input(body=bodies){const modules={translation_json_fields_core:JSON_FIELDS_NATIVE_SOURCE,translation_text_core:TEXT_NATIVE_SOURCE,translation_primitive_option_core:PRIMITIVE_OPTION_NATIVE_SOURCE,translation_primitive_option_callbacks_core:PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE,translation_integer_core:INTEGER_NATIVE_SOURCE,translation_primitive_results_core:PRIMITIVE_RESULT_NATIVE_SOURCE,translation_owned_results_core:OWNED_RESULT_NATIVE_SOURCE},files={'src/lib.rs':'pub mod translation_core;\n'+Object.keys(modules).map(name=>'pub mod '+name+';').join('\n')+'\n// Ω😀 actual stage composition source\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE};for(const [name,source]of Object.entries(modules))files['src/'+name+'.rs']=source;return {entry:'src/lib.rs',files,dependencyInputs:{...cargo},compilationProfile:PRODUCTION_PROFILE};}
function rejoin(proposal,source){const row=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,source);assert.deepEqual(row.trace.map(part=>part.phase),['language','repository']);assert.equal(proposal.executableAdmission,false);return row;}

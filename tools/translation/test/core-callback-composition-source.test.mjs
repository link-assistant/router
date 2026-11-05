// Independent three-catalogue callback composition SOURCE. All cases UNRUN.
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
import {readCoreCallbackCallSource} from '../core-callback-call-source.mjs';
import {prepareCoreCallbackCompositionSources} from '../prepare-core-callback-composition-sources.mjs';
const limits={timeout:60000},root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')},tokens=source=>rustTokens(source).filter(row=>row.type!=='comment'),C='crate::translation_primitive_option_callbacks_core::',R='crate::translation_primitive_results_core::',W='crate::translation_owned_results_core::',O='crate::translation_primitive_option_core::',some=field0=>({$:'Some',field0}),none={$:'None'},ok=field0=>({$:'Ok',field0}),err=field0=>({$:'Err',field0});
const optionBody=`pub fn option_after_result(value:Result<u64,String>)->u64{let pending=${R}u64_to_u64_map(value,|item|item+1_u64);let optional=${R}u64_ok_option(pending);optional.unwrap_or(0)}`;
const callbackBody=`pub fn option_chain(value:Option<u64>)->Option<u64>{${C}u64_to_u64_map(value,|item|item+1_u64).map(|other|other+2_u64)}`;
const resultBody=`pub fn result_chain(value:Result<u64,String>)->Result<u64,String>{${R}u64_to_u64_map(value,|item|item+1_u64).map(|other|other+2_u64)}`;
const ownedBody=`pub fn owned_chain(value:Result<String,String>)->Result<String,String>{${W}text_to_text_map(value,|message|message).map(|other|other)}`;
const tryOptionBody=`pub fn try_option(value:Option<u64>)->Option<u64>{let selected=${C}u64_to_u64_map(value,|item|item+1_u64)?;Some(selected.saturating_add(2))}`;
const tryResultBody=`pub fn try_result(value:Result<u64,String>)->Result<u64,String>{let selected=${R}u64_to_u64_map(value,|item|item+1_u64)?;Ok(selected.saturating_add(2))}`;
const resultNestedBody=`pub fn result_nested(value:Result<u64,String>)->Result<u64,String>{value.and_then(|item|${R}u64_to_u64_map(${R}u64_ok(item),|number|number+1_u64))}`;
const optionNestedBody=`pub fn option_nested(value:Option<u64>)->Option<u64>{value.and_then(|item|${C}u64_to_u64_map(${O}u64_some(item),|number|number+1_u64))}`;
const bodies=[optionBody,callbackBody,resultBody,ownedBody,tryOptionBody,tryResultBody,resultNestedBody,optionNestedBody].join('
');
test('actual three-library callback return and Option/Result Try roles compose fresh without body or binding authority',limits,()=>{
 const scope=new Map([['optional',{kind:'option',domain:'u64'}],['result',{kind:'result',domain:'u64'}],['text',{kind:'result',domain:'text'}]]);
 for(const [source,kind,domain]of [[C+'u64_to_u64_map(optional,|item|item)','option','u64'],[C+'u64_to_u64_map(optional,|item|item)?','payload','u64'],[R+'u64_to_u64_map(result,|item|item)','result','u64'],[R+'u64_to_u64_map(result,|item|item)?','payload','u64'],[W+'text_to_text_map(text,|item|item)?','payload','text-owned'],[R+'u64_to_u64_map('+C+'u64_ok_or_else(optional,||"missing".to_owned()),|item|item+1_u64)','result','u64']]){const row=readCoreCallbackCallSource(tokens(source),scope);assert.equal(row.kind,kind,source);assert.equal(row.domain,domain,source);for(const key of ['callbackBodyChecked','callbackTypesChecked','tryTypeProved','sourceBindingProved','semanticAuthority','sourceAuthority','executableAdmission'])assert.equal(row[key],false);}
 for(const source of [R+'u64_to_u64_map(optional,|item|item)',W+'text_to_text_map(result,|item|item)',R+'u64_unwrap_or(result,|item|item)',R+'u64_to_u64_map(result,factory)',R+'u64_to_u64_map(result,||1_u64)',R+'router_result_u64_to_u64_map(result,|item|item)',C+'u64_to_u64_map(optional,|item|item)??'])assert.equal(readCoreCallbackCallSource(tokens(source),scope),null,source);
 assert.equal(readPrimitiveOptionCallbackCallSource(tokens(C+'u64_to_u64_map(optional,|item|item)?'),scope),null);assert.equal(readPrimitiveOptionCallbackCallSource(tokens(R+'u64_to_u64_map(result,|item|item)'),scope),null);
 const pending=new Map([['result','result:u64']]);assert.equal(readPrimitiveCoreCallSource(tokens(R+'u64_to_u64_map(result,|item|item)?'),pending).kind,'u64');assert.equal(readCarrierAliasOperand(tokens(R+'u64_to_u64_map(result,|item|item)'),pending).kind,'result');
});
for(const [label,propose,body]of [['ordinary Option',ordinaryOption,optionBody],['source-bound Option',boundOption,optionBody],['ordinary Option callback',ordinaryCallback,callbackBody],['source-bound Option callback',boundCallback,callbackBody],['ordinary Result',ordinaryResult,resultBody],['source-bound Result',boundResult,resultBody],['ordinary owning Result',ordinaryOwned,ownedBody],['source-bound owning Result',boundOwned,ownedBody],['ordinary integer',ordinaryInteger,tryOptionBody],['source-bound integer',boundInteger,tryResultBody]])test(label+' consumes complete actual callback-produced source through the shared declared-role rule',limits,()=>{
 const request=input(body),row=rejoin(propose(request),request.files['src/lib.rs']);assert.equal(row.edits.length,1);assert.ok(row.selections.every(row=>row.executableAdmission===false));
});
test('three existing callback inferencers compose nested qualified callback results while preserving original bodies',limits,()=>{
 for(const [propose,body]of [[ordinaryCallback,optionNestedBody],[boundCallback,optionNestedBody],[ordinaryResult,resultNestedBody],[boundResult,resultNestedBody]]){const request=input(body),row=rejoin(propose(request),request.files['src/lib.rs']);assert.equal(row.edits.length,1);assert.ok(row.after.source.includes('|number|number+1_u64'));}
});
test('eight actual source consumers receive independent JS and strict TypeScript across absent errors Unicode and numeric limits',limits,async()=>{
 const request=input();let files=request.files;for(const stage of ['integer-methods','primitive-option-methods','primitive-option-callback-methods','primitive-result-methods','owned-result-methods'])files=(await proposeSourceBoundOwnedCoreStage(stage,{...request,files})).after;const result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});await verifyTypedTargets(result,api=>{assert.equal(api.option_after_result(ok(3n)),4n);assert.equal(api.option_after_result(err('missing')),0n);for(const name of ['option_chain','try_option']){assert.deepEqual(api[name](some(3n)),some(6n));assert.deepEqual(api[name](none),none);}for(const name of ['result_chain','try_result']){assert.deepEqual(api[name](ok(3n)),ok(6n));assert.deepEqual(api[name](err('Ω😀')),err('Ω😀'));}assert.deepEqual(api.try_option(some(18446744073709551614n)),some(18446744073709551615n));assert.deepEqual(api.try_result(ok(18446744073709551614n)),ok(18446744073709551615n));for(const input of [ok(' Ω😀 '),ok(''),err('denied')])assert.deepEqual(api.owned_chain(input),input);assert.deepEqual(api.result_nested(ok(3n)),ok(4n));assert.deepEqual(api.result_nested(err('denied')),err('denied'));assert.deepEqual(api.option_nested(some(3n)),some(4n));assert.deepEqual(api.option_nested(none),none);},{childTimeoutMs:20000});
});
test('generic callback role candidates cannot admit an actual wrong callback payload even after further source adoption',limits,async()=>{
 const request=input(`pub fn bad(value:Result<u64,String>)->Result<u64,String>{${R}u64_to_u64_map(value,|item|true).map(|other|other+1_u64)}`),proposal=await proposeSourceBoundOwnedCoreStage('primitive-result-methods',request);assert.equal(rejoin(proposal,request.files['src/lib.rs']).edits.length,1);const files=proposal.after,result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});assert.equal(result.meta.executable.some(row=>row.name==='bad'),false);
});
test('eight complete compiler source equations retain all originals native owners two phases and CST inverses',limits,()=>{
 const plan=prepareCoreCallbackCompositionSources();assert.equal(plan.files.length,8);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(row=>row.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
function input(body=bodies){const modules={translation_json_fields_core:JSON_FIELDS_NATIVE_SOURCE,translation_text_core:TEXT_NATIVE_SOURCE,translation_primitive_option_core:PRIMITIVE_OPTION_NATIVE_SOURCE,translation_primitive_option_callbacks_core:PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE,translation_integer_core:INTEGER_NATIVE_SOURCE,translation_primitive_results_core:PRIMITIVE_RESULT_NATIVE_SOURCE,translation_owned_results_core:OWNED_RESULT_NATIVE_SOURCE},files={'src/lib.rs':'pub mod translation_core;\n'+Object.keys(modules).map(name=>'pub mod '+name+';').join('\n')+'\n// Ω😀 actual stage composition source\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE};for(const [name,source]of Object.entries(modules))files['src/'+name+'.rs']=source;return {entry:'src/lib.rs',files,dependencyInputs:{...cargo},compilationProfile:PRODUCTION_PROFILE};}
function rejoin(proposal,source){const row=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,source);assert.deepEqual(row.trace.map(part=>part.phase),['language','repository']);assert.equal(proposal.executableAdmission,false);return row;}

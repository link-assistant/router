// Independent actual core/callback operand composition SOURCE. All UNRUN.
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
import {readCoreCarrierCallSource} from '../core-carrier-call-source.mjs';
import {readCoreCallbackCallSource} from '../core-callback-call-source.mjs';
import {prepareCoreCallbackOperandSources} from '../prepare-core-callback-operand-sources.mjs';
const limits={timeout:60000},root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')},tokens=source=>rustTokens(source).filter(row=>row.type!=='comment'),some=field0=>({$:'Some',field0}),none={$:'None'},ok=field0=>({$:'Ok',field0}),err=field0=>({$:'Err',field0}),O='crate::translation_primitive_option_core::',C='crate::translation_primitive_option_callbacks_core::',R='crate::translation_primitive_results_core::',I='crate::translation_integer_core::',T='crate::translation_text_core::';
const mapped=C+'u64_to_u64_map(value,|number|'+I+'u64_saturating_add(number,1_u64))',converted=O+'u64_ok_or('+mapped+','+T+'to_owned("missing"))';
const integerBodies=`pub fn option(value:Option<u64>)->u64{${O}u64_unwrap_or(${mapped},0_u64).saturating_add(2)}
pub fn boolean(value:Option<bool>)->u64{${O}u64_unwrap_or(${C}bool_to_u64_map(value,|flag|if flag{1_u64}else{0_u64}),0_u64).saturating_add(2)}
`;
const resultBodies=`pub fn result(value:Option<u64>)->Result<u64,String>{${converted}.map(|number|number.saturating_add(2))}
pub fn result_scalar(value:Option<u64>)->u64{${R}u64_to_u64_map(${converted},|number|${I}u64_saturating_add(number,2_u64)).unwrap_or(0_u64)}
`;
const textBody=`pub fn text(value:Option<String>,label:&str)->String{${T}to_owned(&${C}text_owned_unwrap_or_else(value,||${T}to_owned(label))).trim().to_owned()}`;
const bodies=integerBodies+resultBodies+textBody;
test('actual declared callback return roles feed enclosing core operands including borrowed owning text and nested callback receivers',limits,()=>{
 const scope=new Map([['value',{kind:'option',domain:'u64'}],['flag',{kind:'option',domain:'bool'}],['text',{kind:'option',domain:'text-owned'}],['label',{kind:'payload',domain:'str'}]]);
 for(const [source,kind,domain]of [[O+'u64_unwrap_or('+mapped+',0_u64)','payload','u64'],[converted,'result','u64'],[T+'to_owned(&'+C+'text_owned_unwrap_or_else(text,||'+T+'to_owned(label)))','payload','text-owned'],[R+'u64_unwrap_or('+R+'u64_to_u64_map('+converted+',|number|number),0_u64)','payload','u64']]){const rows=tokens(source),copy=rows.map(row=>({...row})),role=readCoreCarrierCallSource(rows,scope);assert.equal(role.kind,kind,source);assert.equal(role.domain,domain);assert.equal(role.sourceAuthority,false);assert.equal(role.semanticAuthority,false);assert.equal(role.executableAdmission,false);assert.deepEqual(rows,copy);}
 const callback=readCoreCallbackCallSource(tokens(R+'u64_to_u64_map('+converted+',|number|number)'),scope);assert.equal(callback.kind,'result');assert.equal(callback.domain,'u64');assert.equal(callback.callbackBodyChecked,false);assert.equal(callback.callbackTypesChecked,false);
 for(const source of [O+'u64_unwrap_or('+C+'bool_to_bool_map(flag,|item|item),0_u64)',O+'u64_unwrap_or('+C+'u64_to_u64_map(value,factory),0_u64)',O+'u64_unwrap_or('+C+'unknown(value,|item|item),0_u64)',T+'to_owned(&'+C+'u64_to_u64_map(value,|item|item))'])assert.equal(readCoreCarrierCallSource(tokens(source),scope),null,source);
 let deep='value';for(let at=0;at<18;at++)deep=C+'u64_to_u64_map('+deep+',|number|number)';assert.equal(readCoreCarrierCallSource(tokens(O+'u64_unwrap_or('+deep+',0_u64)'),scope),null);
});
for(const [label,propose,body,count]of [['ordinary integer',ordinaryInteger,integerBodies,2],['source-bound integer',boundInteger,integerBodies,2],['ordinary Result',ordinaryResult,resultBodies,2],['source-bound Result',boundResult,resultBodies,2],['ordinary text',ordinaryText,textBody,1],['source-bound text',boundText,textBody,1]])test(label+' composes actual inline callback/core prerequisites without inventing local bindings',limits,()=>{
 const request=input(body),row=rejoin(propose(request),request.files['src/lib.rs']);assert.equal(row.edits.length,count);assert.ok(row.selections.every(row=>row.executableAdmission===false));assert.equal(row.after.source.includes('let __router'),false);
});
test('five actual nested core/callback source callers receive independent JavaScript and strict TypeScript',limits,async()=>{
 const request=input();let files=request.files;for(const stage of ['integer-methods','primitive-result-methods','text-methods'])files=(await proposeSourceBoundOwnedCoreStage(stage,{...request,files})).after;const result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});await verifyTypedTargets(result,api=>{assert.equal(api.option(some(3n)),6n);assert.equal(api.option(some(18446744073709551615n)),18446744073709551615n);assert.equal(api.option(none),2n);assert.equal(api.boolean(some(false)),2n);assert.equal(api.boolean(some(true)),3n);assert.equal(api.boolean(none),2n);assert.deepEqual(api.result(some(3n)),ok(6n));assert.deepEqual(api.result(none),err('missing'));assert.equal(api.result_scalar(some(3n)),6n);assert.equal(api.result_scalar(none),0n);assert.equal(api.text(some(' é😀 '),'unselected'),'é😀');assert.equal(api.text(none,' fallback '),'fallback');},{childTimeoutMs:20000});
});
test('declared callback operand roles cannot admit actual wrong callback bodies',limits,async()=>{
 const request=input(`pub fn bad(value:Option<u64>)->u64{${O}u64_unwrap_or(${C}u64_to_u64_map(value,|number|true),0_u64).saturating_add(2)}`),proposal=await proposeSourceBoundOwnedCoreStage('integer-methods',request);assert.equal(rejoin(proposal,request.files['src/lib.rs']).edits.length,1);const files=proposal.after,result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});assert.equal(result.meta.executable.some(row=>row.name==='bad'),false);
});
test('two full compiler source equations retain original native owners phases and complete CST inverses',limits,()=>{
 const plan=prepareCoreCallbackOperandSources();assert.equal(plan.files.length,2);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(row=>row.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
function input(body=bodies){const modules={translation_json_fields_core:JSON_FIELDS_NATIVE_SOURCE,translation_text_core:TEXT_NATIVE_SOURCE,translation_primitive_option_core:PRIMITIVE_OPTION_NATIVE_SOURCE,translation_primitive_option_callbacks_core:PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE,translation_integer_core:INTEGER_NATIVE_SOURCE,translation_primitive_results_core:PRIMITIVE_RESULT_NATIVE_SOURCE,translation_owned_results_core:OWNED_RESULT_NATIVE_SOURCE},files={'src/lib.rs':'pub mod translation_core;\n'+Object.keys(modules).map(name=>'pub mod '+name+';').join('\n')+'\n// Ω😀 actual stage composition source\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE};for(const [name,source]of Object.entries(modules))files['src/'+name+'.rs']=source;return {entry:'src/lib.rs',files,dependencyInputs:{...cargo},compilationProfile:PRODUCTION_PROFILE};}
function rejoin(proposal,source){const row=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,source);assert.deepEqual(row.trace.map(part=>part.phase),['language','repository']);assert.equal(proposal.executableAdmission,false);return row;}

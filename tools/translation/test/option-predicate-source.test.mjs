// Independent existing-ABI Option predicate composition SOURCE. All UNRUN.
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
import {readScalarEqualitySource} from '../scalar-equality-source.mjs';
import {prepareOptionPredicateSources} from '../prepare-option-predicate-sources.mjs';
const limits={timeout:60000},root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')},tokens=source=>rustTokens(source).filter(row=>row.type!=='comment'),some=field0=>({$:'Some',field0}),none={$:'None'},ok=field0=>({$:'Ok',field0}),err=field0=>({$:'Err',field0});
const optionBodies=`pub fn bool_some(value:Option<bool>)->bool{value.is_some_and(|flag|flag)}
pub fn bool_none(value:Option<bool>)->bool{value.is_none_or(|flag|flag)}
pub fn u64_some(value:Option<u64>)->bool{value.is_some_and(|number|number>0_u64)}
pub fn u64_none(value:Option<u64>)->bool{value.is_none_or(|number|number>0_u64)}
pub fn i64_some(value:Option<i64>)->bool{value.is_some_and(|number|number<0_i64)}
pub fn i64_none(value:Option<i64>)->bool{value.is_none_or(|number|number<0_i64)}
pub fn str_some(value:Option<&str>)->bool{value.is_some_and(|text|text!="identity")}
pub fn str_none(value:Option<&str>)->bool{value.is_none_or(|text|text!="identity")}
pub fn own_some(value:Option<String>)->bool{value.is_some_and(|text|!text.trim().is_empty())}
pub fn own_none(value:Option<String>)->bool{value.is_none_or(|text|!text.trim().is_empty())}
`;
const resultBody='pub fn result(value:Result<u64,String>,other:Option<&str>)->Result<bool,String>{value.map(|_number|other.is_some_and(|text|text!="identity"))}';
const ownedBody='pub fn owned(value:Result<String,String>,other:Option<&str>)->Result<bool,String>{value.map(|_original|other.is_none_or(|text|text!="identity"))}';
const bodies=optionBodies+resultBody+ownedBody;
test('closed bool and text equality source preserves operands and grants no PartialEq or semantic permission',limits,()=>{
 const scope=new Map([['flag',{kind:'payload',domain:'bool'}],['text',{kind:'payload',domain:'str'}],['owned',{kind:'payload',domain:'text-owned'}],['number',{kind:'payload',domain:'u64'}]]);for(const source of ['flag==false','(flag)!=true','text!="identity"','owned==text','"é"!="e\u{301}"']){const rows=tokens(source),copy=rows.map(row=>({...row})),role=readScalarEqualitySource(rows,scope);assert.equal(role.domain,'bool',source);assert.equal(role.operandsUnevaluated,true);assert.equal(role.originalPartialEqDispatchProved,false);assert.equal(role.sourceAuthority,false);assert.equal(role.semanticAuthority,false);assert.equal(role.executableAdmission,false);assert.deepEqual(rows,copy);}for(const source of ['text<"identity"','text==flag','number==flag','text==unknown','flag==true==false'])assert.equal(readScalarEqualitySource(tokens(source),scope),null,source);assert.equal(readPrimitiveLocalBooleanSource(tokens('text!="identity"&&flag==true'),scope).domain,'bool');
});
for(const [label,propose]of [['ordinary Option callback',ordinaryCallback],['source-bound Option callback',boundCallback]])test(label+' uses existing boolean map and fallback operations for all ten actual predicates',limits,()=>{
 const request=input(optionBodies),row=rejoin(propose(request),request.files['src/lib.rs']);assert.equal(row.edits.length,10);for(const selection of row.selections){assert.equal(selection.operations.at(-1),'bool_unwrap_or');assert.ok(selection.operations.some(name=>name.endsWith('_to_bool_map')));assert.equal(selection.executableAdmission,false);}assert.equal(row.after.source.includes('.is_some_and('),false);assert.equal(row.after.source.includes('.is_none_or('),false);
});
for(const [label,propose,body]of [['ordinary Result',ordinaryResult,resultBody],['source-bound Result',boundResult,resultBody],['ordinary owning Result',ordinaryOwned,ownedBody],['source-bound owning Result',boundOwned,ownedBody]])test(label+' composes nested predicates through the same existing source body engines',limits,()=>{
 const request=input(body),row=rejoin(propose(request),request.files['src/lib.rs']);assert.equal(row.edits.length,1);assert.ok(row.after.source.includes('bool_unwrap_or'));assert.equal(row.selections[0].executableAdmission,false);
});
test('all twelve actual predicate callers receive independent JavaScript and strict TypeScript',limits,async()=>{
 const request=input();let files=request.files;for(const stage of ['primitive-option-callback-methods','primitive-result-methods','owned-result-methods'])files=(await proposeSourceBoundOwnedCoreStage(stage,{...request,files})).after;const result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});await verifyTypedTargets(result,api=>{for(const prefix of ['bool','u64','i64','str','own']){assert.equal(api[prefix+'_some'](none),false);assert.equal(api[prefix+'_none'](none),true);}for(const value of [false,true]){assert.equal(api.bool_some(some(value)),value);assert.equal(api.bool_none(some(value)),value);}for(const value of [0n,1n,18446744073709551615n]){assert.equal(api.u64_some(some(value)),value>0n);assert.equal(api.u64_none(some(value)),value>0n);}for(const value of [-9223372036854775808n,0n,9223372036854775807n]){assert.equal(api.i64_some(some(value)),value<0n);assert.equal(api.i64_none(some(value)),value<0n);}for(const value of ['identity','','é😀','e\u0301']){assert.equal(api.str_some(some(value)),value!=='identity');assert.equal(api.str_none(some(value)),value!=='identity');}for(const [value,wanted]of [['',false],[' 	 ',false],[' é😀 ',true]]){assert.equal(api.own_some(some(value)),wanted);assert.equal(api.own_none(some(value)),wanted);}assert.deepEqual(api.result(ok(0n),some('identity')),ok(false));assert.deepEqual(api.result(ok(0n),none),ok(false));assert.deepEqual(api.result(err('Ω😀'),some('different')),err('Ω😀'));assert.deepEqual(api.owned(ok('unused'),none),ok(true));assert.deepEqual(api.owned(ok('unused'),some('identity')),ok(false));assert.deepEqual(api.owned(err('Ω😀'),none),err('Ω😀'));},{childTimeoutMs:20000});
});
test('predicate candidates cannot admit an actual nonboolean callback or incompatible text comparison',limits,async()=>{
 for(const body of ['pub fn bad(value:Option<u64>)->bool{value.is_some_and(|number|number)}','pub fn bad(value:Option<&str>)->bool{value.is_some_and(|text|text==true)}']){const request=input(body),proposal=await proposeSourceBoundOwnedCoreStage('primitive-option-callback-methods',request),files=proposal.after,result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});assert.equal(result.meta.executable.some(row=>row.name==='bad'),false);}
});
test('five full compiler source equations preserve originals native owners phases and complete CST inverses',limits,()=>{
 const plan=prepareOptionPredicateSources();assert.equal(plan.files.length,5);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(row=>row.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
function input(body=bodies){const modules={translation_json_fields_core:JSON_FIELDS_NATIVE_SOURCE,translation_text_core:TEXT_NATIVE_SOURCE,translation_primitive_option_core:PRIMITIVE_OPTION_NATIVE_SOURCE,translation_primitive_option_callbacks_core:PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE,translation_integer_core:INTEGER_NATIVE_SOURCE,translation_primitive_results_core:PRIMITIVE_RESULT_NATIVE_SOURCE,translation_owned_results_core:OWNED_RESULT_NATIVE_SOURCE},files={'src/lib.rs':'pub mod translation_core;\n'+Object.keys(modules).map(name=>'pub mod '+name+';').join('\n')+'\n// Ω😀 actual stage composition source\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE};for(const [name,source]of Object.entries(modules))files['src/'+name+'.rs']=source;return {entry:'src/lib.rs',files,dependencyInputs:{...cargo},compilationProfile:PRODUCTION_PROFILE};}
function rejoin(proposal,source){const row=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,source);assert.deepEqual(row.trace.map(part=>part.phase),['language','repository']);assert.equal(proposal.executableAdmission,false);return row;}

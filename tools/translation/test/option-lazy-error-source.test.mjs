// Independent lazy Option error runtime/source/target SOURCE. All UNRUN.
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
import {prepareOptionLazyErrorSources,prepareOptionLazyErrorNativeSource} from '../prepare-option-lazy-error-sources.mjs';
const limits={timeout:60000},root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')},some=field0=>({$:'Some',field0}),none={$:'None'},ok=field0=>({$:'Ok',field0}),err=field0=>({$:'Err',field0});
const bodies=`pub fn flag(value:Option<bool>)->Result<bool,String>{value.ok_or_else(||"missing".to_owned())}
pub fn count(value:Option<u64>)->Result<u64,String>{value.ok_or_else(||"missing".to_owned())}
pub fn signed(value:Option<i64>)->Result<i64,String>{value.ok_or_else(||"missing".to_owned())}
pub fn owned(value:Option<String>)->Result<String,String>{value.ok_or_else(||"missing".to_owned())}
pub fn propagated(value:Option<u64>)->Result<u64,String>{let selected=value.ok_or_else(||"missing".to_owned())?;Ok(selected)}
pub fn conditional_error(value:Option<u64>,flag:bool)->Result<u64,String>{value.ok_or_else(||if flag {"first".to_owned()}else{"second".to_owned()})}
`;
test('all5 lazy error operations preserve false zero limits empty text and native Option discriminants',limits,()=>{
 for(const [domain,value]of [['bool',false],['u64',0n],['u64',18446744073709551615n],['i64',-9223372036854775808n],['str',''],['str','Ω😀'],['text_owned',''],['text_owned','Ω😀']]){const operation=callback['router_option_callback_'+domain+'_ok_or_else'];let calls=0;function error(){assert.equal(arguments.length,0);calls++;return 'missing Ω😀';}const success=operation(some(value),error);assert.deepEqual(success,ok(value));assert.equal(Object.isFrozen(success),true);assert.equal(calls,0);const failure=operation(none,error);assert.deepEqual(failure,err('missing Ω😀'));assert.equal(Object.isFrozen(failure),true);assert.equal(calls,1);assert.deepEqual(operation(some(value),()=>{throw Error('unselected');}),ok(value));}
});
test('selected callback faults propagate and invalid operands callbacks and error values retain refusals',limits,()=>{
 const operation=callback.router_option_callback_u64_ok_or_else,marker=Error('selected error');assert.throws(()=>operation(none,()=>{throw marker;}),value=>value===marker);for(const error of [false,0n,null,'\ud800'])assert.throws(()=>operation(none,()=>error),TypeError);assert.throws(()=>operation(none,()=> 'x'.repeat(1048577)));for(const value of [some(-1n),some(1),{$:'None',field0:0n},{$:'Ok',field0:1n}])assert.throws(()=>operation(value,()=> 'missing'),TypeError);assert.throws(()=>operation(some(1n),null),TypeError);let calls=0;const proxy=new Proxy(()=> 'error',{apply(){calls++;throw Error('unreachable');}});assert.throws(()=>operation(some(1n),proxy),TypeError);assert.equal(calls,0);assert.deepEqual(operation(some(1n),()=>false),ok(1n));
});
for(const [label,propose]of [['ordinary',ordinaryCallback],['source-bound',boundCallback]])test(label+' source rules adopt all6 complete lazy-error callers and retain full original inverses',limits,()=>{
 const request=input(),row=rejoin(propose(request),request.files['src/lib.rs']);assert.equal(row.edits.length,6);assert.ok(row.selections.every(row=>row.operations.some(name=>name.endsWith('_ok_or_else'))&&row.executableAdmission===false));assert.ok(row.after.source.includes(')?;'));const borrowed=input("pub fn borrowed<'a>(value:Option<&'a str>)->Result<&'a str,String>{value.ok_or_else(||\"missing\".to_owned())}");assert.equal(rejoin(propose(borrowed),borrowed.files['src/lib.rs']).edits.length,1);
});
test('actual Result-returning and early-error callers emit JS and strict TypeScript with selected error behavior',limits,async()=>{
 const request=input(),proposal=await proposeSourceBoundOwnedCoreStage('primitive-option-callback-methods',request),files=proposal.after,result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});await verifyTypedTargets(result,api=>{for(const [name,value]of [['flag',false],['count',0n],['count',18446744073709551615n],['signed',-9223372036854775808n],['owned',''],['owned','Ω😀'],['propagated',7n]]){assert.deepEqual(api[name](some(value)),ok(value));assert.deepEqual(api[name](none),err('missing'));}assert.deepEqual(api.conditional_error(none,true),err('first'));assert.deepEqual(api.conditional_error(none,false),err('second'));assert.deepEqual(api.conditional_error(some(0n),true),ok(0n));},{childTimeoutMs:20000});
});
test('59 callback contracts current declarations and ten compiler plus5 native source equations retain all old originals',limits,()=>{
 assert.equal(PRIMITIVE_OPTION_CALLBACK_CONTRACTS.length,59);assert.equal(PRIMITIVE_OPTION_CALLBACK_CONTRACTS.filter(row=>row.method==='ok_or_else').length,5);assert.equal(PRIMITIVE_OPTION_CALLBACK_CONTRACTS.filter(row=>row.method!=='ok_or_else').length,54);assert.equal(readFileSync(new URL('../primitive-option-callback-runtime.d.mts',import.meta.url),'utf8'),emitPrimitiveOptionCallbackDeclarations());const plan=prepareOptionLazyErrorSources();assert.equal(plan.files.length,10);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(row=>row.phase),['language','repository']);}const native=prepareOptionLazyErrorNativeSource().files[0];assert.equal(native.templateInputs.length,5);assert.equal(native.inverse,native.before);assert.equal(native.nativeRustGrammarChecked,false);assert.equal(plan.receivingExecuted,false);
});
function input(body=bodies){const modules={translation_json_fields_core:JSON_FIELDS_NATIVE_SOURCE,translation_text_core:TEXT_NATIVE_SOURCE,translation_primitive_option_core:PRIMITIVE_OPTION_NATIVE_SOURCE,translation_primitive_option_callbacks_core:PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE,translation_integer_core:INTEGER_NATIVE_SOURCE,translation_primitive_results_core:PRIMITIVE_RESULT_NATIVE_SOURCE,translation_owned_results_core:OWNED_RESULT_NATIVE_SOURCE},files={'src/lib.rs':'pub mod translation_core;\n'+Object.keys(modules).map(name=>'pub mod '+name+';').join('\n')+'\n// Ω😀 actual stage composition source\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE};for(const [name,source]of Object.entries(modules))files['src/'+name+'.rs']=source;return {entry:'src/lib.rs',files,dependencyInputs:{...cargo},compilationProfile:PRODUCTION_PROFILE};}
function rejoin(proposal,source){const row=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,source);assert.deepEqual(row.trace.map(part=>part.phase),['language','repository']);assert.equal(proposal.executableAdmission,false);return row;}

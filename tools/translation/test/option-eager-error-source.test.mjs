// Independent eager Option error runtime/source/target SOURCE. All UNRUN.
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
import * as option from '../primitive-option-runtime.mjs';
import {PRIMITIVE_OPTION_CONTRACTS,emitPrimitiveOptionDeclarations} from '../primitive-option-contracts.mjs';
import {proposeCorePrimitiveOptionMethodCorpus as ordinaryOption} from '../migrate-core-primitive-option-methods.mjs';
import {proposeCorePrimitiveOptionMethodCorpus as boundOption} from '../source-bound-owned-migrate-core-primitive-option-methods.mjs';
import {prepareOptionEagerErrorSources,prepareOptionEagerErrorNativeSource} from '../prepare-option-eager-error-sources.mjs';
const limits={timeout:60000},root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')},some=field0=>({$:'Some',field0}),none={$:'None'},ok=field0=>({$:'Ok',field0}),err=field0=>({$:'Err',field0});
const bodies=`pub fn flag(value:Option<bool>,error:String)->Result<bool,String>{value.ok_or(error)}
pub fn count(value:Option<u64>,error:String)->Result<u64,String>{value.ok_or(error)}
pub fn signed(value:Option<i64>,error:String)->Result<i64,String>{value.ok_or(error)}
pub fn owned(value:Option<String>,error:String)->Result<String,String>{value.ok_or(error)}
pub fn literal(value:Option<u64>)->Result<u64,String>{value.ok_or("missing".to_owned())}
pub fn borrowed_error(value:Option<u64>,error:&str)->Result<u64,String>{Ok(value.ok_or(error)?)}
pub fn literal_error(value:Option<u64>)->Result<u64,String>{Ok(value.ok_or("missing")?)}
`;
test('all10 eager operations retain Some false zero extremes empty text and owning String errors',limits,()=>{
 for(const [domain,value]of [['bool',false],['u64',0n],['u64',18446744073709551615n],['i64',-9223372036854775808n],['str',''],['str','Ω😀'],['text_owned',''],['text_owned','Ω😀']])for(const method of ['ok_or','ok_or_text']){const operation=option['router_option_'+domain+'_'+method],success=operation(some(value),'missing Ω😀'),failure=operation(none,'missing Ω😀');assert.deepEqual(success,ok(value));assert.deepEqual(failure,err('missing Ω😀'));assert.equal(Object.isFrozen(success),true);assert.equal(Object.isFrozen(failure),true);}
});
test('error inputs are eager and validated on Some before any complete result exists',limits,()=>{
 for(const method of ['ok_or','ok_or_text']){const operation=option['router_option_u64_'+method],events=[];assert.deepEqual(operation((events.push('receiver'),some(0n)),(events.push('error'),'missing')),ok(0n));assert.deepEqual(events,['receiver','error']);for(const value of [some(0n),none])for(const error of [false,0n,null,new String('missing'),'\ud800'])assert.throws(()=>operation(value,error),TypeError);assert.throws(()=>operation(some(0n),'x'.repeat(1048577)));assert.throws(()=>operation(some(-1n),'missing'),TypeError);}let accessed=0;const bad=Object.defineProperty({$:'Some'},'field0',{enumerable:true,get(){accessed++;throw Error('not read');}});assert.throws(()=>option.router_option_u64_ok_or(bad,'missing'));assert.equal(accessed,0);
});
for(const [label,propose]of [['ordinary',ordinaryOption],['source-bound',boundOption]])test(label+' adopts seven eager String or directly propagated borrowed-error source forms with complete inverses',limits,()=>{
 const request=input(),row=rejoin(propose(request),request.files['src/lib.rs']);assert.equal(row.edits.length,7);assert.ok(row.selections.every(row=>row.executableAdmission===false));assert.ok(row.after.source.includes('u64_ok_or_text'));assert.ok(row.after.source.includes(')?'));const borrowed=input("pub fn borrowed<'a>(value:Option<&'a str>,error:&str)->Result<&'a str,String>{Ok(value.ok_or(error)?)}");assert.equal(rejoin(propose(borrowed),borrowed.files['src/lib.rs']).edits.length,1);
 for(const body of ['pub fn keep(value:Option<u64>,error:&str)->Result<u64,&str>{value.ok_or(error)}','pub fn keep(value:Option<u64>,error:&str)->Result<u64,String>{value.ok_or(error)}','pub fn keep(value:Option<u64>,error:&str)->u64{value.ok_or(error)?}']){const source=input(body);assert.equal(rejoin(propose(source),source.files['src/lib.rs']).edits.length,0);}
});
test('all7 actual eager conversion callers receive JS and strict TypeScript with unchanged branch values',limits,async()=>{
 const request=input(),proposal=await proposeSourceBoundOwnedCoreStage('primitive-option-methods',request),files=proposal.after,result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});await verifyTypedTargets(result,api=>{for(const [name,value]of [['flag',false],['count',0n],['count',18446744073709551615n],['signed',-9223372036854775808n],['owned',''],['owned','Ω😀'],['borrowed_error',7n]]){assert.deepEqual(api[name](some(value),'missing Ω😀'),ok(value));assert.deepEqual(api[name](none,'missing Ω😀'),err('missing Ω😀'));}for(const name of ['literal','literal_error']){assert.deepEqual(api[name](some(0n)),ok(0n));assert.deepEqual(api[name](none),err('missing'));}},{childTimeoutMs:20000});
});
test('126 finite contracts preserve the old116 operations generic declarations and complete compiler/native histories',limits,()=>{
 assert.equal(PRIMITIVE_OPTION_CONTRACTS.length,126);assert.equal(PRIMITIVE_OPTION_CONTRACTS.filter(row=>['ok_or','ok_or_text'].includes(row.method)).length,10);assert.equal(PRIMITIVE_OPTION_CONTRACTS.filter(row=>!['ok_or','ok_or_text'].includes(row.method)).length,116);assert.equal(readFileSync(new URL('../primitive-option-runtime.d.mts',import.meta.url),'utf8'),emitPrimitiveOptionDeclarations());const plan=prepareOptionEagerErrorSources();assert.equal(plan.files.length,13);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(row=>row.phase),['language','repository']);}const native=prepareOptionEagerErrorNativeSource().files[0];assert.equal(native.templateInputs.length,10);assert.equal(native.inverse,native.before);assert.equal(native.nativeRustGrammarChecked,false);assert.equal(plan.receivingExecuted,false);
});
function input(body=bodies){const modules={translation_json_fields_core:JSON_FIELDS_NATIVE_SOURCE,translation_text_core:TEXT_NATIVE_SOURCE,translation_primitive_option_core:PRIMITIVE_OPTION_NATIVE_SOURCE,translation_primitive_option_callbacks_core:PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE,translation_integer_core:INTEGER_NATIVE_SOURCE,translation_primitive_results_core:PRIMITIVE_RESULT_NATIVE_SOURCE,translation_owned_results_core:OWNED_RESULT_NATIVE_SOURCE},files={'src/lib.rs':'pub mod translation_core;\n'+Object.keys(modules).map(name=>'pub mod '+name+';').join('\n')+'\n// Ω😀 actual stage composition source\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE};for(const [name,source]of Object.entries(modules))files['src/'+name+'.rs']=source;return {entry:'src/lib.rs',files,dependencyInputs:{...cargo},compilationProfile:PRODUCTION_PROFILE};}
function rejoin(proposal,source){const row=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,source);assert.deepEqual(row.trace.map(part=>part.phase),['language','repository']);assert.equal(proposal.executableAdmission,false);return row;}

// Independent boolean/comparison/callback source composition SOURCE. All UNRUN.
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
import {prepareBooleanExpressionSources} from '../prepare-boolean-expression-sources.mjs';
import {proposeCoreOwnedResultMethodCorpus as ordinaryOwned} from '../migrate-core-owned-result-methods.mjs';
import {proposeCoreOwnedResultMethodCorpus as boundOwned} from '../source-bound-owned-migrate-core-owned-result-methods.mjs';
const limits={timeout:60000},root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')},tokens=source=>rustTokens(source).filter(row=>row.type!=='comment'),some=field0=>({$:'Some',field0}),none={$:'None'},ok=field0=>({$:'Ok',field0}),err=field0=>({$:'Err',field0});
const optionBodies=`pub fn option_flags(value:Option<bool>,flag:bool)->Option<bool>{value.map(|item|(!item&&flag)||!flag)}
pub fn option_count(value:Option<u64>,threshold:u64)->Option<bool>{value.map(|item|item>=threshold&&item<10_u64||item==0_u64)}
pub fn option_group(value:Option<u64>,threshold:u64)->Option<bool>{value.map(|item|!((item+1_u64>=threshold)&&(item<10_u64)))}
pub fn option_local(value:Option<u64>,threshold:u64)->Option<bool>{value.map(|item|{let at_least=item>=threshold;at_least&&item<10_u64})}
pub fn option_text(value:Option<String>)->Option<bool>{value.map(|item|item.is_empty()||item.starts_with("x"))}
`;
const resultBodies=`pub fn result_count(value:Result<u64,String>,threshold:u64)->Result<bool,String>{value.map(|item|item>=threshold&&(item<10_u64||item==12_u64))}
`;
const ownedBodies=`pub fn result_text(value:Result<String,String>)->Result<bool,String>{value.map(|item|!item.is_empty()&&item.starts_with("x"))}
`;
const bodies=optionBodies+resultBodies+ownedBodies;
test('complete boolean source preserves logical precedence grouped numeric comparisons and qualified predicates',limits,()=>{
 const scope=new Map([['flag',{kind:'payload',domain:'bool'}],['other',{kind:'payload',domain:'bool'}],['count',{kind:'payload',domain:'u64'}],['threshold',{kind:'payload',domain:'u64'}],['value',{kind:'payload',domain:'str'}]]);for(const source of ['true','flag','!flag','flag&&other||!flag','flag&&(other||!flag)','!((count+1_u64>=threshold)&&(count<10_u64))','count>=threshold&&count<10_u64||count==0_u64','crate::translation_text_core::is_empty(value)||crate::translation_text_core::starts_with(value,"x")']){const result=readPrimitiveLocalBooleanSource(tokens(source),scope);assert.equal(result.kind,'payload',source);assert.equal(result.domain,'bool');if(source==='flag')assert.equal(result.binding,'flag');assert.equal(result.shortCircuitSourceRetained,true);assert.equal(result.operandsUnevaluated,true);assert.equal(result.semanticAuthority,false);assert.equal(result.executableAdmission,false);}
 for(const source of ['count','flag&&count','flag||unknown()','true||crate::unknown_core::predicate(value)','false&&crate::translation_text_core::is_empty(unknown())','flag&&','(flag||other','flag & other','count<1_i64','flag as bool'])assert.equal(readPrimitiveLocalBooleanSource(tokens(source),scope),null,source);assert.equal(readPrimitiveLocalBooleanSource(tokens('('.repeat(65)+'flag'+')'.repeat(65)),scope),null);
});
test('boolean source roles remain current lexical DATA for chronological locals and callback inference',limits,()=>{
 const scope=new Map([['flag',{kind:'payload',domain:'bool'}],['count',{kind:'payload',domain:'u64'}]]),encoded=new Map([['flag','payload:bool'],['count','payload:u64']]);assert.equal(readPrimitiveRoleExpressionSource(tokens('flag&&(count>=2_u64)'),scope).domain,'bool');assert.equal(readCarrierAliasOperand(tokens('!flag||count>=2_u64'),encoded).domain,'bool');assert.equal(readCarrierAliasOperand(tokens('Some(!flag||count>=2_u64)'),encoded).domain,'bool');assert.equal(readCarrierAliasOperand(tokens('Some(!flag||count>=2_u64)'),encoded).kind,'option');
});
for(const [label,propose,body,count]of [['ordinary Option',ordinaryCallback,optionBodies,5],['source-bound Option',boundCallback,optionBodies,5],['ordinary primitive Result',ordinaryResult,resultBodies,1],['source-bound primitive Result',boundResult,resultBodies,1],['ordinary owned Result',ordinaryOwned,ownedBodies,1],['source-bound owned Result',boundOwned,ownedBodies,1]])test(label+' composes original logical bodies with complete source inverses',limits,()=>{
 const request=input(body),row=rejoin(propose(request),request.files['src/lib.rs']);assert.equal(row.edits.length,count);assert.ok(row.selections.every(row=>row.executableAdmission===false));
});
test('all7 actual callers preserve truth tables Unicode predicate and absent/error branch behavior in JS and strict TS',limits,async()=>{
 const request=input();let files=request.files;for(const stage of ['primitive-option-callback-methods','primitive-result-methods','owned-result-methods'])files=(await proposeSourceBoundOwnedCoreStage(stage,{...request,files})).after;const result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});await verifyTypedTargets(result,api=>{for(const [value,flag,wanted]of [[false,false,true],[false,true,true],[true,false,true],[true,true,false]])assert.deepEqual(api.option_flags(some(value),flag),some(wanted));assert.deepEqual(api.option_flags(none,true),none);for(const [value,threshold,wanted]of [[0n,9n,true],[3n,3n,true],[3n,4n,false],[11n,0n,false]])assert.deepEqual(api.option_count(some(value),threshold),some(wanted));assert.deepEqual(api.option_count(none,0n),none);assert.deepEqual(api.option_group(some(3n),4n),some(false));assert.deepEqual(api.option_group(some(3n),5n),some(true));assert.deepEqual(api.option_group(some(11n),0n),some(true));assert.deepEqual(api.option_local(some(3n),3n),some(true));assert.deepEqual(api.option_local(some(10n),3n),some(false));for(const [value,wanted]of [['',true],['xé😀',true],['Ω😀',false]])assert.deepEqual(api.option_text(some(value)),some(wanted));assert.deepEqual(api.option_text(none),none);assert.deepEqual(api.result_count(ok(12n),12n),ok(true));assert.deepEqual(api.result_count(ok(11n),0n),ok(false));assert.deepEqual(api.result_count(err('kept'),0n),err('kept'));for(const [value,wanted]of [['',false],['xé😀',true],['Ω😀',false]])assert.deepEqual(api.result_text(ok(value)),ok(wanted));assert.deepEqual(api.result_text(err('kept')),err('kept'));},{childTimeoutMs:20000});
});
test('three complete compiler equations retain originals two phases and complete source inverse histories',limits,()=>{
 const plan=prepareBooleanExpressionSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(row=>row.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
function input(body=bodies){const modules={translation_json_fields_core:JSON_FIELDS_NATIVE_SOURCE,translation_text_core:TEXT_NATIVE_SOURCE,translation_primitive_option_core:PRIMITIVE_OPTION_NATIVE_SOURCE,translation_primitive_option_callbacks_core:PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE,translation_integer_core:INTEGER_NATIVE_SOURCE,translation_primitive_results_core:PRIMITIVE_RESULT_NATIVE_SOURCE,translation_owned_results_core:OWNED_RESULT_NATIVE_SOURCE},files={'src/lib.rs':'pub mod translation_core;\n'+Object.keys(modules).map(name=>'pub mod '+name+';').join('\n')+'\n// Ω😀 actual stage composition source\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE};for(const [name,source]of Object.entries(modules))files['src/'+name+'.rs']=source;return {entry:'src/lib.rs',files,dependencyInputs:{...cargo},compilationProfile:PRODUCTION_PROFILE};}
function rejoin(proposal,source){const row=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,source);assert.deepEqual(row.trace.map(part=>part.phase),['language','repository']);assert.equal(proposal.executableAdmission,false);return row;}

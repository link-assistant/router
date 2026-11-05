// Independent original core Try/receiver/expression source cases. All UNRUN.
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
import {prepareCoreTryProjectionSources} from '../prepare-core-try-projection-sources.mjs';
const limits={timeout:60000},root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')},tokens=source=>rustTokens(source).filter(row=>row.type!=='comment'),I='crate::translation_integer_core::',O='crate::translation_primitive_option_core::',some=field0=>({$:'Some',field0}),none={$:'None'},ok=field0=>({$:'Ok',field0}),err=field0=>({$:'Err',field0});
const bodies=`pub fn local(value:u64)->Option<u64>{let selected=${I}u64_checked_add(value,1_u64)?;Some(selected.saturating_add(2))}
pub fn inline(value:u64)->Option<u64>{Some(${I}u64_checked_add(value,1_u64)?.saturating_add(2))}
pub fn grouped(value:u64)->Option<u64>{Some((${I}u64_checked_add(value,1_u64)?+1_u64).saturating_add(2))}
pub fn argument(value:u64,base:u64)->Option<u64>{Some(base.saturating_add(${I}u64_checked_add(value,1_u64)?+1_u64))}
pub fn eager(value:Option<u64>)->Result<u64,String>{let selected=${O}u64_ok_or(value,"missing".to_owned())?;Ok(selected.saturating_add(2))}
pub fn signed(value:i64)->Option<i64>{let selected=${I}i64_checked_abs(value)?;Some(selected.saturating_add(2))}
`;
test('actual original core Option and Result Try suffixes classify payload DATA with no Try or binding permission',limits,()=>{
 const scope=new Map([['value',{kind:'payload',domain:'u64'}],['pending',{kind:'option',domain:'u64'}],['text',{kind:'option',domain:'text-owned'}]]);
 for(const [source,domain]of [[I+'u64_checked_add(value,1_u64)?','u64'],[O+'u64_ok_or(pending,"missing".to_owned())?','u64'],[O+'text_owned_ok_or(text,"missing".to_owned())?','text-owned'],[I+'u64_saturating_add('+I+'u64_checked_add(value,1_u64)?,2_u64)','u64']]){const row=readCoreCarrierCallSource(tokens(source),scope);assert.equal(row.kind,'payload',source);assert.equal(row.domain,domain,source);assert.equal(row.tryProjection,source.endsWith('?'));for(const key of ['tryTypeProved','sourceBindingProved','sourceAuthority','semanticAuthority','executableAdmission'])assert.equal(row[key],false);}
 for(const source of [I+'u64_saturating_add(value,1_u64)?',I+'u64_checked_add(value,1_u64)??',I+'u64_checked_add(value,1_i64)?',I+'unknown(value)?','other::translation_integer_core::u64_checked_add(value,1_u64)?',I+'u64_checked_add(unknown,1_u64)?'])assert.equal(readCoreCarrierCallSource(tokens(source),scope),null,source);
});
test('Try payload atoms compose native arithmetic and chronological carrier/scalar locals without changing original tokens',limits,()=>{
 const scope=new Map([['value','u64'],['pending','option:u64']]),source=I+'u64_checked_add(value,1_u64)?+2_u64',rows=tokens(source),before=rows.map(row=>({...row}));assert.equal(readPrimitiveLocalExpression(rows,scope,{readAtom:readPrimitiveAliasOperand}).kind,'u64');assert.deepEqual(rows,before);assert.equal(readPrimitiveCoreCallSource(tokens(O+'u64_ok_or(pending,"missing".to_owned())?'),scope).kind,'u64');assert.equal(readCarrierAliasOperand(tokens(I+'u64_checked_add(value,1_u64)?'),new Map([['value','payload:u64']])).domain,'u64');assert.equal(readPrimitiveLocalExpression(tokens(I+'u64_checked_add(value,1_u64)??+2_u64'),scope,{readAtom:readPrimitiveAliasOperand}),null);
});
for(const [label,propose]of [['ordinary integer',ordinaryInteger],['source-bound integer',boundInteger]])test(label+' selects six original local inline grouped argument Result and signed Try consumers',limits,()=>{
 const request=input(),row=rejoin(propose(request),request.files['src/lib.rs']);assert.equal(row.edits.length,6);assert.ok(row.selections.every(row=>row.executableAdmission===false));assert.ok(row.edits.some(row=>row.expected.includes('?.saturating_add')));assert.ok(row.edits.some(row=>row.expected.includes('?+1_u64')));
});
test('actual Try composition receives independently emitted JS and strict TypeScript with early absence errors and limits',limits,async()=>{
 const request=input(),proposal=await proposeSourceBoundOwnedCoreStage('integer-methods',request),files=proposal.after,result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});await verifyTypedTargets(result,api=>{for(const name of ['local','inline']){assert.deepEqual(api[name](3n),some(6n));assert.deepEqual(api[name](18446744073709551615n),none);assert.deepEqual(api[name](18446744073709551614n),some(18446744073709551615n));}assert.deepEqual(api.grouped(3n),some(7n));assert.deepEqual(api.grouped(18446744073709551615n),none);assert.deepEqual(api.argument(3n,10n),some(15n));assert.deepEqual(api.argument(18446744073709551615n,10n),none);assert.deepEqual(api.eager(some(3n)),ok(5n));assert.deepEqual(api.eager(none),err('missing'));assert.deepEqual(api.signed(-3n),some(5n));assert.deepEqual(api.signed(-9223372036854775808n),none);},{childTimeoutMs:20000});
});
test('bounded repeated-stage source proposals revisit earlier integer consumers after original checked calls and eager Option introduction',limits,async()=>{
 const request=input('pub fn checked(value:u64)->Option<u64>{let pending=value.checked_add(1)?;Some(pending.saturating_add(2))}
pub fn eager(value:Option<u64>)->Result<u64,String>{let pending=value.ok_or("missing".to_owned())?;Ok(pending.saturating_add(2))}'),result=await collectSourceBoundOwnedCoreFixedPoint({...request,stages:['integer-methods','primitive-option-methods']});assert.equal(result.receipt.stabilized,true);assert.ok(result.stages.some(row=>row.round>0&&row.stage==='integer-methods'&&row.changedFiles.length));assert.ok(result.files['src/lib.rs'].includes(I+'u64_saturating_add'));assert.equal(result.receipt.coverageComplete,false);
});
test('source Try projections cannot admit an incompatible enclosing function return',limits,async()=>{
 const request=input(`pub fn bad(value:u64)->u64{let selected=${I}u64_checked_add(value,1_u64)?;selected.saturating_add(2)}`),proposal=await proposeSourceBoundOwnedCoreStage('integer-methods',request);assert.equal(rejoin(proposal,request.files['src/lib.rs']).edits.length,1);const files=proposal.after,result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});assert.equal(result.meta.executable.some(row=>row.name==='bad'),false);
});
test('four complete compiler equations preserve original sources separate rule phases and full CST inverses',limits,()=>{
 const plan=prepareCoreTryProjectionSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(row=>row.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
function input(body=bodies){const modules={translation_json_fields_core:JSON_FIELDS_NATIVE_SOURCE,translation_text_core:TEXT_NATIVE_SOURCE,translation_primitive_option_core:PRIMITIVE_OPTION_NATIVE_SOURCE,translation_primitive_option_callbacks_core:PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE,translation_integer_core:INTEGER_NATIVE_SOURCE,translation_primitive_results_core:PRIMITIVE_RESULT_NATIVE_SOURCE,translation_owned_results_core:OWNED_RESULT_NATIVE_SOURCE},files={'src/lib.rs':'pub mod translation_core;\n'+Object.keys(modules).map(name=>'pub mod '+name+';').join('\n')+'\n// Ω😀 actual stage composition source\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE};for(const [name,source]of Object.entries(modules))files['src/'+name+'.rs']=source;return {entry:'src/lib.rs',files,dependencyInputs:{...cargo},compilationProfile:PRODUCTION_PROFILE};}
function rejoin(proposal,source){const row=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,source);assert.deepEqual(row.trace.map(part=>part.phase),['language','repository']);assert.equal(proposal.executableAdmission,false);return row;}

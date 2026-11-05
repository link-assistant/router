// Independent actual carrier binding Try source cases. All UNRUN.
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
import {readCarrierBindingTrySource} from '../carrier-binding-try-source.mjs';
import {readCoreCarrierCallSource} from '../core-carrier-call-source.mjs';
import {prepareCarrierBindingTrySources} from '../prepare-carrier-binding-try-sources.mjs';
const limits={timeout:60000},root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')},tokens=source=>rustTokens(source).filter(row=>row.type!=='comment'),some=field0=>({$:'Some',field0}),none={$:'None'},ok=field0=>({$:'Ok',field0}),err=field0=>({$:'Err',field0});
const bodies=`pub fn local(value:Option<u64>)->Option<u64>{let selected=value?;Some(selected.saturating_add(2))}
pub fn result(value:Result<u64,String>)->Result<u64,String>{let selected=value?;Ok(selected.saturating_add(2))}
pub fn inline(value:Option<u64>)->Option<u64>{Some(value?.saturating_add(2))}
pub fn grouped(value:Option<u64>)->Option<u64>{Some((value)?.saturating_add(2))}
pub fn expression(value:Option<u64>)->Option<u64>{Some((value?+1_u64).saturating_add(2))}
pub fn argument(value:Option<u64>,base:u64)->Option<u64>{Some(base.saturating_add(value?+1_u64))}
`;
test('one original lexical carrier binding question mark yields only a bounded payload source candidate',limits,()=>{
 const scope=new Map([['value',{kind:'option',domain:'u64'}],['result',{kind:'result',domain:'u64'}],['text',{kind:'result',domain:'text'}],['borrowed',{kind:'option',domain:'str'}],['flag',{kind:'option',domain:'bool'}],['number',{kind:'payload',domain:'u64'}]]);
 for(const [source,domain,input]of [['value?','u64','option'],['(value)?','u64','option'],['((value?))','u64','option'],['result?','u64','result'],['text?','text-owned','result'],['borrowed?','str','option'],['flag?','bool','option']]){const rows=tokens(source),copy=rows.map(row=>({...row})),role=readCarrierBindingTrySource(rows,scope);assert.equal(role.domain,domain,source);assert.equal(role.kind,'payload');assert.equal(role.tryInputKind,input);assert.equal(role.tryProjection,true);for(const key of ['tryTypeProved','sourceBindingProved','sourceAuthority','semanticAuthority','executableAdmission'])assert.equal(role[key],false);assert.deepEqual(rows,copy);}
 for(const source of ['value','unknown?','number?','value??','(value?)?','value?+1_u64','module::value?','value.field?','(value,other)?','value()?.saturating_add(2)'])assert.equal(readCarrierBindingTrySource(tokens(source),scope),null,source);assert.equal(readCarrierBindingTrySource(tokens('('.repeat(9)+'value'+')'.repeat(9)+'?'),scope),null);assert.equal(readCoreCarrierCallSource(tokens('crate::translation_integer_core::u64_saturating_add(value?,2_u64)'),scope).domain,'u64');
});
test('native arithmetic logical and chronological roles compose actual binding Try source without granting caller authority',limits,()=>{
 const primitive=new Map([['value','option:u64']]);assert.equal(readPrimitiveCoreCallSource(tokens('value?'),primitive).kind,'u64');for(const source of ['value?+1_u64','(value)?+1_u64','(value?+1_u64)'])assert.equal(readPrimitiveLocalExpression(tokens(source),primitive,{readAtom:readPrimitiveAliasOperand}).kind,'u64',source);assert.equal(readCarrierAliasOperand(tokens('value?'),primitive).domain,'u64');const scope=new Map([['flag',{kind:'option',domain:'bool'}],['ready',{kind:'payload',domain:'bool'}]]);assert.equal(readPrimitiveLocalBooleanSource(tokens('flag?&&ready'),scope).domain,'bool');assert.equal(readPrimitiveLocalBooleanSource(tokens('flag??&&ready'),scope),null);
});
for(const [label,propose]of [['ordinary integer',ordinaryInteger],['source-bound integer',boundInteger]])test(label+' selects all six original bare binding Try consumers with complete original inverses',limits,()=>{
 const request=input(),row=rejoin(propose(request),request.files['src/lib.rs']);assert.equal(row.edits.length,6);assert.ok(row.selections.every(row=>row.executableAdmission===false));assert.ok(row.edits.some(row=>row.expected==='value?.saturating_add(2)'));assert.ok(row.edits.some(row=>row.expected==='(value)?.saturating_add(2)'));
});
test('all six original binding Try consumers receive independent JS and strict TypeScript with early absence/errors',limits,async()=>{
 const request=input(),proposal=await proposeSourceBoundOwnedCoreStage('integer-methods',request),files=proposal.after,result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});await verifyTypedTargets(result,api=>{for(const name of ['local','inline','grouped']){assert.deepEqual(api[name](some(3n)),some(5n));assert.deepEqual(api[name](some(18446744073709551615n)),some(18446744073709551615n));assert.deepEqual(api[name](none),none);}assert.deepEqual(api.result(ok(3n)),ok(5n));assert.deepEqual(api.result(err('Ω😀')),err('Ω😀'));assert.deepEqual(api.expression(some(3n)),some(6n));assert.deepEqual(api.expression(none),none);assert.deepEqual(api.argument(some(3n),10n),some(14n));assert.deepEqual(api.argument(none,10n),none);},{childTimeoutMs:20000});
});
test('binding-role data cannot admit a real incompatible Try context or changed source binding',limits,async()=>{
 for(const body of ['pub fn bad(value:Option<u64>)->u64{let selected=value?;selected.saturating_add(2)}','pub fn bad(value:u64)->Option<u64>{let selected=value?;Some(selected.saturating_add(2))}']){const request=input(body),proposal=await proposeSourceBoundOwnedCoreStage('integer-methods',request),files=proposal.after,result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});assert.equal(result.meta.executable.some(row=>row.name==='bad'),false);}
});
test('six full compiler equations retain immutable originals native owners two phases and full CST inverses',limits,()=>{
 const plan=prepareCarrierBindingTrySources();assert.equal(plan.files.length,6);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(row=>row.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
function input(body=bodies){const modules={translation_json_fields_core:JSON_FIELDS_NATIVE_SOURCE,translation_text_core:TEXT_NATIVE_SOURCE,translation_primitive_option_core:PRIMITIVE_OPTION_NATIVE_SOURCE,translation_primitive_option_callbacks_core:PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE,translation_integer_core:INTEGER_NATIVE_SOURCE,translation_primitive_results_core:PRIMITIVE_RESULT_NATIVE_SOURCE,translation_owned_results_core:OWNED_RESULT_NATIVE_SOURCE},files={'src/lib.rs':'pub mod translation_core;\n'+Object.keys(modules).map(name=>'pub mod '+name+';').join('\n')+'\n// Ω😀 actual stage composition source\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE};for(const [name,source]of Object.entries(modules))files['src/'+name+'.rs']=source;return {entry:'src/lib.rs',files,dependencyInputs:{...cargo},compilationProfile:PRODUCTION_PROFILE};}
function rejoin(proposal,source){const row=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,source);assert.deepEqual(row.trace.map(part=>part.phase),['language','repository']);assert.equal(proposal.executableAdmission,false);return row;}

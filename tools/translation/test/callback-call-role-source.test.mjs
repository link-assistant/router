// Independent declared callback return/local/Try composition SOURCE. All UNRUN.
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
import {prepareCallbackCallRoleSources} from '../prepare-callback-call-role-sources.mjs';
const limits={timeout:60000},root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')},tokens=source=>rustTokens(source).filter(row=>row.type!=='comment'),some=field0=>({$:'Some',field0}),none={$:'None'},ok=field0=>({$:'Ok',field0}),err=field0=>({$:'Err',field0}),C='crate::translation_primitive_option_callbacks_core::';
const primitiveBody=`pub fn mapped(value:Option<u64>)->Result<u64,String>{let pending=${C}u64_ok_or_else(value,||"missing".to_owned());pending.map(|item|item+1_u64)}
`;
const ownedBody=`pub fn mapped_text(value:Option<String>)->Result<String,String>{let pending=${C}text_owned_ok_or_else(value,||"missing".to_owned());pending.map(|item|item.trim().to_owned())}
`;
const optionBody=`pub fn mapped_option(value:Option<bool>)->Option<u64>{let pending=${C}bool_to_u64_map(value,|flag|if flag{1_u64}else{0_u64});pending.map(|item|item+1_u64)}
`;
const integerBody=`pub fn projected(value:Option<u64>)->Result<u64,String>{let selected=${C}u64_ok_or_else(value,||"missing".to_owned())?;Ok(selected.saturating_add(2))}
`;
const bodies=primitiveBody+ownedBody+optionBody+integerBody;
test('actual qualified callback syntax retains declared carrier and Try result roles without checking closure bodies',limits,()=>{
 const scope=new Map([['value',{kind:'option',domain:'u64'}],['flag',{kind:'option',domain:'bool'}],['number',{kind:'payload',domain:'u64'}]]);for(const [source,kind,domain,tried]of [[C+'u64_ok_or_else(value,||"missing".to_owned())','result','u64',false],[C+'u64_ok_or_else(value,||"missing".to_owned())?','payload','u64',true],[C+'bool_to_u64_map(flag,|item|1_u64)','option','u64',false],[C+'u64_to_u64_map('+C+'bool_to_u64_map(flag,|item|1_u64),|other|other)','option','u64',false],[C+'u64_ok_or_else(value,||true)','result','u64',false]]){const result=readPrimitiveOptionCallbackCallSource(tokens(source),scope);assert.equal(result.kind,kind,source);assert.equal(result.domain,domain);assert.equal(result.tryProjection,tried);for(const key of ['tryTypeProved','callbackBodyChecked','callbackTypesChecked','sourceBindingProved','semanticAuthority','sourceAuthority','executableAdmission'])assert.equal(result[key],false);}
 for(const source of [C+'unknown(value,||"missing".to_owned())',C+'u64_ok_or_else(number,||"missing".to_owned())',C+'u64_ok_or_else(value,|item|"missing".to_owned())',C+'u64_ok_or_else(value,factory)',C+'u64_to_u64_map(value,||1_u64)',C+'u64_to_u64_map(value,|item|item)?',C+'u64_ok_or_else(value,||"missing".to_owned())??'])assert.equal(readPrimitiveOptionCallbackCallSource(tokens(source),scope),null,source);
 for(const [domain,kind,value]of [['u64-option','option','u64'],['text-owned-option','option','text-owned'],['u64-text-result','result','u64'],['text-text-result','result','text']])assert.deepEqual(readCoreCarrierContractSourceRole(domain),{kind,domain:value});assert.equal(readCoreCarrierContractSourceRole('unknown'),null);assert.equal(readCoreCarrierContractSourceRole(null),null);
});
test('chronological encoded and primitive domains project the same actual callback source roles',limits,()=>{
 const source=C+'u64_ok_or_else(value,||"missing".to_owned())?',encoded=new Map([['value','option:u64']]);assert.equal(readCarrierAliasOperand(tokens(source),encoded).domain,'u64');assert.equal(readCarrierAliasOperand(tokens(source),encoded).kind,'payload');assert.equal(readPrimitiveCoreCallSource(tokens(source),encoded).kind,'u64');
});
for(const [label,propose,body]of [['ordinary primitive Result',ordinaryResult,primitiveBody],['source-bound primitive Result',boundResult,primitiveBody],['ordinary owned Result',ordinaryOwned,ownedBody],['source-bound owned Result',boundOwned,ownedBody],['ordinary Option',ordinaryCallback,optionBody],['source-bound Option',boundCallback,optionBody],['ordinary integer',ordinaryInteger,integerBody],['source-bound integer',boundInteger,integerBody]])test(label+' revisits actual callback-produced locals with complete original source inverses',limits,()=>{
 const request=input(body),row=rejoin(propose(request),request.files['src/lib.rs']);assert.equal(row.edits.length,1);assert.ok(row.selections.every(row=>row.executableAdmission===false));
});
test('all4 actual qualified callback local consumers emit JS and strict TypeScript',limits,async()=>{
 const request=input();let files=request.files;for(const stage of ['integer-methods','primitive-option-callback-methods','primitive-result-methods','owned-result-methods'])files=(await proposeSourceBoundOwnedCoreStage(stage,{...request,files})).after;const result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});await verifyTypedTargets(result,api=>{assert.deepEqual(api.mapped(some(3n)),ok(4n));assert.deepEqual(api.mapped(none),err('missing'));assert.deepEqual(api.mapped_text(some(' Ω😀 ')),ok('Ω😀'));assert.deepEqual(api.mapped_text(none),err('missing'));assert.deepEqual(api.mapped_option(some(false)),some(1n));assert.deepEqual(api.mapped_option(some(true)),some(2n));assert.deepEqual(api.mapped_option(none),none);assert.deepEqual(api.projected(some(18446744073709551615n)),ok(18446744073709551615n));assert.deepEqual(api.projected(some(3n)),ok(5n));assert.deepEqual(api.projected(none),err('missing'));},{childTimeoutMs:20000});
});
test('bounded stage composition can revisit integer rules after lazy callback introduction and Try projection',limits,async()=>{
 const request=input('pub fn restaged(value:Option<u64>)->Result<u64,String>{let selected=value.ok_or_else(||"missing".to_owned())?;Ok(selected.saturating_add(2))}'),result=await collectSourceBoundOwnedCoreFixedPoint({...request,stages:['integer-methods','primitive-option-callback-methods']});assert.equal(result.receipt.stabilized,true);assert.ok(result.stages.some(row=>row.round>0&&row.stage==='integer-methods'&&row.changedFiles.length));assert.ok(result.files['src/lib.rs'].includes('crate::translation_integer_core::u64_saturating_add'));assert.equal(result.receipt.coverageComplete,false);
});
test('declared callback return metadata never admits an actual invalid String error closure',limits,async()=>{
 const request=input(`pub fn bad(value:Option<u64>)->Result<u64,String>{let pending=${C}u64_ok_or_else(value,||true);pending.map(|item|item+1_u64)}`),proposal=await proposeSourceBoundOwnedCoreStage('primitive-result-methods',request),files=proposal.after;assert.equal(rejoin(proposal,request.files['src/lib.rs']).edits.length,1);const result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});assert.equal(result.meta.executable.some(row=>row.name==='bad'),false);
});
test('seven complete compiler source equations retain originals phases and full CST inverses',limits,()=>{
 const plan=prepareCallbackCallRoleSources();assert.equal(plan.files.length,7);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(row=>row.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
function input(body=bodies){const modules={translation_json_fields_core:JSON_FIELDS_NATIVE_SOURCE,translation_text_core:TEXT_NATIVE_SOURCE,translation_primitive_option_core:PRIMITIVE_OPTION_NATIVE_SOURCE,translation_primitive_option_callbacks_core:PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE,translation_integer_core:INTEGER_NATIVE_SOURCE,translation_primitive_results_core:PRIMITIVE_RESULT_NATIVE_SOURCE,translation_owned_results_core:OWNED_RESULT_NATIVE_SOURCE},files={'src/lib.rs':'pub mod translation_core;\n'+Object.keys(modules).map(name=>'pub mod '+name+';').join('\n')+'\n// Ω😀 actual stage composition source\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE};for(const [name,source]of Object.entries(modules))files['src/'+name+'.rs']=source;return {entry:'src/lib.rs',files,dependencyInputs:{...cargo},compilationProfile:PRODUCTION_PROFILE};}
function rejoin(proposal,source){const row=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,source);assert.deepEqual(row.trace.map(part=>part.phase),['language','repository']);assert.equal(proposal.executableAdmission,false);return row;}

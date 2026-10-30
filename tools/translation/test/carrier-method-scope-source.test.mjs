// Independent original carrier method callback scope SOURCE. All UNRUN.
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
import {readParenthesizedSourcePrefixTokens} from '../qualified-source-call-tokens.mjs';
import {coreCarrierCallbackSourceRegions} from '../core-carrier-callback-source-regions.mjs';
import {outsideOpaqueSourceTokens} from '../opaque-source-token-regions.mjs';
import {censusLocalAliasBindings} from '../local-alias-binding-source.mjs';
import {prepareCarrierMethodScopeSources} from '../prepare-carrier-method-scope-sources.mjs';
const limits={timeout:60000},root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')},tokens=source=>rustTokens(source).filter(row=>row.type!=='comment'),C='crate::translation_primitive_option_callbacks_core::',some=field0=>({$:'Some',field0}),none={$:'None'},ok=field0=>({$:'Ok',field0}),err=field0=>({$:'Err',field0});
const optionBody='pub fn option(value:Option<u64>)->Option<u64>{let pending=value.map(|value|{let mapped=value+1_u64;mapped});pending.map(|value|{let mapped=value+2_u64;mapped})}';
const resultBody='pub fn result(value:Result<u64,String>)->Result<u64,String>{let pending=value.map(|value|{let mapped=value+1_u64;mapped});pending.map(|value|{let mapped=value+2_u64;mapped})}';
const ownedBody='pub fn owned(value:Result<String,String>)->Result<String,String>{let pending=value.map(|value|{let mapped=value;mapped});pending.map(|value|{let mapped=value;mapped})}';
const integerBody='pub fn independent(value:u64,pending:Option<u64>)->u64{let ignored=pending.map(|value|value.saturating_add(9));value.saturating_add(2)}';
const bodies=[optionBody,resultBody,ownedBody].join('
');
test('reusable parenthesized prefix grammar preserves complete bounded original groups and leaves following syntax intact',limits,()=>{
 const source='(move||{let value=(1_u64,2_u64);value.0}).map(next)',rows=tokens(source),copy=rows.map(row=>({...row})),group=readParenthesizedSourcePrefixTokens(rows);assert.equal(source.slice(rows[group.start].start,rows[group.end-1].end),'(move||{let value=(1_u64,2_u64);value.0})');assert.equal(rows[group.end].text,'.');assert.deepEqual(rows,copy);assert.equal(group.sourceAuthority,false);assert.equal(group.semanticAuthority,false);for(const bad of ['[1_u64]','(1_u64]','(||{1_u64)','()'+ '']){if(bad==='()')continue;assert.equal(readParenthesizedSourcePrefixTokens(tokens(bad)),null,bad);}assert.equal(readParenthesizedSourcePrefixTokens(tokens('()')).body.length,0);
});
test('seven known method spellings produce syntactic scope candidates without method-dispatch or callback permission',limits,()=>{
 for(const [method,closure]of [['map','|value|value'],['and_then','|value|Some(value)'],['map_err','|error|error'],['or_else','||None'],['or_else','|error|Err(error)'],['unwrap_or_else','||1_u64'],['unwrap_or_else','|error|1_u64'],['ok_or_else','||"missing".to_owned()'],['filter','|value|true']]){const source='pending.'+method+'('+closure+')',regions=coreCarrierCallbackSourceRegions(tokens(source));assert.equal(regions.length,1,source);assert.equal(source.slice(regions[0].start,regions[0].end),closure);for(const key of ['methodDispatchProved','callbackBodyChecked','callbackTypesChecked','sourceBindingProved','sourceAuthority','semanticAuthority','executableAdmission'])assert.equal(regions[0][key],false);}
 for(const source of ['factory(||1_u64)','pending.unknown(|value|value)','pending.map(factory)','pending.map(||1_u64)','pending.map(|first,second|first)','pending.map(|value|value,unknown)','pending.map(|value|{value},)','pending.ok_or_else(|value|value)'])assert.equal(coreCarrierCallbackSourceRegions(tokens(source)).length,0,source);
});
test('outer method scope contains nested qualified callbacks while disjoint callbacks retain independent original coordinates',limits,()=>{
 const source='value.and_then(|value|'+C+'u64_to_u64_map(pending,|value|value)).map(|value|value)',rows=tokens(source),regions=coreCarrierCallbackSourceRegions(rows);assert.equal(regions.length,2);assert.ok(source.slice(regions[0].start,regions[0].end).includes(C));assert.ok(regions[0].end<=regions[1].start);const outside=outsideOpaqueSourceTokens(rows,regions);assert.equal(outside.some(row=>row.text==='|'),false);assert.equal(outside.some(row=>row.text==='translation_primitive_option_callbacks_core'),false);
});
test('complete source census ignores callback-local duplicates and retains genuine outer shadowing refusal',limits,()=>{
 const rows=tokens('let first=value.map(|value|{let mapped=value;mapped});let second=first.map(|value|{let mapped=value;mapped});'),parameters=new Set(['value']),regions=coreCarrierCallbackSourceRegions(rows);assert.ok(censusLocalAliasBindings(rows,parameters).reason);assert.equal(censusLocalAliasBindings(rows,parameters,{opaqueRegions:regions}).reason,null);const actual=tokens('let value=3_u64;'+ 'let first=pending.map(|value|value);');assert.ok(censusLocalAliasBindings(actual,parameters,{opaqueRegions:coreCarrierCallbackSourceRegions(actual)}).reason);
});
for(const [label,propose,body,edits]of [['ordinary Option callback',ordinaryCallback,optionBody,2],['source-bound Option callback',boundCallback,optionBody,2],['ordinary Result',ordinaryResult,resultBody,2],['source-bound Result',boundResult,resultBody,2],['ordinary owning Result',ordinaryOwned,ownedBody,2],['source-bound owning Result',boundOwned,ownedBody,2],['ordinary integer',ordinaryInteger,integerBody,1],['source-bound integer',boundInteger,integerBody,1]])test(label+' selects correct outer scopes without treating separate callback bindings as one function scope',limits,()=>{
 const request=input(body),row=rejoin(propose(request),request.files['src/lib.rs']);assert.equal(row.edits.length,edits);assert.ok(row.selections.every(row=>row.executableAdmission===false));if(body===integerBody){assert.equal(row.edits[0].expected,'value.saturating_add(2)');assert.ok(row.after.source.includes('pending.map(|value|value.saturating_add(9))'));}else assert.equal(row.after.source.match(/let mapped=/gu).length,2);
});
test('all three ordinary carrier callback/local chains receive independent JS and strict TypeScript',limits,async()=>{
 const request=input();let files=request.files;for(const stage of ['primitive-option-callback-methods','primitive-result-methods','owned-result-methods'])files=(await proposeSourceBoundOwnedCoreStage(stage,{...request,files})).after;const result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});await verifyTypedTargets(result,api=>{assert.deepEqual(api.option(some(3n)),some(6n));assert.deepEqual(api.option(some(0n)),some(3n));assert.deepEqual(api.option(none),none);assert.deepEqual(api.result(ok(3n)),ok(6n));assert.deepEqual(api.result(err('Ω😀')),err('Ω😀'));for(const input of [ok(' Ω😀 '),ok(''),err('denied')])assert.deepEqual(api.owned(input),input);},{childTimeoutMs:20000});
});
test('a syntactic carrier method scope cannot admit an incompatible callback annotation or unknown receiver',limits,async()=>{
 for(const body of ['pub fn bad(value:Option<u64>)->Option<u64>{value.map(|value:bool|if value{1_u64}else{0_u64})}','pub fn bad(value:u64)->u64{let ignored=unknown.map(|value|value);value.saturating_add(2)}']){const request=input(body);let files=request.files;for(const stage of ['integer-methods','primitive-option-callback-methods'])files=(await proposeSourceBoundOwnedCoreStage(stage,{...request,files})).after;const result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});assert.equal(result.meta.executable.some(row=>row.name==='bad'),false);}
});
test('nine full compiler source equations retain original native owners language/repository phases and complete CST inverses',limits,()=>{
 const plan=prepareCarrierMethodScopeSources();assert.equal(plan.files.length,9);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(row=>row.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
function input(body=bodies){const modules={translation_json_fields_core:JSON_FIELDS_NATIVE_SOURCE,translation_text_core:TEXT_NATIVE_SOURCE,translation_primitive_option_core:PRIMITIVE_OPTION_NATIVE_SOURCE,translation_primitive_option_callbacks_core:PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE,translation_integer_core:INTEGER_NATIVE_SOURCE,translation_primitive_results_core:PRIMITIVE_RESULT_NATIVE_SOURCE,translation_owned_results_core:OWNED_RESULT_NATIVE_SOURCE},files={'src/lib.rs':'pub mod translation_core;\n'+Object.keys(modules).map(name=>'pub mod '+name+';').join('\n')+'\n// Ω😀 actual stage composition source\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE};for(const [name,source]of Object.entries(modules))files['src/'+name+'.rs']=source;return {entry:'src/lib.rs',files,dependencyInputs:{...cargo},compilationProfile:PRODUCTION_PROFILE};}
function rejoin(proposal,source){const row=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,source);assert.deepEqual(row.trace.map(part=>part.phase),['language','repository']);assert.equal(proposal.executableAdmission,false);return row;}

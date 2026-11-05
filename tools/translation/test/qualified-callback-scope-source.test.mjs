// Independent qualified callback scope isolation SOURCE. Every case UNRUN.
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
import {readInlineClosureSourceTokens} from '../inline-closure-source-tokens.mjs';
import {qualifiedCoreCallbackSourceRegions} from '../qualified-core-callback-source-regions.mjs';
import {opaqueSourceTokenEnds,outsideOpaqueSourceTokens} from '../opaque-source-token-regions.mjs';
import {censusLocalAliasBindings} from '../local-alias-binding-source.mjs';
import {createPrimitiveLocalArgumentSource} from '../primitive-local-argument-source.mjs';
import {prepareQualifiedCallbackScopeSources} from '../prepare-qualified-callback-scope-sources.mjs';
const limits={timeout:60000},root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')},tokens=source=>rustTokens(source).filter(row=>row.type!=='comment'),C='crate::translation_primitive_option_callbacks_core::',R='crate::translation_primitive_results_core::',W='crate::translation_owned_results_core::',some=field0=>({$:'Some',field0}),none={$:'None'},ok=field0=>({$:'Ok',field0}),err=field0=>({$:'Err',field0});
const bodies=`pub fn projected(value:Option<u64>)->Result<u64,String>{let selected=${C}u64_ok_or_else(value,||"missing".to_owned())?;Ok(selected.saturating_add(2))}
pub fn block(value:Option<u64>)->Result<u64,String>{let selected=${C}u64_ok_or_else(value,||{"missing".to_owned()})?;Ok(selected.saturating_add(2))}
pub fn scalar(value:Option<u64>)->u64{let selected=${C}u64_unwrap_or_else(value,||{2_u64});selected.saturating_add(3)}
`;
test('reusable complete inline closure syntax keeps original body and leaves all semantic checks open',limits,()=>{
 for(const [source,arity]of [['||1_u64',0],['| |1_u64',0],['move||{1_u64}',0],['|value|value',1],['|value:u64|{let hidden=value;hidden}',1],['|value|true',1]]){const rows=tokens(source),copy=rows.map(row=>({...row})),result=readInlineClosureSourceTokens(rows,{arity});assert.equal(result.parameters.length,arity,source);assert.deepEqual(rows,copy);assert.equal(source.slice(...result.bodySpan),source.slice(rows[result.bodyStart].start));for(const key of ['callbackBodyChecked','callbackTypesChecked','capturesChecked','sourceAuthority','semanticAuthority'])assert.equal(result[key],false);}
 for(const source of ['factory','|value|','|mut value|value','|value:|value','|value,value|value','||{1_u64','|value|1_u64}'])assert.equal(readInlineClosureSourceTokens(tokens(source)),null,source);assert.equal(readInlineClosureSourceTokens(tokens('||1_u64'),{arity:1}),null);assert.equal(readInlineClosureSourceTokens(tokens('|value|value'),{arity:0}),null);
});
test('three exact qualified callback catalogues partition full original callback arguments and nested receiver calls',limits,()=>{
 const source=C+'u64_to_u64_map('+C+'u64_to_u64_map(pending,|first|first),|second|{let first=second;first})',rows=tokens(source),regions=qualifiedCoreCallbackSourceRegions(rows),ends=opaqueSourceTokenEnds(rows,regions);assert.equal(regions.length,2);assert.equal(ends.size,2);for(const region of regions){assert.ok(source.slice(region.start,region.end).startsWith('|'));assert.equal(region.callbackBodyChecked,false);assert.equal(region.sourceBindingProved,false);assert.equal(region.executableAdmission,false);}const visible=outsideOpaqueSourceTokens(rows,regions);assert.equal(visible.some(row=>row.text==='let'||row.text==='|'||row.text==='first'||row.text==='second'),false);
 for(const prefix of [C,R,W]){const name=prefix===C?'u64_to_u64_map':'u64_to_u64_map';assert.equal(qualifiedCoreCallbackSourceRegions(tokens(prefix+name+'(pending,|value|value)')).length,1);}
 for(const source of ['other::translation_primitive_option_callbacks_core::u64_to_u64_map(pending,|value|value)',C+'unknown(pending,|value|value)',C+'u64_to_u64_map(pending,||1_u64)',C+'u64_to_u64_map(pending,factory)',C+'u64_to_u64_map(pending,|value|value,)'])assert.equal(qualifiedCoreCallbackSourceRegions(tokens(source)).length,0,source);
 assert.throws(()=>opaqueSourceTokenEnds(rows,[{start:regions[0].start+2,end:regions[0].end}]),/boundary|coordinates/u);assert.throws(()=>opaqueSourceTokenEnds(rows,[regions[1],regions[0]]),/ordered/u);assert.throws(()=>opaqueSourceTokenEnds(rows,[regions[0],regions[0]]),/disjoint/u);
});
test('closure parameters and locals never leak into chronological outer primitive bindings',limits,()=>{
 const source='let selected='+C+'u64_unwrap_or_else(pending,||{let value="hidden";2_u64});value.saturating_add(selected)',rows=tokens(source),regions=qualifiedCoreCallbackSourceRegions(rows),parameters=new Map([['value','u64'],['pending','option:u64']]);assert.equal(censusLocalAliasBindings(rows,parameters.keys()).reason!==null,true);assert.equal(censusLocalAliasBindings(rows,parameters.keys(),{opaqueRegions:regions}).reason,null);const locals=createPrimitiveLocalArgumentSource(rows,parameters,new Set(parameters.keys()),{opaqueRegions:regions}),outside=rows.find(row=>row.text==='value'&&row.start>regions[0].end);assert.equal(locals.at(outside.start).get('value'),'u64');assert.equal(locals.at(rows.at(-1).end).get('selected'),'u64');assert.equal(locals.evidence('selected').semanticAuthority,false);
 const fresh=createPrimitiveLocalArgumentSource(rows,parameters,new Set(parameters.keys()),{opaqueRegions:regions});assert.throws(()=>fresh.at(regions[0].start+2),/inside an excluded callback/u);const actual=tokens(source+';let value=3_u64;');assert.ok(censusLocalAliasBindings(actual,parameters.keys(),{opaqueRegions:qualifiedCoreCallbackSourceRegions(actual)}).reason);
});
for(const [label,propose]of [['ordinary integer',ordinaryInteger],['source-bound integer',boundInteger]])test(label+' selects outside callback scopes while preserving original inside methods and shadowed names',limits,()=>{
 const body=`pub fn isolated(value:u64,pending:Option<u64>)->u64{let ignored=${C}u64_to_u64_map(pending,|value|{let other=value;other.saturating_add(9)});value.saturating_add(2)}`;const request=input(body),row=rejoin(propose(request),request.files['src/lib.rs']);assert.equal(row.edits.length,1);assert.equal(row.edits[0].expected,'value.saturating_add(2)');assert.ok(row.after.source.includes('|value|{let other=value;other.saturating_add(9)}'));assert.ok(row.selections.every(row=>row.executableAdmission===false));
 for(const callback of ['factory(||1_u64)',C+'unknown(pending,||1_u64)',C+'u64_to_u64_map(pending,||1_u64)']){const original=`pub fn unclosed(value:u64,pending:Option<u64>)->u64{let ignored=${callback};value.saturating_add(2)}`,request=input(original),proposal=propose(request);assert.equal(rejoin(proposal,request.files['src/lib.rs']).edits.length,0);}
});
test('simple block and projected callback locals receive independent JS and strict TypeScript',limits,async()=>{
 const request=input(),proposal=await proposeSourceBoundOwnedCoreStage('integer-methods',request),row=rejoin(proposal,request.files['src/lib.rs']);assert.equal(row.edits.length,3);const files=proposal.after,result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});await verifyTypedTargets(result,api=>{for(const name of ['projected','block']){assert.deepEqual(api[name](some(3n)),ok(5n));assert.deepEqual(api[name](some(18446744073709551615n)),ok(18446744073709551615n));assert.deepEqual(api[name](none),err('missing'));}assert.equal(api.scalar(none),5n);assert.equal(api.scalar(some(3n)),6n);},{childTimeoutMs:20000});
});
test('fixed-point source restaging revisits integer rules after original lazy Option methods become qualified callbacks',limits,async()=>{
 const request=input('pub fn restaged(value:Option<u64>)->Result<u64,String>{let selected=value.ok_or_else(||"missing".to_owned())?;Ok(selected.saturating_add(2))}'),result=await collectSourceBoundOwnedCoreFixedPoint({...request,stages:['integer-methods','primitive-option-callback-methods']});assert.equal(result.receipt.stabilized,true);assert.ok(result.stages.some(row=>row.round>0&&row.stage==='integer-methods'&&row.changedFiles.length));assert.ok(result.files['src/lib.rs'].includes('crate::translation_integer_core::u64_saturating_add'));assert.equal(result.receipt.coverageComplete,false);
});
test('excluding an actual callback scope from outer inference cannot admit an invalid callback body',limits,async()=>{
 const request=input(`pub fn bad(value:Option<u64>)->Result<u64,String>{let selected=${C}u64_ok_or_else(value,||true)?;Ok(selected.saturating_add(2))}`),proposal=await proposeSourceBoundOwnedCoreStage('integer-methods',request);assert.equal(rejoin(proposal,request.files['src/lib.rs']).edits.length,1);const files=proposal.after,result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});assert.equal(result.meta.executable.some(row=>row.name==='bad'),false);
});
test('ten complete compiler equations retain native owners original source two phases and full CST inverses',limits,()=>{
 const plan=prepareQualifiedCallbackScopeSources();assert.equal(plan.files.length,10);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(row=>row.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
function input(body=bodies){const modules={translation_json_fields_core:JSON_FIELDS_NATIVE_SOURCE,translation_text_core:TEXT_NATIVE_SOURCE,translation_primitive_option_core:PRIMITIVE_OPTION_NATIVE_SOURCE,translation_primitive_option_callbacks_core:PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE,translation_integer_core:INTEGER_NATIVE_SOURCE,translation_primitive_results_core:PRIMITIVE_RESULT_NATIVE_SOURCE,translation_owned_results_core:OWNED_RESULT_NATIVE_SOURCE},files={'src/lib.rs':'pub mod translation_core;\n'+Object.keys(modules).map(name=>'pub mod '+name+';').join('\n')+'\n// Ω😀 actual stage composition source\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE};for(const [name,source]of Object.entries(modules))files['src/'+name+'.rs']=source;return {entry:'src/lib.rs',files,dependencyInputs:{...cargo},compilationProfile:PRODUCTION_PROFILE};}
function rejoin(proposal,source){const row=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,source);assert.deepEqual(row.trace.map(part=>part.phase),['language','repository']);assert.equal(proposal.executableAdmission,false);return row;}

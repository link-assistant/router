// Independent nested nonbinding pattern shape SOURCE. All cases UNRUN.
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
import {proposeCallbackIntegerBodySource} from '../callback-integer-body-source.mjs';
import {proposeCallbackCoreBodySource} from '../callback-core-body-source.mjs';
import {prepareNonbindingPatternShapesSources} from '../prepare-nonbinding-pattern-shapes-sources.mjs';
import {collectClosedMatchPatternSource} from '../match-arm-source.mjs';
import {censusLocalAliasBindings} from '../local-alias-binding-source.mjs';
const limits={timeout:60000},root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')};
const bodies=`pub fn selected_option(value:&str,input:Option<bool>)->String{let saved=value;match input{Some(_)=>saved.into(),Option::None=>"none".into()}}
pub fn selected_result(value:&str,input:Result<bool,String>)->String{match input{Ok(_)=>value.into(),Err(_)=>"error".into()}}
pub fn some()->Option<bool>{Some(true)}
pub fn none()->Option<bool>{None}
pub fn ok()->Result<bool,String>{Ok(true)}
pub fn err()->Result<bool,String>{Err(crate::translation_text_core::to_owned("ignored"))}
`;
for(const [label,propose]of [['ordinary text',ordinaryText],['source-bound text',boundText]])test(label+' complete nonbinding Option/Result constructor patterns retain original String target and alias scopes',limits,()=>{
 const request=input(),row=propose(request).proposals.find(row=>row.file==='src/lib.rs');assert.equal(row.edits.length,4);assert.equal(row.after.source.includes('.into('),false);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,row.before.source);assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,request.files['src/lib.rs']);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);assert.deepEqual(row.trace.map(stage=>stage.phase),['language','repository']);for(const selection of row.selections)assert.equal(selection.executableAdmission,false);
});
test('actual constructor-pattern callers retain independent complete JS strict TS error-drop none and Unicode/NUL behavior through actual native factories',limits,async()=>{
 const request=input(),proposal=await proposeSourceBoundOwnedCoreStage('text-methods',request),files=proposal.after,result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});await verifyTypedTargets(result,api=>{for(const value of ['','é😀','a\0b']){assert.equal(api.selected_option(value,api.some()),value);assert.equal(api.selected_option(value,api.none()),'none');assert.equal(api.selected_result(value,api.ok()),value);assert.equal(api.selected_result(value,api.err()),'error');}},{childTimeoutMs:20000});
});
const rows=source=>rustTokens(source).filter(row=>row.type!=='comment');
test('recursive closed constructors tuples slices explicit ignored record fields references ranges and or-patterns introduce no guessed local roles',limits,()=>{
 for(const pattern of ['Some(_)','Err(_)','Some(Ok(_))','Some(..)','(_,_)','()','[_,..]','[_,_,]','Type::Record{field:_,..}','Type::Record{first:Some(_),second:_,}','&Some(_)','&mut _','0..=3',"'a'..='z'",'| Some(_) | Option::None','Some((0|1,_))','::ROOT']){const source='let saved=value;match input{'+pattern+'=>saved,_=>saved}',tokens=rows(source),inventory=collectClosedMatchPatternSource(tokens);assert.equal(inventory.refusals.length,0,pattern);assert.equal(inventory.matches.length,1,pattern);assert.equal(inventory.matches[0].patternBindingsIntroduced,false);assert.equal(inventory.patternTypesProved,false);assert.equal(inventory.callerScopeProved,false);assert.equal(inventory.executableAdmission,false);assert.equal(censusLocalAliasBindings(tokens,new Set(['value','input'])).reason,null,pattern);for(const position of inventory.positions)assert.equal(source.slice(position,position+1),'|');}
});
test('bare names payload bindings reference bindings record shorthand at-patterns guards macros duplicate rests and malformed fields remain unsupported',limits,()=>{
 for(const pattern of ['None','Some(binding)','Ok(ref binding)','&binding','Type::Record{field}','Type::Record{field:alias}','Type::Record{..,field:_}','[_,..,..]','binding@Some(_)','Some(macro!())','Some(_,) if guard','Type::Record{_:_}','_..=3']){const source='match input{'+pattern+'=>value,_=>value}',tokens=rows(source),inventory=collectClosedMatchPatternSource(tokens);assert.ok(inventory.refusals.length>0,pattern);assert.ok(censusLocalAliasBindings(tokens,new Set(['value','input'])).reason,pattern);}const nested='Some('.repeat(70)+'_'+')'.repeat(70),inventory=collectClosedMatchPatternSource(rows('match input{'+nested+'=>value}'));assert.ok(inventory.refusals.length>0);
});
test('actual binding-pattern shadows still refuse complete original functions instead of guessing the parameter role',limits,()=>{
 for(const body of ['pub fn bound(value:&str,input:Option<String>)->String{match input{Some(value)=>value.to_owned(),Option::None=>"none".into()}}','pub fn shorthand(value:&str,input:Record)->String{match input{Record{value}=>value.to_owned()}}']){const request=input(body),row=ordinaryText(request).proposals.find(row=>row.file==='src/lib.rs');assert.equal(row.edits.length,0,body);assert.equal(row.after.source,request.files['src/lib.rs']);}
});
test('two complete compiler equations retain original native owners ordered phases and whole source inverses',limits,()=>{
 const plan=prepareNonbindingPatternShapesSources();assert.equal(plan.files.length,2);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
function input(body=bodies){const modules={translation_json_fields_core:JSON_FIELDS_NATIVE_SOURCE,translation_text_core:TEXT_NATIVE_SOURCE,translation_primitive_option_core:PRIMITIVE_OPTION_NATIVE_SOURCE,translation_primitive_option_callbacks_core:PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE,translation_integer_core:INTEGER_NATIVE_SOURCE,translation_primitive_results_core:PRIMITIVE_RESULT_NATIVE_SOURCE,translation_owned_results_core:OWNED_RESULT_NATIVE_SOURCE},files={'src/lib.rs':'pub mod translation_core;\n'+Object.keys(modules).map(name=>'pub mod '+name+';').join('\n')+'\n// Ω😀 actual stage composition source\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE};for(const [name,source]of Object.entries(modules))files['src/'+name+'.rs']=source;return {entry:'src/lib.rs',files,dependencyInputs:{...cargo},compilationProfile:PRODUCTION_PROFILE};}

// Independent current text/carrier/Try source joins. All case SOURCE UNRUN.
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
import {readTextCoreCallSource} from '../text-core-call-source.mjs';
import {readPrimitiveSourceBindingRole} from '../primitive-core-call-source.mjs';
import {prepareTextCarrierJoinSources} from '../prepare-text-carrier-join-sources.mjs';
const limits={timeout:60000},root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')},tokens=source=>rustTokens(source).filter(row=>row.type!=='comment'),some=field0=>({$:'Some',field0}),none={$:'None'},ok=field0=>({$:'Ok',field0}),err=field0=>({$:'Err',field0}),O='crate::translation_primitive_option_core::',C='crate::translation_primitive_option_callbacks_core::',T='crate::translation_text_core::';
const bodies=`pub fn local(value:Option<String>)->Option<String>{let selected=value?;Some(selected.trim().to_owned())}
pub fn result(value:Result<String,String>)->Result<String,String>{let selected=value?;Ok(selected.trim().to_owned())}
pub fn inline(value:Option<String>)->Option<String>{Some(value?.trim().to_owned())}
pub fn grouped(value:Option<String>)->Option<String>{Some((value)?.trim().to_owned())}
pub fn borrowed<'a>(value:Option<&'a str>)->Option<String>{let selected=value?;Some(selected.trim().to_owned())}
pub fn core(value:Option<String>)->Result<String,String>{Ok(${O}text_owned_ok_or_text(value,"missing")?.trim().to_owned())}
pub fn callback(value:Option<String>,label:&str)->String{${C}text_owned_unwrap_or_else(value,||${T}to_owned(label)).trim().to_owned()}
pub fn count(value:Option<String>)->Option<u64>{Some(value?.trim().len() as u64)}
`;
test('shared written and encoded lexical text carrier roles are closed source DATA',limits,()=>{
 for(const [source,wanted]of [['Option<String>','option:text-owned'],['Option<std::string::String>','option:text-owned'],["Option<&'a str>",'option:str'],['std::result::Result<String,String>','result:text'],['Result<&str,String>','result:str'],['Option<::core::primitive::u32>','option:u32']])assert.equal(readPrimitiveCoreParameterSourceRole(tokens(source)),wanted,source);
 for(const [encoded,kind,domain]of [['str','payload','str'],['option:str','option','str'],['option:text-owned','option','text-owned'],['result:text','result','text'],['result:str','result','str']])assert.deepEqual(readPrimitiveSourceBindingRole(encoded),{kind,domain});for(const encoded of ['option:text','result:unknown','payload:str','option:json-reference',null,{}])assert.equal(readPrimitiveSourceBindingRole(encoded),null);
});
test('bare grouped core and callback text payloads compose from current lexical roles without type or binding authority',limits,()=>{
 const bindings=new Map([['value','option:text-owned'],['result','result:text'],['borrowed','option:str'],['label','str'],['number','u64']]);for(const [source,kind]of [['value?','text-owned'],['(value)?','text-owned'],['result?','text-owned'],['borrowed?','str'],[O+'text_owned_ok_or_text(value,"missing")?','text-owned'],[C+'text_owned_unwrap_or_else(value,||'+T+'to_owned(label))','text-owned']]){const result=readTextCoreCallSource(tokens(source),bindings);assert.equal(result.kind,kind,source);for(const key of ['tryTypeProved','sourceBindingProved','sourceAuthority','semanticAuthority','executableAdmission'])assert.equal(result[key],false);}for(const source of ['number?','value','value??','unknown?',C+'text_owned_unwrap_or_else(number,||'+T+'to_owned(label))'])assert.equal(readTextCoreCallSource(tokens(source),bindings),null,source);
});
for(const [label,propose]of [['ordinary text',ordinaryText],['source-bound text',boundText]])test(label+' selects all eight actual text carrier/Try callers and preserves complete parent inverses',limits,()=>{
 const request=input(),row=rejoin(propose(request),request.files['src/lib.rs']);assert.equal(row.edits.length,8);assert.ok(row.selections.every(row=>row.executableAdmission===false));assert.ok(row.edits.some(row=>row.expected==='value?.trim().to_owned()'));assert.ok(row.edits.some(row=>row.expected==='(value)?.trim().to_owned()'));assert.ok(row.after.source.includes('||'+T+'to_owned(label)'));
});
test('eight actual text carrier/Try sources receive independent JS and strict TypeScript with Unicode absence errors and bytes',limits,async()=>{
 const request=input(),proposal=await proposeSourceBoundOwnedCoreStage('text-methods',request),files=proposal.after,result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});await verifyTypedTargets(result,api=>{for(const name of ['local','inline','grouped','borrowed']){assert.deepEqual(api[name](some(' é😀 ')),some('é😀'));assert.deepEqual(api[name](some('')),some(''));assert.deepEqual(api[name](none),none);}assert.deepEqual(api.result(ok(' é😀 ')),ok('é😀'));assert.deepEqual(api.result(err('Ω😀')),err('Ω😀'));assert.deepEqual(api.core(some(' é😀 ')),ok('é😀'));assert.deepEqual(api.core(none),err('missing'));assert.equal(api.callback(some(' é😀 '),'unselected'),'é😀');assert.equal(api.callback(none,' fallback '),'fallback');assert.deepEqual(api.count(some(' é😀 ')),some(6n));assert.deepEqual(api.count(some('')),some(0n));assert.deepEqual(api.count(none),none);},{childTimeoutMs:20000});
});
test('actual unknown carrier payloads and incompatible enclosing Try contexts stay nonexecutable after text source selection',limits,async()=>{
 for(const body of ['pub fn bad(value:Option<String>)->String{let selected=value?;selected.trim().to_owned()}','pub fn bad(value:Option<u64>)->Option<String>{let selected=value?;Some(selected.trim().to_owned())}']){const request=input(body),proposal=await proposeSourceBoundOwnedCoreStage('text-methods',request),files=proposal.after,result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});assert.equal(result.meta.executable.some(row=>row.name==='bad'),false);}
});
test('five complete compiler equations retain immutable originals native owners two phases and full CST inverses',limits,()=>{
 const plan=prepareTextCarrierJoinSources();assert.equal(plan.files.length,5);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(row=>row.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
function input(body=bodies){const modules={translation_json_fields_core:JSON_FIELDS_NATIVE_SOURCE,translation_text_core:TEXT_NATIVE_SOURCE,translation_primitive_option_core:PRIMITIVE_OPTION_NATIVE_SOURCE,translation_primitive_option_callbacks_core:PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE,translation_integer_core:INTEGER_NATIVE_SOURCE,translation_primitive_results_core:PRIMITIVE_RESULT_NATIVE_SOURCE,translation_owned_results_core:OWNED_RESULT_NATIVE_SOURCE},files={'src/lib.rs':'pub mod translation_core;\n'+Object.keys(modules).map(name=>'pub mod '+name+';').join('\n')+'\n// Ω😀 actual stage composition source\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE};for(const [name,source]of Object.entries(modules))files['src/'+name+'.rs']=source;return {entry:'src/lib.rs',files,dependencyInputs:{...cargo},compilationProfile:PRODUCTION_PROFILE};}
function rejoin(proposal,source){const row=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,source);assert.deepEqual(row.trace.map(part=>part.phase),['language','repository']);assert.equal(proposal.executableAdmission,false);return row;}

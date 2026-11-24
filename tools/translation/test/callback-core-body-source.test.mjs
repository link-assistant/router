// Independent actual callback integer/text engine composition SOURCE. All UNRUN.
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
import {prepareCallbackCoreBodySources} from '../prepare-callback-core-body-sources.mjs';
const limits={timeout:60000},root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')},some=field0=>({$:'Some',field0}),none={$:'None'},ok=field0=>({$:'Ok',field0}),err=field0=>({$:'Err',field0});
const optionBodies=`pub fn option(value:Option<u64>)->Option<u64>{value.map(|item|item.saturating_add(2))}
pub fn checked(value:Option<u64>)->Option<u64>{value.and_then(|item|item.checked_add(2))}
pub fn lazy(value:Option<u64>,base:u64)->u64{value.unwrap_or_else(||base.saturating_add(2))}
pub fn signed(value:Option<i64>)->Option<i64>{value.map(|item|item.wrapping_add(2))}
pub fn conditional(value:Option<u64>,prefer:bool)->Option<u64>{value.map(|item|if prefer{item.saturating_add(2)}else{item.saturating_sub(2)})}
pub fn option_length(value:Option<String>)->Option<u64>{value.map(|item|(item.trim().len() as u64).saturating_add(2))}
`;
const resultBodies=`pub fn result(value:Result<u64,String>)->Result<u64,String>{value.map(|item|item.saturating_add(2))}
pub fn chained(value:Result<u64,String>)->Result<u64,String>{value.and_then(|item|Ok(item.saturating_add(2)))}
pub fn recovered(value:Result<u64,String>,base:u64)->u64{value.unwrap_or_else(|error|base.saturating_add(2))}
`;
const ownedBodies=`pub fn owned_length(value:Result<String,String>)->Result<u64,String>{value.map(|item|{let count=item.trim().len() as u64;count.saturating_add(2)})}
`;
const bodies=optionBodies+resultBodies+ownedBodies;
function childInverse(proposal){let source=proposal.after.source;for(const row of [...proposal.mapping].reverse())if(row.kind==='substitution')source=source.slice(0,row.after[0])+row.expected+source.slice(row.after[1]);assert.equal(source,proposal.before.source);assert.equal(transportConcreteSyntaxMeta(proposal.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(proposal.after.meta).source,proposal.after.source);assert.deepEqual(proposal.trace.map(row=>row.phase),['language','repository']);assert.equal(proposal.wrapper.functionOwnerProved,false);assert.equal(proposal.wrapper.temporaryTypesAreSourceData,true);assert.equal(proposal.sourceAuthority,false);assert.equal(proposal.semanticAuthority,false);assert.equal(proposal.executableAdmission,false);return proposal;}
test('actual original integer engine source copies support all ten native widths and complete child body inverses',limits,()=>{
 for(const domain of ['u8','i8','u16','i16','u32','i32','u64','i64','u128','i128']){const body='value.saturating_add(1)',proposal=childInverse(proposeCallbackIntegerBodySource(body,new Map([['value',{kind:'payload',domain}]])));assert.ok(proposal.after.source.includes('crate::translation_integer_core::'+domain+'_saturating_add'));assert.equal(proposal.edits.length,1);assert.equal(proposal.edits[0].expected,body);assert.equal(proposal.selections[0].functionOwnerProved,false);}
 const scope=new Map([['value',{kind:'payload',domain:'u64'}]]),body='{/* Ω😀 retained */let next=value.saturating_add(1);next.saturating_add(2)}',proposal=childInverse(proposeCallbackIntegerBodySource(body,scope));assert.equal(proposal.edits.length,2);assert.ok(proposal.after.source.includes('/* Ω😀 retained */'));for(const edit of proposal.edits)assert.equal(body.slice(...edit.span),edit.expected);for(const bad of ['unknown.saturating_add(2)','value.custom(2)','3'])assert.equal(proposeCallbackIntegerBodySource(bad,scope),null,bad);assert.equal(proposeCallbackIntegerBodySource('value.saturating_add(2)',new Map()),null);assert.equal(proposeCallbackIntegerBodySource('x'.repeat(65537),scope),null);assert.equal(proposeCallbackIntegerBodySource('value.saturating_add(2)',new Map(Array.from({length:65},(_,at)=>['value'+at,{kind:'payload',domain:'u64'}]))),null);
});
test('bounded shared body composition keeps full text then integer child histories and original source coordinates',limits,()=>{
 const scope=new Map([['item',{kind:'payload',domain:'text-owned'}]]);for(const body of ['(item.trim().len() as u64).saturating_add(2)','{/* Ω😀 */let count=item.trim().len() as u64;count.saturating_add(2)}']){const result=childInverse(proposeCallbackCoreBodySource(body,scope));assert.ok(result.after.source.includes('crate::translation_text_core::'));assert.ok(result.after.source.includes('crate::translation_integer_core::'));assert.deepEqual(result.bodySourceHistories.map(row=>row.name),['text','integer']);let current=body;for(const row of result.bodySourceHistories){assert.equal(row.proposal.before.source,current);childInverse(row.proposal);current=row.proposal.after.source;}assert.equal(current,result.after.source);assert.equal(result.sourceStagesStable,true);assert.equal(result.sourceStagesComplete,false);assert.equal(result.functionOwnerProved,false);assert.equal(result.bodySourceHistories.every(row=>row.sourceAuthority===false&&row.executableAdmission===false),true);}
});
for(const [label,propose,body,count]of [['ordinary Option callback',ordinaryCallback,optionBodies,6],['source-bound Option callback',boundCallback,optionBodies,6],['ordinary primitive Result',ordinaryResult,resultBodies,3],['source-bound primitive Result',boundResult,resultBodies,3],['ordinary owning Result',ordinaryOwned,ownedBodies,1],['source-bound owning Result',boundOwned,ownedBodies,1]])test(label+' uses shared body engines for actual integer methods and preserves all child and parent inverses',limits,()=>{
 const request=input(body),row=rejoin(propose(request),request.files['src/lib.rs']);assert.equal(row.edits.length,count);for(const selection of row.selections){assert.ok(selection.callbackTextSourceHistories.length);assert.equal(selection.executableAdmission,false);for(const child of selection.callbackTextSourceHistories){childInverse(child);for(const stage of child.bodySourceHistories)childInverse(stage.proposal);}}assert.ok(row.after.source.includes('crate::translation_integer_core::'));assert.equal(row.after.source.includes('::translation_compatibility_integer::'),false);
});
test('all ten actual numeric callback source callers receive independent JavaScript and strict TypeScript',limits,async()=>{
 const request=input();let files=request.files;for(const stage of ['primitive-option-callback-methods','primitive-result-methods','owned-result-methods'])files=(await proposeSourceBoundOwnedCoreStage(stage,{...request,files})).after;const result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});await verifyTypedTargets(result,api=>{assert.deepEqual(api.option(some(3n)),some(5n));assert.deepEqual(api.option(some(18446744073709551615n)),some(18446744073709551615n));assert.deepEqual(api.option(none),none);assert.deepEqual(api.checked(some(3n)),some(5n));assert.deepEqual(api.checked(some(18446744073709551615n)),none);assert.deepEqual(api.checked(none),none);assert.equal(api.lazy(none,3n),5n);assert.equal(api.lazy(some(7n),18446744073709551615n),7n);assert.deepEqual(api.signed(some(9223372036854775807n)),some(-9223372036854775807n));assert.deepEqual(api.conditional(some(3n),true),some(5n));assert.deepEqual(api.conditional(some(1n),false),some(0n));assert.deepEqual(api.conditional(none,true),none);assert.deepEqual(api.option_length(some(' é😀 ')),some(8n));assert.deepEqual(api.option_length(none),none);for(const name of ['result','chained']){assert.deepEqual(api[name](ok(3n)),ok(5n));assert.deepEqual(api[name](err('Ω😀')),err('Ω😀'));}assert.equal(api.recovered(err('denied'),3n),5n);assert.equal(api.recovered(ok(7n),18446744073709551615n),7n);assert.deepEqual(api.owned_length(ok(' é😀 ')),ok(8n));assert.deepEqual(api.owned_length(ok('')),ok(2n));assert.deepEqual(api.owned_length(err('denied')),err('denied'));},{childTimeoutMs:20000});
});
test('temporary numeric wrapper roles and changed body source cannot admit actual invalid callback captures',limits,async()=>{
 const request=input('pub fn bad(value:Option<u64>,base:bool)->Option<u64>{value.map(|item|base.saturating_add(item))}'),proposal=await proposeSourceBoundOwnedCoreStage('primitive-option-callback-methods',request),files=proposal.after,result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});assert.equal(result.meta.executable.some(row=>row.name==='bad'),false);
});
test('twelve complete compiler equations retain exact copied native helpers full originals two phases and CST inverses',limits,()=>{
 const plan=prepareCallbackCoreBodySources();assert.equal(plan.files.length,12);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(row=>row.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
function input(body=bodies){const modules={translation_json_fields_core:JSON_FIELDS_NATIVE_SOURCE,translation_text_core:TEXT_NATIVE_SOURCE,translation_primitive_option_core:PRIMITIVE_OPTION_NATIVE_SOURCE,translation_primitive_option_callbacks_core:PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE,translation_integer_core:INTEGER_NATIVE_SOURCE,translation_primitive_results_core:PRIMITIVE_RESULT_NATIVE_SOURCE,translation_owned_results_core:OWNED_RESULT_NATIVE_SOURCE},files={'src/lib.rs':'pub mod translation_core;\n'+Object.keys(modules).map(name=>'pub mod '+name+';').join('\n')+'\n// Ω😀 actual stage composition source\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE};for(const [name,source]of Object.entries(modules))files['src/'+name+'.rs']=source;return {entry:'src/lib.rs',files,dependencyInputs:{...cargo},compilationProfile:PRODUCTION_PROFILE};}
function rejoin(proposal,source){const row=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,source);assert.deepEqual(row.trace.map(part=>part.phase),['language','repository']);assert.equal(proposal.executableAdmission,false);return row;}

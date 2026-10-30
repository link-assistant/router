// Independent explicitly contextual borrowed text Into SOURCE. All UNRUN.
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
import {prepareTextBuilderAliasSources} from '../prepare-text-builder-alias-sources.mjs';
const limits={timeout:60000},root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')};
const bodies=`pub fn alias(value:&str)->String{let suffix=value;let mut output=String::new();output.push_str(suffix);output}
pub fn chained(value:&str)->String{let first=value;let second=first;let mut output=String::new();output.push_str(second);output}
pub fn initialized(value:&str)->String{let first=value;let mut output=String::from(first);output.push_str(first);output}
pub fn nested(value:&str,flag:bool)->String{let mut output=String::new();if flag{let yes=value;output.push_str(yes);}else{let no="é😀";output.push_str(no);}output}
pub fn core_view(value:&str)->String{let suffix=crate::translation_text_core::trim(value);let mut output=String::new();output.push_str(suffix);output}
`;
function inverse(row){let source=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')source=source.slice(0,part.after[0])+part.expected+source.slice(part.after[1]);assert.equal(source,row.before.source);assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);assert.deepEqual(row.trace.map(stage=>stage.phase),['language','repository']);return row;}
for(const [label,propose]of [['ordinary text',ordinaryText],['source-bound text',boundText]])test(label+' uses original chronological immutable alias scopes for builder arguments and initializers',limits,()=>{
 const request=input(),row=inverse(propose(request).proposals.find(row=>row.file==='src/lib.rs'));assert.equal(row.edits.length,6);assert.equal(row.after.source.includes('.push_str('),false);for(const selection of row.selections){assert.equal(selection.operation,'builder:push_str');assert.equal(selection.oldTraitDispatchProved,false);assert.equal(selection.executableAdmission,false);assert.equal(selection.suffixAliasSource.sourceAuthority,false);assert.equal(selection.suffixAliasSource.semanticAuthority,false);}assert.ok(row.selections.some(row=>row.suffixAliasSource.bridge==='complete-shared-text-carrier-call-source'));
});
test('out-of-scope shadowed forged written types and aliases borrowing the mutable builder retain whole original functions',limits,()=>{
 for(const body of ['pub fn scope(value:&str)->String{let mut output=String::new();{let suffix=value;}output.push_str(suffix);output}','pub fn shadow(value:&str)->String{let suffix=value;let mut output=String::new();{let suffix="other";output.push_str(suffix);}output}','pub fn wrong(value:&str)->String{let suffix:&str=65_u64;let mut output=String::new();output.push_str(suffix);output}','pub fn borrow(value:&str)->String{let mut output=String::from(value);let suffix=output.as_str();output.push_str(suffix);output}']){const request=input(body),row=ordinaryText(request).proposals.find(row=>row.file==='src/lib.rs');assert.equal(row.edits.length,0,body);assert.equal(row.after.source,request.files['src/lib.rs']);}
});
test('all five actual complete alias/building callers receive independent JS strict TS and lexical source behavior',limits,async()=>{
 const request=input(),proposal=await proposeSourceBoundOwnedCoreStage('text-methods',request),files=proposal.after,result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});await verifyTypedTargets(result,api=>{for(const value of ['','é😀','a\0b',' é😀 ']){assert.equal(api.alias(value),value);assert.equal(api.chained(value),value);assert.equal(api.initialized(value),value+value);assert.equal(api.nested(value,true),value);assert.equal(api.nested(value,false),'é😀');assert.equal(api.core_view(value),value.trim());}},{childTimeoutMs:20000});
});
test('two complete compiler equations retain original owners whole source phases and exact CST inverses',limits,()=>{
 const plan=prepareTextBuilderAliasSources();assert.equal(plan.files.length,2);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
function input(body=bodies){const modules={translation_json_fields_core:JSON_FIELDS_NATIVE_SOURCE,translation_text_core:TEXT_NATIVE_SOURCE,translation_primitive_option_core:PRIMITIVE_OPTION_NATIVE_SOURCE,translation_primitive_option_callbacks_core:PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE,translation_integer_core:INTEGER_NATIVE_SOURCE,translation_primitive_results_core:PRIMITIVE_RESULT_NATIVE_SOURCE,translation_owned_results_core:OWNED_RESULT_NATIVE_SOURCE},files={'src/lib.rs':'pub mod translation_core;\n'+Object.keys(modules).map(name=>'pub mod '+name+';').join('\n')+'\n// Ω😀 actual stage composition source\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE};for(const [name,source]of Object.entries(modules))files['src/'+name+'.rs']=source;return {entry:'src/lib.rs',files,dependencyInputs:{...cargo},compilationProfile:PRODUCTION_PROFILE};}
function rejoin(proposal,source){const row=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,source);assert.deepEqual(row.trace.map(part=>part.phase),['language','repository']);assert.equal(proposal.executableAdmission,false);return row;}

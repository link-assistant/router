// Independent original builder method suffix SOURCE. All cases UNRUN.
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
import {prepareTextBuilderMethodOperandsSources} from '../prepare-text-builder-method-operands-sources.mjs';
const limits={timeout:60000},root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')};
const bodies=`pub fn trimmed(value:&str)->String{let mut output=String::new();output.push_str(value.trim());output}
pub fn chained(value:&str)->String{let mut output=String::new();output.push_str(value.trim_start().trim_end());output}
pub fn owned_trimmed(value:String)->String{let mut output=String::new();output.push_str(value.as_str().trim());output}
pub fn branched(value:&str,flag:bool)->String{let mut output=String::new();output.push_str(if flag{value.trim_start()}else{value.trim_end()});output}
pub fn from_trimmed(value:&str)->String{let mut output=String::from(value.trim());output.push_str(value.trim());output}
pub fn alias_trimmed(value:&str)->String{let first=value;let mut output=String::new();output.push_str(first.trim());output}
pub fn literal_trimmed()->String{let mut output=String::new();output.push_str(" é😀 ".trim());output}
`;
for(const [label,propose]of [['ordinary text',ordinaryText],['source-bound text',boundText]])test(label+' composes the existing original method rule engine inside complete borrowed suffixes and From initializers',limits,()=>{
 const request=input(),row=propose(request).proposals.find(row=>row.file==='src/lib.rs');assert.equal(row.edits.length,8);assert.equal(row.after.source.includes('.push_str('),false);assert.equal(row.after.source.includes('.trim('),false);assert.ok(row.after.source.includes('String::from(crate::translation_text_core::trim(value))'));assert.ok(row.selections.some(selection=>selection.operation==='builder:initialize-from'));let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,row.before.source);assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,request.files['src/lib.rs']);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);for(const selection of row.selections){const nested=selection.suffixOperandSource.nestedTextSource;assert.ok(nested);assert.equal(nested.before.source,nested.inverse);assert.equal(transportConcreteSyntaxMeta(nested.before.meta).source,nested.inverse);assert.equal(transportConcreteSyntaxMeta(nested.after.meta).source,nested.after.source);assert.equal(nested.temporaryTypesAreSourceData,true);assert.equal(nested.originalLoanProved,false);assert.equal(nested.executableAdmission,false);assert.equal(selection.executableAdmission,false);assert.deepEqual(nested.trace.map(stage=>stage.phase),['language','repository']);}
});
test('seven whole translated callers have independent JS strict TS Unicode empty and branch behavior',limits,async()=>{
 const request=input(),proposal=await proposeSourceBoundOwnedCoreStage('text-methods',request),files=proposal.after,result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});await verifyTypedTargets(result,api=>{for(const value of ['','é😀','a\0b',' é😀 ','\u2003é😀\u2003']){assert.equal(api.trimmed(value),value.trim());assert.equal(api.chained(value),value.trim());assert.equal(api.owned_trimmed(value),value.trim());assert.equal(api.branched(value,true),value.trimStart());assert.equal(api.branched(value,false),value.trimEnd());assert.equal(api.from_trimmed(value),value.trim()+value.trim());assert.equal(api.alias_trimmed(value),value.trim());}assert.equal(api.literal_trimmed(),'é😀');},{childTimeoutMs:20000});
});
test('owning results temporary owner borrows unknown methods and self-view suffixes remain whole original functions',limits,()=>{
 for(const body of ['pub fn own(value:&str)->String{let mut output=String::new();output.push_str(value.to_owned());output}','pub fn temporary(value:&str)->String{let mut output=String::new();output.push_str(&value.to_owned());output}','pub fn self_view(value:&str)->String{let mut output=String::from(value);output.push_str(output.as_str().trim());output}','pub fn unknown(value:&str)->String{let mut output=String::new();output.push_str(value.unresolved_method());output}']){const request=input(body),row=ordinaryText(request).proposals.find(row=>row.file==='src/lib.rs');assert.equal(row.edits.length,0,body);assert.equal(row.after.source,request.files['src/lib.rs']);}
});
test('four complete compiler equations retain immutable native owners ordered source rules and full inverses',limits,()=>{
 const plan=prepareTextBuilderMethodOperandsSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
function input(body=bodies){const modules={translation_json_fields_core:JSON_FIELDS_NATIVE_SOURCE,translation_text_core:TEXT_NATIVE_SOURCE,translation_primitive_option_core:PRIMITIVE_OPTION_NATIVE_SOURCE,translation_primitive_option_callbacks_core:PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE,translation_integer_core:INTEGER_NATIVE_SOURCE,translation_primitive_results_core:PRIMITIVE_RESULT_NATIVE_SOURCE,translation_owned_results_core:OWNED_RESULT_NATIVE_SOURCE},files={'src/lib.rs':'pub mod translation_core;\n'+Object.keys(modules).map(name=>'pub mod '+name+';').join('\n')+'\n// Ω😀 actual stage composition source\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE};for(const [name,source]of Object.entries(modules))files['src/'+name+'.rs']=source;return {entry:'src/lib.rs',files,dependencyInputs:{...cargo},compilationProfile:PRODUCTION_PROFILE};}

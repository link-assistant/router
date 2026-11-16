// Independent String builder carrier/branch return SOURCE. All cases UNRUN.
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
import {prepareTextBuilderCarrierReturnSources} from '../prepare-text-builder-carrier-return-sources.mjs';
import {createTextBranchTargetSource} from '../text-branch-target-source.mjs';
const limits={timeout:60000},root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')};
const bodies=`pub fn optional(value:&str)->Option<String>{let mut output=String::new();output.push_str(value);Some(output)}
pub fn success(value:&str)->Result<String,String>{let mut output=String::new();output.push_str(value);Ok(output)}
pub fn error(value:&str)->Result<String,String>{let mut output=String::new();output.push_str(value);Err(output)}
pub fn scalar_error(value:&str,flag:bool)->Result<u64,String>{let mut output=String::new();if flag{return Ok(7_u64);}output.push_str(value);Err(output)}
pub fn carrier_branch(value:&str,flag:bool)->Option<String>{let mut output=String::new();output.push_str(value);if flag{Some(output)}else{None}}
pub fn explicit(value:&str)->Result<String,String>{let mut output=String::new();output.push_str(value);return Ok(output);}
pub fn plain_branch(value:&str,flag:bool)->String{let mut output=String::new();output.push_str(value);if flag{output}else{output}}
pub fn mixed(value:&str)->Option<String>{let mut output=String::new();output.push_str(value);output+="tail";Some(output)}
pub fn else_if_error(value:&str,first:bool,second:bool)->Result<u64,String>{let mut output=String::new();output.push_str(value);if first{Err(output)}else if second{Ok(1_u64)}else{Ok(2_u64)}}
`;
for(const [label,propose]of [['ordinary text',ordinaryText],['source-bound text',boundText]])test(label+' retains single-local builder moves only at original explicitly owning return positions',limits,()=>{
 const request=input(),row=propose(request).proposals.find(row=>row.file==='src/lib.rs');assert.equal(row.edits.length,10);assert.equal(row.after.source.includes('.push_str('),false);assert.equal(row.after.source.includes('+='),false);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,row.before.source);assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,request.files['src/lib.rs']);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);assert.deepEqual(row.trace.map(stage=>stage.phase),['language','repository']);for(const selection of row.selections){assert.ok(['text-owned','option:text-owned','result:text','result:u64'].includes(selection.writtenReturnContext));assert.equal(selection.oldTraitDispatchProved,false);assert.equal(selection.oldDropTimingProved,false);assert.equal(selection.executableAdmission,false);}
});
test('nine complete builders retain independent JS strict TS owning success error option empty and exclusive branch behavior',limits,async()=>{
 const request=input(),proposal=await proposeSourceBoundOwnedCoreStage('text-methods',request),files=proposal.after,result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});await verifyTypedTargets(result,api=>{for(const value of ['','é😀','a\0b']){assert.deepEqual(api.optional(value),{$:'Some',field0:value});assert.deepEqual(api.success(value),{$:'Ok',field0:value});assert.deepEqual(api.error(value),{$:'Err',field0:value});assert.deepEqual(api.explicit(value),{$:'Ok',field0:value});assert.deepEqual(api.mixed(value),{$:'Some',field0:value+'tail'});for(const flag of [false,true]){assert.deepEqual(api.scalar_error(value,flag),flag?{$:'Ok',field0:7n}:{$:'Err',field0:value});assert.deepEqual(api.carrier_branch(value,flag),flag?{$:'Some',field0:value}:{$:'None'});assert.equal(api.plain_branch(value,flag),value);for(const second of [false,true])assert.deepEqual(api.else_if_error(value,flag,second),flag?{$:'Err',field0:value}:{$:'Ok',field0:second?1n:2n});}}},{childTimeoutMs:20000});
});
test('wrong constructors aliases copied receiver results borrowed targets and unknown carrier results retain original whole functions',limits,()=>{
 for(const body of ['pub fn wrong(value:&str)->Option<String>{let mut output=String::new();output.push_str(value);Ok(output)}','pub fn alias(value:&str)->Option<String>{let mut output=String::new();output.push_str(value);let moved=output;Some(moved)}','pub fn copied(value:&str)->Option<String>{let mut output=String::new();output.push_str(value);Some(output.clone())}','pub fn borrowed(value:&str)->Option<&str>{let mut output=String::new();output.push_str(value);Some(output.as_str())}','pub fn unknown(value:&str)->UnknownAlias{let mut output=String::new();output.push_str(value);Some(output)}']){const request=input(body),row=ordinaryText(request).proposals.find(row=>row.file==='src/lib.rs');assert.equal(row.edits.length,0,body);assert.equal(row.after.source,request.files['src/lib.rs']);}
});
test('source target work remains local to each instance and is observable only as work data',limits,()=>{
 const rows=rustTokens('{Some(output)}').filter(row=>row.type!=='comment'),close=(tokens,start)=>tokens[start]?.text==='{'?tokens.length-1:tokens[start]?.text==='('?tokens.length-2:-1,first=createTextBranchTargetSource(rows,{close}),second=createTextBranchTargetSource(rows,{close});assert.equal(first.sourceCells(),0);first.block(0,rows.length-1,'option:text-owned');assert.ok(first.sourceCells()>0);assert.equal(second.sourceCells(),0);const index=rows.findIndex(row=>row.text==='output');assert.equal(first.matches(rows[index].start,index+1),true);assert.equal(second.matches(rows[index].start,index+1),false);
});
test('three complete compiler equations retain original source owners ordered phases and whole inverses',limits,()=>{
 const plan=prepareTextBuilderCarrierReturnSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
function input(body=bodies){const modules={translation_json_fields_core:JSON_FIELDS_NATIVE_SOURCE,translation_text_core:TEXT_NATIVE_SOURCE,translation_primitive_option_core:PRIMITIVE_OPTION_NATIVE_SOURCE,translation_primitive_option_callbacks_core:PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE,translation_integer_core:INTEGER_NATIVE_SOURCE,translation_primitive_results_core:PRIMITIVE_RESULT_NATIVE_SOURCE,translation_owned_results_core:OWNED_RESULT_NATIVE_SOURCE},files={'src/lib.rs':'pub mod translation_core;\n'+Object.keys(modules).map(name=>'pub mod '+name+';').join('\n')+'\n// Ω😀 actual stage composition source\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE};for(const [name,source]of Object.entries(modules))files['src/'+name+'.rs']=source;return {entry:'src/lib.rs',files,dependencyInputs:{...cargo},compilationProfile:PRODUCTION_PROFILE};}

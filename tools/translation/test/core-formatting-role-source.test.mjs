// Independent canonical formatting source-role composition SOURCE. All UNRUN.
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
import {prepareCoreFormattingRoleSources} from '../prepare-core-formatting-role-sources.mjs';
const limits={timeout:60000},root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')},tokens=source=>rustTokens(source).filter(row=>row.type!=='comment'),some=field0=>({$:'Some',field0}),none={$:'None'},ok=field0=>({$:'Ok',field0}),err=field0=>({$:'Err',field0}),M='crate::translation_core::format!';
const optionBodies=`pub fn flag(value:Option<bool>,code:u64)->Result<bool,String>{value.ok_or_else(||crate::translation_core::format!("missing {}",code))}
pub fn count(value:Option<u64>,code:u64)->Result<u64,String>{value.ok_or_else(||crate::translation_core::format!("missing {}",code))}
pub fn owned(value:Option<String>,code:u64)->Result<String,String>{value.ok_or_else(||{let error=crate::translation_core::format!("missing {}",code);error})}
pub fn mapped(value:Option<u64>,code:u64)->Option<String>{value.map(|item|crate::translation_core::format!("present {} {}",item,code))}
pub fn chained(value:Option<u64>,code:u64)->Option<String>{value.and_then(|item|Some(crate::translation_core::format!("present {} {}",item,code)))}
pub fn local(value:Option<u64>,code:u64)->Result<u64,String>{let failed=crate::translation_core::format!("missing {}",code);value.ok_or_else(||failed.to_owned())}
`;
const resultBodies=`pub fn primitive_error(value:Result<u64,String>,code:u64)->Result<u64,String>{value.map_err(|error|crate::translation_core::format!("{} {}",error,code))}
`;
const ownedBodies=`pub fn owned_error(value:Result<String,String>,code:u64)->Result<String,String>{value.map_err(|error|crate::translation_core::format!("{} {}",error,code))}
`;
const bodies=optionBodies+resultBodies+ownedBodies;
test('general qualified macro syntax preserves complete native token trees without owning their grammar',limits,()=>{
 for(const source of ['crate::translation_core::format!("{}",value)','crate::translation_core::format![r#"Ω😀 {}"#,value,]','crate::translation_core::format!{"{}",[value,(other)]}']){const result=readQualifiedSourceMacroTokens(tokens(source));assert.deepEqual(result.path,['crate','translation_core','format']);assert.equal(result.macroOwnerProved,false);assert.equal(result.macroArgumentsChecked,false);assert.equal(result.semanticAuthority,false);assert.ok(result.body.length);}for(const source of ['format!("x")','crate::translation_core::format!("{}",value]','crate::translation_core::format!("x") extra','crate::translation_core::format("x")'])assert.equal(readQualifiedSourceMacroTokens(tokens(source)),null,source);
});
test('only exact canonical core format source supplies owning text DATA and leaves every real argument unchecked',limits,()=>{
 for(const source of [M+'("Ω😀")',M+'("missing {}",code)',M+'("{}",effect())',M+'("x",,)']){const result=readCoreFormattingMacroSource(tokens(source));assert.equal(result.kind,'payload');assert.equal(result.domain,'text-owned');assert.equal(result.macroOwnerProved,false);assert.equal(result.formatArgumentsChecked,false);assert.equal(result.semanticAuthority,false);assert.equal(result.executableAdmission,false);}for(const source of ['format!("x")','std::format!("x")','crate::other::format!("x")',M+'(concat!("x"))',M+'(b"x")',M+'()'])assert.equal(readCoreFormattingMacroSource(tokens(source)),null,source);
 const scope=new Map(),core=readCoreCarrierCallSource(tokens('crate::translation_primitive_option_core::text_owned_some('+M+'("Ω😀"))'),scope);assert.equal(core.kind,'option');assert.equal(core.domain,'text-owned');const encoded=new Map();assert.equal(readCarrierAliasOperand(tokens(M+'("Ω😀")'),encoded).domain,'text-owned');
});
for(const [label,propose,body,count]of [['ordinary Option',ordinaryCallback,optionBodies,6],['source-bound Option',boundCallback,optionBodies,6],['ordinary primitive Result',ordinaryResult,resultBodies,1],['source-bound primitive Result',boundResult,resultBodies,1],['ordinary owned Result',ordinaryOwned,ownedBodies,1],['source-bound owned Result',boundOwned,ownedBodies,1]])test(label+' retains complete formatted callback and local source through real adoption APIs',limits,()=>{
 const request=input(body),row=rejoin(propose(request),request.files['src/lib.rs']);assert.equal(row.edits.length,count);assert.ok(row.selections.every(row=>row.executableAdmission===false));assert.ok(row.after.source.includes(M));
});
test('all8 actual formatting callers receive JavaScript and strict TypeScript with branch and Unicode results',limits,async()=>{
 const request=input();let files=request.files;for(const stage of ['primitive-option-callback-methods','primitive-result-methods','owned-result-methods'])files=(await proposeSourceBoundOwnedCoreStage(stage,{...request,files})).after;const result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});await verifyTypedTargets(result,api=>{for(const [name,value]of [['flag',false],['count',0n],['owned','Ω😀'],['local',0n]]){assert.deepEqual(api[name](some(value),13n),ok(value));assert.deepEqual(api[name](none,13n),err('missing 13'));}for(const name of ['mapped','chained']){assert.deepEqual(api[name](some(7n),13n),some('present 7 13'));assert.deepEqual(api[name](none,13n),none);}assert.deepEqual(api.primitive_error(err('Ω😀'),13n),err('Ω😀 13'));assert.deepEqual(api.primitive_error(ok(0n),13n),ok(0n));assert.deepEqual(api.owned_error(err('Ω😀'),13n),err('Ω😀 13'));assert.deepEqual(api.owned_error(ok('kept'),13n),ok('kept'));},{childTimeoutMs:20000});
});
test('a formatted source role never admits an unknown actual argument call',limits,async()=>{
 const request=input('pub fn bad(value:Option<u64>)->Result<u64,String>{value.ok_or_else(||crate::translation_core::format!("{}",unknown()))}'),proposal=await proposeSourceBoundOwnedCoreStage('primitive-option-callback-methods',request),files=proposal.after;assert.ok(rejoin(proposal,request.files['src/lib.rs']).edits.length);const result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});assert.equal(result.meta.executable.some(row=>row.name==='bad'),false);
});
test('four complete compiler equations retain original ownership two phases and full source inverse histories',limits,()=>{
 const plan=prepareCoreFormattingRoleSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(row=>row.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
function input(body=bodies){const modules={translation_json_fields_core:JSON_FIELDS_NATIVE_SOURCE,translation_text_core:TEXT_NATIVE_SOURCE,translation_primitive_option_core:PRIMITIVE_OPTION_NATIVE_SOURCE,translation_primitive_option_callbacks_core:PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE,translation_integer_core:INTEGER_NATIVE_SOURCE,translation_primitive_results_core:PRIMITIVE_RESULT_NATIVE_SOURCE,translation_owned_results_core:OWNED_RESULT_NATIVE_SOURCE},files={'src/lib.rs':'pub mod translation_core;\n'+Object.keys(modules).map(name=>'pub mod '+name+';').join('\n')+'\n// Ω😀 actual stage composition source\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE};for(const [name,source]of Object.entries(modules))files['src/'+name+'.rs']=source;return {entry:'src/lib.rs',files,dependencyInputs:{...cargo},compilationProfile:PRODUCTION_PROFILE};}
function rejoin(proposal,source){const row=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,source);assert.deepEqual(row.trace.map(part=>part.phase),['language','repository']);assert.equal(proposal.executableAdmission,false);return row;}

// Independent exact core formatting macro composition SOURCE. All UNRUN.
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
import {applyLayeredCoreAdoptionSource} from '../layered-core-adoption-source.mjs';
import {applyLayeredCoreOrFormatAdoptionSource} from '../layered-core-format-adoption-source.mjs';
import {coreFormattingMacroSourceHeaders} from '../core-formatting-macro-source.mjs';
import {prepareLayeredFormatMacroSources} from '../prepare-layered-format-macro-sources.mjs';
const limits={timeout:60000},root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')},some=field0=>({$:'Some',field0}),none={$:'None'},ok=field0=>({$:'Ok',field0}),err=field0=>({$:'Err',field0}),format='crate::translation_core::format!';
const bodies=`pub fn numeric(value:u64,text:&str)->u64{let label=${format}("{}",text);value.saturating_add(2)}
pub fn textual(value:&str)->String{let label=${format}("{}",value);label.trim().to_owned()}
pub fn optional(value:Option<u64>,text:&str)->u64{let label=${format}("{}",text);value.unwrap_or_default()}
pub fn callback(value:Option<u64>,text:&str)->Option<u64>{let label=${format}("{}",text);value.map(|item|item.saturating_add(2))}
pub fn result(value:Result<u64,String>,text:&str)->Result<u64,String>{let label=${format}("{}",text);value.map(|item|item.saturating_add(2))}
pub fn owning(value:Result<String,String>,text:&str)->Result<String,String>{let label=${format}("{}",text);value.map(|item|item.trim().to_owned())}
`;
function inverse(row){let value=row.after.source;for(const edit of [...row.mapping].reverse())if(edit.kind==='substitution')value=value.slice(0,edit.after[0])+edit.expected+value.slice(edit.after[1]);assert.equal(value,row.before.source);assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,value);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);assert.deepEqual(row.trace.map(stage=>stage.phase),['language','repository']);return row;}
test('additive copied CST engine transports exact format! macros through separate general and repository rules and leaves the old lane intact',limits,()=>{
 const source='amount.to_string()',replacement=format+'("{}", amount)',edits=[{span:[0,source.length],expected:source,replacement}],settings={languageRule:'primitive-display:retain-original-evaluation',repositoryRule:'router-core:qualify-exact-format-interface',bindings:[{native:'crate::translation_core::',neutral:'::translation_compatibility_format::'}]},proposal=inverse(applyLayeredCoreOrFormatAdoptionSource(source,edits,settings));assert.equal(proposal.after.source,replacement);assert.equal(proposal.executableAdmission,false);assert.throws(()=>applyLayeredCoreAdoptionSource(source,edits,settings),/actual selected qualified compatibility call/u);
 for(const replacement of ['crate::translation_core::format_args!("{}", amount)','other::format!("{}", amount)','format!("{}", amount)'])assert.throws(()=>applyLayeredCoreOrFormatAdoptionSource(source,[{span:[0,source.length],expected:source,replacement}],settings),/actual selected qualified compatibility call/u);
});
test('macro headers retain only original bang positions and never skip source arguments',limits,()=>{
 const source=format+'("Ω😀 {}", '+format+'("{}", item))',rows=rustTokens(source).filter(row=>row.type!=='comment'),positions=coreFormattingMacroSourceHeaders(rows);assert.deepEqual([...positions],rows.filter(row=>row.text==='!'||row.type==='ident'&&row.text.endsWith('!')).map(row=>row.text==='!'?row.start:row.end-1));for(const source of ['format!("{}",item)','other::format!("{}",item)','crate::translation_core::format_args!("{}",item)','crate::translation_core::format!(item)','crate::translation_core::format!["{}",item]'])assert.equal(coreFormattingMacroSourceHeaders(rustTokens(source).filter(row=>row.type!=='comment')).size,0,source);
});
for(const [label,propose,name]of [['ordinary integer',ordinaryInteger,'numeric'],['source-bound integer',boundInteger,'numeric'],['ordinary text',ordinaryText,'textual'],['source-bound text',boundText,'textual'],['ordinary Option',ordinaryOption,'optional'],['source-bound Option',boundOption,'optional'],['ordinary callback',ordinaryCallback,'callback'],['source-bound callback',boundCallback,'callback'],['ordinary Result',ordinaryResult,'result'],['source-bound Result',boundResult,'result'],['ordinary owning Result',ordinaryOwned,'owning'],['source-bound owning Result',boundOwned,'owning']])test(label+' retains actual core formatting alongside independent source substitutions',limits,()=>{
 const request=input(bodies),proposal=propose(request),row=inverse(proposal.proposals.find(row=>row.file==='src/lib.rs'));assert.ok(row.selections.some(row=>row.function===name),label);assert.ok(row.after.source.includes(format+'("{}",'));assert.equal(proposal.executableAdmission,false);
});
test('all six core families independently receive JavaScript and strict TypeScript with original formatting operands retained',limits,async()=>{
 const request=input();let files=request.files;for(const stage of ['integer-methods','text-methods','primitive-option-methods','primitive-option-callback-methods','primitive-result-methods','owned-result-methods'])files=(await proposeSourceBoundOwnedCoreStage(stage,{...request,files})).after;const result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});await verifyTypedTargets(result,api=>{assert.equal(api.numeric(18446744073709551615n,'Ω😀'),18446744073709551615n);assert.equal(api.textual(' é😀 '),'é😀');assert.equal(api.optional(none,'Ω😀'),0n);assert.deepEqual(api.callback(some(0n),'Ω😀'),some(2n));assert.deepEqual(api.callback(none,'Ω😀'),none);assert.deepEqual(api.result(ok(0n),'Ω😀'),ok(2n));assert.deepEqual(api.result(err('error'),'Ω😀'),err('error'));assert.deepEqual(api.owning(ok(' é😀 '),'Ω😀'),ok('é😀'));assert.deepEqual(api.owning(err('error'),'Ω😀'),err('error'));},{childTimeoutMs:20000});
});
test('unknown producers inside original macro arguments retain source refusals',limits,()=>{
 for(const argument of ['unknown!()','{type Hidden=u64;0_u64}']){const request=input('pub fn value(amount:u64)->u64{let label='+format+'("{}",'+argument+');amount.saturating_add(2)}'),proposal=ordinaryInteger(request),row=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.equal(row.edits.length,0);assert.equal(row.after.source,request.files['src/lib.rs']);}
});
test('twenty-five full source equations retain whole originals native source owners full two-phase inverses and old exports',limits,()=>{
 const plan=prepareLayeredFormatMacroSources();assert.equal(plan.files.length,25);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}const engine=plan.files.find(row=>row.path==='tools/translation/layered-core-format-adoption-source.mjs');assert.ok(engine.before.includes('export function applyLayeredCoreAdoptionSource'));assert.ok(engine.after.includes('export function applyLayeredCoreOrFormatAdoptionSource'));assert.equal(plan.receivingExecuted,false);
});
function input(body=bodies){const modules={translation_json_fields_core:JSON_FIELDS_NATIVE_SOURCE,translation_text_core:TEXT_NATIVE_SOURCE,translation_primitive_option_core:PRIMITIVE_OPTION_NATIVE_SOURCE,translation_primitive_option_callbacks_core:PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE,translation_integer_core:INTEGER_NATIVE_SOURCE,translation_primitive_results_core:PRIMITIVE_RESULT_NATIVE_SOURCE,translation_owned_results_core:OWNED_RESULT_NATIVE_SOURCE},files={'src/lib.rs':'pub mod translation_core;\n'+Object.keys(modules).map(name=>'pub mod '+name+';').join('\n')+'\n// Ω😀 actual stage composition source\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE};for(const [name,source]of Object.entries(modules))files['src/'+name+'.rs']=source;return {entry:'src/lib.rs',files,dependencyInputs:{...cargo},compilationProfile:PRODUCTION_PROFILE};}
function rejoin(proposal,source){const row=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,source);assert.deepEqual(row.trace.map(part=>part.phase),['language','repository']);assert.equal(proposal.executableAdmission,false);return row;}

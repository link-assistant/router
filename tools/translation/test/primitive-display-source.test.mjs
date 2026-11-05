// Independent primitive Display source substitution SOURCE. All UNRUN.
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
import {preparePrimitiveDisplaySources} from '../prepare-primitive-display-sources.mjs';
const limits={timeout:60000},root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')},some=field0=>({$:'Some',field0}),none={$:'None'},ok=field0=>({$:'Ok',field0}),err=field0=>({$:'Err',field0}),format='crate::translation_core::format!',domains=['u8','u16','u32','u64','u128','i8','i16','i32','i64','i128'];
const scalarBodies=domains.map(domain=>'pub fn display_'+domain+'(value:'+domain+')->String{value.to_string()}').join('
')+`
pub fn display_bool(value:bool)->String{value.to_string()}
pub fn literal()->String{42_u32.to_string()}
pub fn bool_literal()->String{true.to_string()}
pub fn chain(value:u64)->String{value.saturating_add(2).wrapping_mul(3).to_string()}
pub fn alias(value:u64)->String{let selected=value;selected.to_string()}
pub fn bool_alias(value:bool)->String{let selected=value;selected.to_string()}
`;
const callbackBodies=`pub fn optional(value:Option<u64>)->Option<String>{value.map(|item|item.to_string())}
pub fn boolean(value:Option<bool>)->Option<String>{value.map(|item|item.to_string())}
pub fn mapped(value:Result<u64,String>)->Result<String,String>{value.map(|item|item.saturating_add(2).to_string())}
`;
const bodies=scalarBodies+callbackBodies;
function inverse(row){let source=row.after.source;for(const edit of [...row.mapping].reverse())if(edit.kind==='substitution')source=source.slice(0,edit.after[0])+edit.expected+source.slice(edit.after[1]);assert.equal(source,row.before.source);assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);assert.deepEqual(row.trace.map(stage=>stage.phase),['language','repository']);return row;}
for(const [name,propose]of [['ordinary',ordinaryInteger],['source-bound',boundInteger]])test(name+' integer source API handles all ten widths bool literals locals and terminal Display chains',limits,()=>{
 const request=input(scalarBodies),proposal=propose(request),row=inverse(proposal.proposals.find(row=>row.file==='src/lib.rs'));assert.equal(row.edits.length,16);for(const selection of row.selections){assert.equal(selection.method,'to_string');assert.equal(selection.operation,'primitive-display:'+selection.domain);assert.equal(selection.oldTraitDispatchProved,false);assert.equal(selection.sourceAuthority,false);assert.equal(selection.semanticAuthority,false);assert.equal(selection.executableAdmission,false);}const chain=row.selections.find(row=>row.function==='chain');assert.deepEqual(chain.methods,['saturating_add','wrapping_mul','to_string']);assert.ok(row.after.source.includes(format+'("{}", 42_u32)'));
});
test('terminal Display participates in the complete64-link chain bound without partial function edits',limits,()=>{
 const request=input('pub fn bounded(value:u64)->String{let prior=value.saturating_add(1);value'+'.saturating_add(1)'.repeat(64)+'.to_string()}'),proposal=ordinaryInteger(request),row=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.equal(row.edits.length,0);assert.equal(row.after.source,request.files['src/lib.rs']);assert.ok(row.preserved.some(row=>/exceeds64 links/u.test(row.reason)));
});
test('untyped numerals floats unknown nominal inputs and primitive type shadows retain refusals',limits,()=>{
 for(const body of ['pub fn unknown()->String{42.to_string()}','pub fn float(value:f64)->String{value.to_string()}','pub struct Record;pub fn nominal(value:Record)->String{value.to_string()}','pub struct bool;pub fn shadow(value:bool)->String{value.to_string()}','pub struct u32;pub fn shadow(value:u32)->String{value.to_string()}']){const request=input(body),proposal=ordinaryInteger(request),row=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.equal(row.edits.length,0,body);assert.equal(row.after.source,request.files['src/lib.rs']);}
});
test('a generated canonical formatting receiver composes with the original text engine in a later source stage',limits,()=>{
 const request=input('pub fn text(value:u64)->String{value.saturating_add(2).to_string().trim().to_owned()}'),first=ordinaryInteger(request),second=ordinaryText({...request,files:first.after}),row=inverse(second.proposals.find(row=>row.file==='src/lib.rs'));assert.equal(row.edits.length,1);assert.ok(row.after.source.includes('crate::translation_text_core::trim('));assert.ok(row.after.source.includes(format+'("{}",'));
});
test('existing Option and owning Result callback families reuse primitive formatting without a new runtime ABI',limits,()=>{
 for(const [label,propose,count]of [['ordinary Option',ordinaryCallback,2],['source-bound Option',boundCallback,2],['ordinary owning Result',ordinaryOwned,1],['source-bound owning Result',boundOwned,1]]){const request=input(callbackBodies),row=inverse(propose(request).proposals.find(row=>row.file==='src/lib.rs'));assert.equal(row.edits.length,count,label);for(const selection of row.selections){assert.equal(selection.executableAdmission,false);for(const child of selection.callbackTextSourceHistories){inverse(child);assert.equal(child.functionOwnerProved,false);assert.equal(child.sourceAuthority,false);}}}
});
test('all nineteen actual scalar and callback callers receive checked JavaScript and strict TypeScript',limits,async()=>{
 const request=input();let files=request.files;for(const stage of ['integer-methods','primitive-option-callback-methods','owned-result-methods'])files=(await proposeSourceBoundOwnedCoreStage(stage,{...request,files})).after;const result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});await verifyTypedTargets(result,api=>{for(const domain of domains){assert.equal(api['display_'+domain](0n),'0');const bits=BigInt(domain.slice(1)),signed=domain[0]==='i',maximum=(1n<<(bits-(signed?1n:0n)))-1n;assert.equal(api['display_'+domain](maximum),maximum.toString());if(signed){const minimum=-(1n<<(bits-1n));assert.equal(api['display_'+domain](minimum),minimum.toString());}}assert.equal(api.display_bool(true),'true');assert.equal(api.display_bool(false),'false');assert.equal(api.literal(),'42');assert.equal(api.bool_literal(),'true');assert.equal(api.chain(0n),'6');assert.equal(api.chain(18446744073709551615n),'18446744073709551613');assert.equal(api.alias(0n),'0');assert.equal(api.bool_alias(false),'false');assert.deepEqual(api.optional(some(0n)),some('0'));assert.deepEqual(api.optional(none),none);assert.deepEqual(api.boolean(some(false)),some('false'));assert.deepEqual(api.boolean(none),none);assert.deepEqual(api.mapped(ok(0n)),ok('2'));assert.deepEqual(api.mapped(err('Ω😀')),err('Ω😀'));},{childTimeoutMs:20000});
});
test('seventeen complete source equations retain full originals owner selections both phases and exact source inverses',limits,()=>{
 const plan=preparePrimitiveDisplaySources();assert.equal(plan.files.length,17);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
function input(body=bodies){const modules={translation_json_fields_core:JSON_FIELDS_NATIVE_SOURCE,translation_text_core:TEXT_NATIVE_SOURCE,translation_primitive_option_core:PRIMITIVE_OPTION_NATIVE_SOURCE,translation_primitive_option_callbacks_core:PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE,translation_integer_core:INTEGER_NATIVE_SOURCE,translation_primitive_results_core:PRIMITIVE_RESULT_NATIVE_SOURCE,translation_owned_results_core:OWNED_RESULT_NATIVE_SOURCE},files={'src/lib.rs':'pub mod translation_core;\n'+Object.keys(modules).map(name=>'pub mod '+name+';').join('\n')+'\n// Ω😀 actual stage composition source\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE};for(const [name,source]of Object.entries(modules))files['src/'+name+'.rs']=source;return {entry:'src/lib.rs',files,dependencyInputs:{...cargo},compilationProfile:PRODUCTION_PROFILE};}
function rejoin(proposal,source){const row=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,source);assert.deepEqual(row.trace.map(part=>part.phase),['language','repository']);assert.equal(proposal.executableAdmission,false);return row;}

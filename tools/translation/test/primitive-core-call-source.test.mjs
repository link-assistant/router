// Independent scalar core-call to integer composition SOURCE. All UNRUN.
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
import {preparePrimitiveCoreCallSources} from '../prepare-primitive-core-call-sources.mjs';
const limits={timeout:60000},root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')},T='crate::translation_core::Json',F='crate::translation_json_fields_core::',tokens=source=>rustTokens(source).filter(row=>row.type!=='comment'),some=field0=>({$:'Some',field0}),none={$:'None'};
const bodies=`pub fn inline(value:&${T})->u64{${F}json_u64_field_or(value,"count",0_u64).saturating_add(2)}
pub fn local(value:&${T})->u64{let count=${F}json_u64_field_or(value,"count",0_u64);count.saturating_add(2)}
pub fn length(value:&str)->u64{crate::translation_text_core::len_utf8(value).saturating_add(2)}
pub fn option(value:Option<u64>)->u64{crate::translation_primitive_option_core::u64_unwrap_or(value,0_u64).saturating_add(2)}
`;
test('closed written parameter roles and current scalar library calls remain source DATA only',limits,()=>{
 for(const [source,wanted]of [['u64','u64'],['String','text-owned'],['&str','str'],['&'+T,'json-reference'],[T,'json-owned'],['Option<u64>','option:u64'],['Result<u64,String>','result:u64']])assert.equal(readPrimitiveCoreParameterSourceRole(tokens(source)),wanted);const bindings=new Map([['value','json-reference'],['text','str'],['option','option:u64']]);for(const source of [F+'json_u64_field_or(value,"count",0_u64)','crate::translation_text_core::len_utf8(text)','crate::translation_primitive_option_core::u64_unwrap_or(option,0_u64)']){const result=readPrimitiveCoreCallSource(tokens(source),bindings);assert.equal(result.kind,'u64');assert.equal(result.semanticAuthority,false);assert.equal(result.executableAdmission,false);}for(const source of [F+'json_str_field_or_empty(value,"count")',F+'json_u64_field_or(text,"count",0_u64)','crate::translation_text_core::len_utf8(value)','crate::translation_primitive_option_core::u64_unwrap_or(option,0_i64)','crate::translation_text_core::len_utf8(unknown())'])assert.equal(readPrimitiveCoreCallSource(tokens(source),bindings),null,source);
});
for(const [label,propose]of [['ordinary integer',ordinaryInteger],['source-bound integer',boundInteger]])test(label+' selects all4 current scalar helper receivers and local roles with complete source inverses',limits,()=>{
 const request=input(bodies),row=rejoin(propose(request),request.files['src/lib.rs']);assert.equal(row.edits.length,4);assert.ok(row.selections.every(row=>row.operation==='u64_saturating_add'&&row.executableAdmission===false));assert.ok(row.selections.some(row=>row.localReceiverSource));
});
test('whole fixed-point stage sequence revisits integer lowering after original JSON getter adoption and receives JS strict TS',limits,async()=>{
 const original=`pub fn getter(value:&${T})->u64{let count=value.get("count").and_then(${T}::as_u64).unwrap_or_default();count.saturating_add(2)}`;const request=input(original),result=await collectSourceBoundOwnedCoreFixedPoint({...request,stages:['integer-methods','json-fields']}),files=result.files;assert.equal(result.receipt.stabilized,true);assert.ok(result.stages.some(row=>row.round>0&&row.stage==='integer-methods'&&row.changedFiles.length));const translated=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});await verifyTypedTargets(translated,api=>{assert.equal(api.getter(object([['count',unsigned(18446744073709551615n)]])),18446744073709551615n);assert.equal(api.getter(object([['count',unsigned(5n)]])),7n);assert.equal(api.getter(nil()),2n);},{childTimeoutMs:20000});
});
test('actual current helper-to-integer callers emit JavaScript and strict TypeScript independently',limits,async()=>{
 const request=input(bodies),proposal=await proposeSourceBoundOwnedCoreStage('integer-methods',request),files=proposal.after,result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});await verifyTypedTargets(result,api=>{for(const name of ['inline','local']){assert.equal(api[name](object([['count',unsigned(18446744073709551615n)]])),18446744073709551615n);assert.equal(api[name](nil()),2n);}assert.equal(api.length('é😀'),8n);assert.equal(api.option(some(5n)),7n);assert.equal(api.option(none),2n);},{childTimeoutMs:20000});
});
test('four complete compiler equations retain two rule phases and exact original full source inverses',limits,()=>{
 const plan=preparePrimitiveCoreCallSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(row=>row.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
function input(body=bodies){const modules={translation_json_fields_core:JSON_FIELDS_NATIVE_SOURCE,translation_text_core:TEXT_NATIVE_SOURCE,translation_primitive_option_core:PRIMITIVE_OPTION_NATIVE_SOURCE,translation_primitive_option_callbacks_core:PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE,translation_integer_core:INTEGER_NATIVE_SOURCE},files={'src/lib.rs':'pub mod translation_core;\n'+Object.keys(modules).map(name=>'pub mod '+name+';').join('\n')+'\n// Ω😀 actual stage composition source\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE};for(const [name,source]of Object.entries(modules))files['src/'+name+'.rs']=source;return {entry:'src/lib.rs',files,dependencyInputs:{...cargo},compilationProfile:PRODUCTION_PROFILE};}
function rejoin(proposal,source){const row=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,source);assert.deepEqual(row.trace.map(part=>part.phase),['language','repository']);assert.equal(proposal.executableAdmission,false);return row;}

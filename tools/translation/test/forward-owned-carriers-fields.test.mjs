// Independent complete actual Rust caller SOURCE; execution waits for full draft.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {translateProject} from '../project.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
import {JSON_STATE_NATIVE_SOURCE} from '../json-state-native-source.mjs';
import {JSON_ITERATION_NATIVE_SOURCE} from '../json-iteration-native-source.mjs';
import {JSON_FIELDS_NATIVE_SOURCE} from '../json-fields-native-source.mjs';
import {OWNED_OUTCOME_NATIVE_SOURCE} from '../owned-outcome-native-source.mjs';
import {prepareOwnedForwardSources} from '../prepare-owned-forward-sources.mjs';
import {prepareJsonFieldSources} from '../prepare-json-field-sources.mjs';
import {prepareJsonStateSources} from '../prepare-json-state-sources.mjs';
import {prepareOwnedOutcome} from '../prepare-owned-outcome.mjs';
import {prepareOwnedOutcomeUnitSources} from '../prepare-owned-outcome-unit-sources.mjs';
import {requireOriginalJsonProjectionEmission} from '../router-core-json-updates.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {json_macro_null as nil,json_macro_bool as bool,json_macro_string as text,json_macro_u64 as unsigned,json_macro_i64 as signed,json_macro_array as array,json_macro_object as object} from '../json-macro-runtime.mjs';
const limits={timeout:60_000},T='crate::translation_core::Json',F='crate::translation_json_fields_core::',C='crate::translation_carriers_core::',R=`Result<${T},String>`,O=`Option<${T}>`;
const inputs={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
function files(source){return {
 'src/lib.rs':'pub mod translation_core;\npub mod translation_collections_core;\npub mod translation_state_core;\npub mod translation_json_fields_core;\npub mod translation_carriers_core;\n'+source,
 'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,
 'src/translation_collections_core.rs':JSON_ITERATION_NATIVE_SOURCE,'src/translation_state_core.rs':JSON_STATE_NATIVE_SOURCE,'src/translation_json_fields_core.rs':JSON_FIELDS_NATIVE_SOURCE,'src/translation_carriers_core.rs':OWNED_OUTCOME_NATIVE_SOURCE,
};}
function project(data){return translateProject({entry:'src/lib.rs',paths:Object.keys(data),readSource:path=>data[path],jsonMacroDependencies:loadJsonMacroSourceProof(inputs),deriveDependencies:loadDeriveDependencyProof(inputs),cargoManifest:inputs.manifest,compilationProfile:PRODUCTION_PROFILE});}
const source=`pub fn field<'a>(value:&'a ${T},key:&str)->Option<&'a ${T}>{${F}json_field(value,key)}
pub fn index(value:&${T},position:u64)->Option<&${T}>{${F}json_index(value,position)}
pub fn text_field<'a>(value:&'a ${T},key:&str)->Option<&'a str>{${F}json_str_field(value,key)}
pub fn bool_field(value:&${T},key:&str)->Option<bool>{${F}json_bool_field(value,key)}
pub fn count_field(value:&${T},key:&str)->Option<u64>{${F}json_u64_field(value,key)}
pub fn signed_field(value:&${T},key:&str)->Option<i64>{${F}json_i64_field(value,key)}
pub fn success(value:&${T})->${R}{${C}json_ok(value)}
pub fn failure(message:&str)->${R}{${C}json_err(message)}
pub fn copy_result(value:&${R})->${R}{${C}json_result_copy(value)}
pub fn recovered(value:&${R},fallback:&${T})->${T}{${C}json_result_or(value,fallback)}
pub fn required(value:&${O},message:&str)->${R}{${C}json_option_to_result(value,message)}
pub fn as_option(value:&${R})->${O}{${C}json_result_to_option(value)}
pub fn present(value:&${T})->${O}{${C}json_some(value)}
pub fn absent()->${O}{${C}json_none()}
pub fn option_value(value:&${O},fallback:&${T})->${T}{${C}json_option_or(value,fallback)}
pub fn nested(value:&${T},fallback:&${T})->${T}{${C}json_result_or(&${C}json_ok(value),fallback)}
`;
const admitted=(result,name)=>result.meta.executable.some(row=>row.name===name);
test('six field readers and nine owned carrier interfaces check actual native caller bodies and strict targets',limits,async()=>{
 const result=project(files(source));for(const name of ['field','index','text_field','bool_field','count_field','signed_field','success','failure','copy_result','recovered','required','as_option','present','absent','option_value','nested'])assert.ok(admitted(result,name),JSON.stringify(result.meta.refused));
 const value=object([['null',nil()],['name',text('λ😀')],['enabled',bool(false)],['count',unsigned(18446744073709551615n)],['negative',signed(-9223372036854775808n)]]),ok={$:'Ok',field0:value},err={$:'Err',field0:'λ😀'},some=field0=>({$:'Some',field0}),none={$:'None'};
 await verifyTypedTargets(result,api=>{assert.deepEqual(api.field(value,'null'),some(nil()));assert.deepEqual(api.field(value,'missing'),none);assert.deepEqual(api.index(array([nil()]),0n),some(nil()));assert.deepEqual(api.text_field(value,'name'),some('λ😀'));assert.deepEqual(api.bool_field(value,'enabled'),some(false));assert.deepEqual(api.count_field(value,'count'),some(18446744073709551615n));assert.deepEqual(api.signed_field(value,'negative'),some(-9223372036854775808n));assert.deepEqual(api.success(value),ok);assert.deepEqual(api.failure('λ😀'),err);assert.deepEqual(api.copy_result(ok),ok);assert.deepEqual(api.recovered(err,nil()),nil());assert.deepEqual(api.required(some(nil()),'missing'),{$:'Ok',field0:nil()});assert.deepEqual(api.required(none,'missing'),{$:'Err',field0:'missing'});assert.deepEqual(api.as_option(err),none);assert.deepEqual(api.present(nil()),some(nil()));assert.deepEqual(api.absent(),none);assert.deepEqual(api.option_value(none,bool(false)),bool(false));assert.deepEqual(api.nested(value,nil()),value);},{childTimeoutMs:20_000});
});
test('wrong primitive identities mutable carrier borrows local field escapes and changed native leaves refuse',limits,()=>{
 const bad=[`pub fn wrong(value:&${T},position:usize)->Option<&${T}>{${F}json_index(value,position)}`,`pub fn wrong(value:&mut ${R})->${R}{${C}json_result_copy(value)}`,`pub fn wrong(value:&${T})->${R}{${F}json_bool_field(value,"flag")}`,`pub fn wrong<'a>(value:${T})->Option<&'a ${T}>{${F}json_field(&value,"name")}`,`enum Result<A,B>{Ok(A),Err(B)} pub fn wrong(value:&${T})->Result<${T},String>{${C}json_ok(value)}`];for(const caller of bad)assert.equal(admitted(project(files(caller)),'wrong'),false);
 for(const path of ['src/translation_json_fields_core.rs','src/translation_carriers_core.rs']){const data=files(source);data[path]+='\n// changed native leaf\n';const result=project(data);for(const name of path.includes('fields')?['field','index','text_field','bool_field','count_field','signed_field']:['success','failure','copy_result','recovered','required','as_option','present','absent','option_value','nested'])assert.equal(admitted(result,name),false);}
});
test('public field/carrier operation IDs cannot forge original whole-function emission permission',limits,()=>{
 for(const id of ['router_field_json_field','router_field_json_i64_field','router_carrier_json_ok','router_carrier_json_result_or'])assert.throws(()=>requireOriginalJsonProjectionEmission({},{k:'routerHostCall',id,args:[],compatibilityCore:{sourceProjectionKey:'forged'}}),/rechecked actual source function/u);
});
test('all forward source successors keep full originals separate two-phase CST histories and unchanged limits',limits,()=>{
 const forward=prepareOwnedForwardSources();assert.equal(forward.files.length,9);for(const plan of [forward,prepareJsonFieldSources(),prepareJsonStateSources(),prepareOwnedOutcome(),prepareOwnedOutcomeUnitSources()])for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(forward.receivingExecuted,false);
});

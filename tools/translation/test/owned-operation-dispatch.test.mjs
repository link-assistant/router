// Independent actual namespace collision regression SOURCE. Unrun during drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {forwardOwnedContract} from '../owned-forward-contracts.mjs';
import {translateProject} from '../project.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
import {TEXT_NATIVE_SOURCE} from '../text-native-source.mjs';
import {PRIMITIVE_OPTION_NATIVE_SOURCE} from '../primitive-option-native-source.mjs';
import {PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE} from '../primitive-option-callback-native-source.mjs';
import {PRIMITIVE_RESULT_NATIVE_SOURCE} from '../primitive-result-native-source.mjs';
import {prepareOwnedOperationDispatchSources} from '../prepare-owned-operation-dispatch-sources.mjs';
import {verifyTypedTargets} from './text-typed-targets.mjs';
const limits={timeout:60000},inputs={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
const source=`pub fn optional(value:Option<u64>)->u64{crate::translation_primitive_option_callbacks_core::u64_unwrap_or_else(value,||0_u64)}
pub fn outcome(value:Result<u64,String>)->u64{crate::translation_primitive_results_core::u64_unwrap_or_else(value,|error|18446744073709551615_u64)}
`;
function project(caller=source){const files={'src/lib.rs':'pub mod translation_core;\npub mod translation_text_core;\npub mod translation_primitive_option_core;\npub mod translation_primitive_option_callbacks_core;\npub mod translation_primitive_results_core;\n'+caller,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_text_core.rs':TEXT_NATIVE_SOURCE,'src/translation_primitive_option_core.rs':PRIMITIVE_OPTION_NATIVE_SOURCE,'src/translation_primitive_option_callbacks_core.rs':PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE,'src/translation_primitive_results_core.rs':PRIMITIVE_RESULT_NATIVE_SOURCE};return translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path],jsonMacroDependencies:loadJsonMacroSourceProof(inputs),deriveDependencies:loadDeriveDependencyProof(inputs),cargoManifest:inputs.manifest,compilationProfile:PRODUCTION_PROFILE});}
test('same-spelled Rust methods are selected by actual module and unique checked operation ID',limits,()=>{
 assert.equal(forwardOwnedContract('u64_unwrap_or_else'),null);const optional=forwardOwnedContract('u64_unwrap_or_else',{rustModule:'translation_primitive_option_callbacks_core'}),result=forwardOwnedContract('u64_unwrap_or_else',{rustModule:'translation_primitive_results_core'});assert.equal(optional.javascriptName,'router_option_callback_u64_unwrap_or_else');assert.equal(result.javascriptName,'router_result_u64_unwrap_or_else');assert.equal(forwardOwnedContract(optional.javascriptName),optional);assert.equal(forwardOwnedContract(result.javascriptName),result);assert.equal(forwardOwnedContract(optional.javascriptName,{rustModule:result.rustModule}),null);assert.equal(forwardOwnedContract('u64_unwrap_or_else',{rustModule:'unknown'}),null);
});
test('actual Option and Result lazy callers coexist in one fresh project and strict typed target',limits,async()=>{
 const result=project();for(const name of ['optional','outcome'])assert.ok(result.meta.executable.some(row=>row.name===name),JSON.stringify(result.meta.refused));await verifyTypedTargets(result,api=>{assert.equal(api.optional({$:'None'}),0n);assert.equal(api.optional({$:'Some',field0:7n}),7n);assert.equal(api.outcome({$:'Err',field0:''}),18446744073709551615n);assert.equal(api.outcome({$:'Ok',field0:0n}),0n);},{childTimeoutMs:20000});
});
test('a real different native module cannot receive a method through a same-spelled catalog row',limits,()=>{const result=project('pub fn wrong(value:Result<u64,String>)->u64{crate::translation_primitive_option_callbacks_core::u64_unwrap_or_else(value,|error|0_u64)}');assert.equal(result.meta.executable.some(row=>row.name==='wrong'),false);});
test('all three complete original source integrations retain both ordered stages and exact inverses',limits,()=>{const plan=prepareOwnedOperationDispatchSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});

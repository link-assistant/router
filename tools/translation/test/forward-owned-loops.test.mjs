// Independent actual Rust loop caller SOURCE. Unrun during bulk drafting.
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
import {json_macro_array as array,json_macro_string as text,json_macro_null as nil} from '../json-macro-runtime.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {prepareOwnedForwardLoopSources} from '../prepare-owned-forward-loop-sources.mjs';
import {requireOriginalJsonProjectionEmission} from '../router-core-json-updates.mjs';
const limits={timeout:60000},J='crate::translation_core::Json',C='crate::translation_core::',S='crate::translation_state_core::',inputs={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
const caller=`pub fn while_appended(seed:&${J},value:&${J},count:u64)->${J}{let mut output=${C}json_copy(seed);let mut index=0_u64;while index<count{index+=1_u64;if index==2_u64{continue;}output=${S}json_append(output,${C}json_copy(value));if index>=4_u64{break;}}output}
pub fn range_appended(seed:&${J},value:&${J},count:u64)->${J}{let mut output=${C}json_copy(seed);for index in 0_u64..count{if index==1_u64{continue;}output=${S}json_append(output,${C}json_copy(value));if index>=3_u64{break;}}output}
pub fn from_slice(seed:&${J},values:&[${J}])->${J}{let mut output=${C}json_copy(seed);for item in values.iter(){output=${S}json_append(output,${C}json_copy(item));}output}
pub fn after_borrow(values:&[${J}])->${J}{let copied=${S}json_values_copy(values);for item in copied.iter(){let unused=${C}json_copy(item);}${S}json_from_values(copied)}
pub fn nested(seed:&${J},value:&${J})->${J}{let mut output=${C}json_copy(seed);for outer in 0_u64..2_u64{for inner in 0_u64..2_u64{if inner==0_u64{continue;}output=${S}json_append(output,${C}json_copy(value));}if outer==0_u64{continue;}}output}
pub fn early(seed:&${J},value:&${J},run:bool)->${J}{while run{return ${C}json_copy(value);}${C}json_copy(seed)}
pub fn move_once(seed:&${J},values:Vec<${J}>,run:bool)->${J}{while run{let moved=${S}json_from_values(values);break;}${C}json_copy(seed)}
`;
function project(source=caller,changes={}){const files={'src/lib.rs':'pub mod translation_core;\npub mod translation_collections_core;\npub mod translation_state_core;\n'+source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_collections_core.rs':JSON_ITERATION_NATIVE_SOURCE,'src/translation_state_core.rs':JSON_STATE_NATIVE_SOURCE,...changes};return translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path],jsonMacroDependencies:loadJsonMacroSourceProof(inputs),deriveDependencies:loadDeriveDependencyProof(inputs),cargoManifest:inputs.manifest,compilationProfile:PRODUCTION_PROFILE});}
test('while range slice Vec-borrow nested exits and scalar updates retain independent JS and strict TS behavior',limits,async()=>{const result=project();for(const name of ['while_appended','range_appended','from_slice','after_borrow','nested','early','move_once'])assert.ok(result.meta.executable.some(row=>row.name===name),JSON.stringify(result.meta.refused));await verifyTypedTargets(result,api=>{const empty=array([]),value=text('é😀'),values=Object.freeze([nil(),value]);for(const [count,expected]of [[0n,0],[1n,1],[2n,1],[3n,2],[4n,3],[5n,3]])for(const name of ['while_appended','range_appended'])assert.deepEqual(api[name](empty,value,count),array(Array(expected).fill(value)));assert.deepEqual(api.from_slice(empty,values),array([nil(),value]));assert.deepEqual(api.after_borrow(values),array([nil(),value]));assert.deepEqual(api.nested(empty,value),array([value,value]));assert.deepEqual(api.early(empty,value,false),empty);assert.deepEqual(api.early(empty,value,true),value);assert.deepEqual(api.move_once(empty,values,false),empty);assert.deepEqual(api.move_once(empty,values,true),empty);},{childTimeoutMs:20000});});
test('backedges live iterator loans local borrow escape and loop boundaries cannot conceal invalid native moves',limits,()=>{for(const source of [
 `pub fn wrong(seed:&${J},values:Vec<${J}>,run:bool)->${J}{while run{let moved=${S}json_from_values(values);}${C}json_copy(seed)}`,
 `pub fn wrong(seed:&${J},values:&[${J}])->${J}{let copied=${S}json_values_copy(values);for item in copied.iter(){let moved=${S}json_from_values(copied);let unused=${C}json_copy(item);}${C}json_copy(seed)}`,
 `pub fn wrong<'a>(values:Vec<${J}>,fallback:&'a ${J})->&'a ${J}{for item in values.iter(){return item;}${C}json_index_str(fallback,"key")}`,
 `pub fn wrong(seed:&${J})->${J}{break;${C}json_copy(seed)}`,
 `pub fn wrong(seed:&${J},run:bool)->${J}{while run{break;unknown_source_call();}${C}json_copy(seed)}`,
 `pub fn wrong(seed:&${J},run:bool)->${J}{let mut count=0_u64;while run{count=0_usize;}${C}json_copy(seed)}`,
 ])assert.equal(project(source).meta.executable.some(row=>row.name==='wrong'),false);assert.equal(project(caller,{'src/translation_state_core.rs':JSON_STATE_NATIVE_SOURCE+'\n// changed\n'}).meta.executable.some(row=>row.name==='while_appended'),false);assert.throws(()=>requireOriginalJsonProjectionEmission({},{k:'routerWhile',cond:{k:'lit',value:true},loopBody:{k:'unit'},body:{k:'unit'}}),/rechecked actual source function/u);});
test('loop source integration keeps original bodies both ordered phases and complete inverse',limits,()=>{const plan=prepareOwnedForwardLoopSources();for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});

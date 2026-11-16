// Independent actual Rust caller source; no execution during bulk drafting.
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
import {verifyTypedTargets} from './typed-targets.mjs';
import {json_macro_null as nil,json_macro_bool as bool,json_macro_string as text,json_macro_array as array,json_macro_object as object} from '../json-macro-runtime.mjs';
import {requireOriginalJsonProjectionEmission} from '../router-core-json-updates.mjs';
const limits={timeout:60_000},T='crate::translation_core::Json',C='crate::translation_core::',S='crate::translation_state_core::';
const inputs={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
function files(source){return {'src/lib.rs':'pub mod translation_core;\npub mod translation_collections_core;\npub mod translation_state_core;\n'+source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_collections_core.rs':JSON_ITERATION_NATIVE_SOURCE,'src/translation_state_core.rs':JSON_STATE_NATIVE_SOURCE};}
function project(data){return translateProject({entry:'src/lib.rs',paths:Object.keys(data),readSource:path=>data[path],jsonMacroDependencies:loadJsonMacroSourceProof(inputs),deriveDependencies:loadDeriveDependencyProof(inputs),cargoManifest:inputs.manifest,compilationProfile:PRODUCTION_PROFILE});}
const source=`pub fn changed(base:${T},value:${T},index:u64)->${T}{${S}json_with_index(${S}json_append(base,${C}json_copy(&value)),index,value)}
pub fn merged(base:${T},patch:&${T},key:&str)->${T}{${S}json_without_field(${S}json_merge(base,patch),key)}
pub fn keys(value:&${T})->${T}{${S}json_object_keys(value)}
pub fn length(value:&${T})->u64{${S}json_array_len(value)}
pub fn contains(value:&${T},key:&str)->bool{${S}json_object_has(value,key)}
pub fn from_values(values:Vec<${T}>)->${T}{${S}json_from_values(values)}
pub fn into_values(value:${T})->Vec<${T}>{${S}json_into_values(value)}
pub fn copy_values(values:&[${T}])->Vec<${T}>{${S}json_values_copy(values)}
pub fn extended(base:${T},values:&[${T}])->${T}{${S}json_extend(base,values)}
pub fn extended_owned(base:${T},values:Vec<${T}>)->${T}{${S}json_extend_owned(base,values)}`;
const admitted=(result,name)=>result.meta.executable.some(row=>row.name===name);
test('twelve qualified state operations retain ten actual checked Rust caller bodies',limits,async()=>{
 const result=project(files(source));for(const name of ['changed','merged','keys','length','contains','from_values','into_values','copy_values','extended','extended_owned'])assert.equal(admitted(result,name),true,JSON.stringify(result.meta.refused));
 const base=array([bool(false)]),value=text('λ😀'),values=Object.freeze([nil(),value]),original=object([['old',bool(false)],['keep',value]]),patch=object([['old',text('new')],['added',nil()]]);
 await verifyTypedTargets(result,api=>{assert.deepEqual(api.changed(base,value,0n),array([value,value]));assert.deepEqual(api.merged(original,patch,'keep'),object([['old',text('new')],['added',nil()]]));assert.deepEqual(api.keys(original),array([text('keep'),text('old')]));assert.equal(api.length(base),1n);assert.equal(api.contains(original,'old'),true);assert.deepEqual(api.from_values(values),array(values));assert.deepEqual(api.into_values(array(values)),values);assert.deepEqual(api.copy_values(values),values);assert.deepEqual(api.extended(base,values),array([bool(false),...values]));assert.deepEqual(api.extended_owned(base,values),array([bool(false),...values]));},{childTimeoutMs:20_000});
});
test('vector moves wrong native primitive identities and changed leaves do not gain permission',limits,()=>{
 const moved=`pub fn wrong(values:Vec<${T}>)->${T}{let first=${S}json_from_values(values);${S}json_from_values(values)}`;assert.equal(admitted(project(files(moved)),'wrong'),false);
 const wrongIndex=`pub fn wrong(base:${T},index:usize,value:${T})->${T}{${S}json_with_index(base,index,value)}`;assert.equal(admitted(project(files(wrongIndex)),'wrong'),false);
 const borrowed=`pub fn wrong(base:&${T},value:${T})->${T}{${S}json_append(base,value)}`;assert.equal(admitted(project(files(borrowed)),'wrong'),false);
 const altered=files(source);altered['src/translation_state_core.rs']+='\n// changed native source\n';const refused=project(altered);for(const name of ['changed','merged','keys','length','contains','from_values','into_values','copy_values','extended','extended_owned'])assert.equal(admitted(refused,name),false);
});
test('state IDs and copied public projection tags cannot bypass the original emission issuer',limits,()=>{
 for(const id of ['router_state_json_append','router_state_json_into_values'])assert.throws(()=>requireOriginalJsonProjectionEmission({},{k:'routerHostCall',id,args:[],compatibilityCore:{sourceProjectionKey:'forged'}}),/rechecked actual source function/);
});

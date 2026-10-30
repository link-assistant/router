// Independent whole native Result caller SOURCE. Unrun during bulk drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {translateProject} from '../project.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
import {PRIMITIVE_RESULT_NATIVE_SOURCE} from '../primitive-result-native-source.mjs';
import {TEXT_NATIVE_SOURCE} from '../text-native-source.mjs';
import {verifyTypedTargets} from './text-typed-targets.mjs';
import {originalPrimitiveResultProjection,requireOriginalJsonProjectionEmission} from '../router-core-json-updates.mjs';
const limits={timeout:60000},R='crate::translation_primitive_results_core::',T='crate::translation_text_core::',inputs={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
const caller=`pub fn zero()->Result<u64,String>{${R}u64_ok(0_u64)}
pub fn empty_error()->Result<bool,String>{${R}bool_err("")}
pub fn fallback(value:Result<u64,String>)->u64{${R}u64_unwrap_or(value,18446744073709551615_u64)}
pub fn mapped(value:Result<u64,String>)->Result<bool,String>{${R}u64_to_bool_map(value,|item|item==0_u64)}
pub fn bound(value:Result<u64,String>)->Result<u64,String>{${R}u64_to_u64_and_then(value,|item|${R}u64_ok(item))}
pub fn changed_error(value:Result<u64,String>)->Result<u64,String>{${R}u64_map_err(value,|error|${T}replace(&error,"old","😀"))}
pub fn recovered(value:Result<u64,String>)->Result<u64,String>{${R}u64_or_else(value,|error|${R}u64_ok(0_u64))}
pub fn lazy(value:Result<u64,String>)->u64{${R}u64_unwrap_or_else(value,|error|${R}u64_unwrap(${R}u64_err("selected")))}
pub fn captured<'a,'b>(value:Result<&'a str,String>,text:&'b str)->Result<&'b str,String>{${R}str_to_str_map(value,|item|text)}
pub fn option(value:Result<&str,String>)->Option<&str>{${R}str_ok_option(value)}
pub fn optional_error(value:Result<u64,String>)->Option<String>{${R}u64_err_option(value)}
`;
function project(source=caller,changes={}){const files={'src/lib.rs':'pub mod translation_core;\npub mod translation_text_core;\npub mod translation_primitive_results_core;\n'+source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_text_core.rs':TEXT_NATIVE_SOURCE,'src/translation_primitive_results_core.rs':PRIMITIVE_RESULT_NATIVE_SOURCE,...changes};return translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path],jsonMacroDependencies:loadJsonMacroSourceProof(inputs),deriveDependencies:loadDeriveDependencyProof(inputs),cargoManifest:inputs.manifest,compilationProfile:PRODUCTION_PROFILE});}
test('actual complete Result operations emit JS and strict TS with error ownership and lazy callback behavior',limits,async()=>{const result=project();for(const name of ['zero','empty_error','fallback','mapped','bound','changed_error','recovered','lazy','captured','option','optional_error'])assert.ok(result.meta.executable.some(row=>row.name===name),JSON.stringify(result.meta.refused));await verifyTypedTargets(result,api=>{assert.deepEqual(api.zero(),{$:'Ok',field0:0n});assert.deepEqual(api.empty_error(),{$:'Err',field0:''});assert.equal(api.fallback({$:'Err',field0:''}),18446744073709551615n);assert.deepEqual(api.mapped({$:'Ok',field0:1n}),{$:'Ok',field0:false});assert.deepEqual(api.bound({$:'Err',field0:'old'}),{$:'Err',field0:'old'});assert.deepEqual(api.changed_error({$:'Err',field0:'oldold'}),{$:'Err',field0:'😀😀'});assert.deepEqual(api.recovered({$:'Err',field0:''}),{$:'Ok',field0:0n});assert.equal(api.lazy({$:'Ok',field0:0n}),0n);assert.throws(()=>api.lazy({$:'Err',field0:'old'}),error=>error instanceof RangeError&&error.message==='selected');assert.deepEqual(api.captured({$:'Ok',field0:'old'},'new'),{$:'Ok',field0:'new'});assert.deepEqual(api.option({$:'Ok',field0:''}),{$:'Some',field0:''});assert.deepEqual(api.optional_error({$:'Err',field0:''}),{$:'Some',field0:''});},{childTimeoutMs:20000});});
test('actual Result ownership lifetimes widths error types and full dependencies remain mandatory',limits,()=>{
 for(const source of [`pub fn wrong(value:Result<i64,String>)->u64{${R}u64_unwrap_or(value,0_u64)}`,`pub fn wrong(value:Result<u64,&str>)->u64{${R}u64_unwrap_or(value,0_u64)}`,`pub fn wrong(value:Result<u64,String>)->Result<u64,String>{${R}u64_to_u64_map(value,|item|false)}`,`pub fn wrong<'a,'b>(value:Result<&'a str,String>,text:&'b str)->Result<&'a str,String>{${R}str_to_str_map(value,|item|text)}`])assert.equal(project(source).meta.executable.some(row=>row.name==='wrong'),false);for(const name of ['translation_text_core','translation_primitive_results_core'])assert.equal(project(caller,{['src/'+name+'.rs']:'// changed complete source\n'}).meta.executable.some(row=>row.name==='zero'),false);const detached={k:'routerHostCall',id:'router_result_str_to_str_map',args:[],compatibilityCore:{id:'router-owned-json-primitive-result-v1'}};assert.equal(originalPrimitiveResultProjection(detached),null);assert.throws(()=>requireOriginalJsonProjectionEmission({},detached),/rechecked actual source function/u);
});

// Independent complete copied Result caller SOURCE. Unrun during bulk drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {translateProject} from '../project.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
import {OWNED_RESULT_NATIVE_SOURCE} from '../owned-result-native-source.mjs';
import {PRIMITIVE_RESULT_NATIVE_SOURCE} from '../primitive-result-native-source.mjs';
import {TEXT_NATIVE_SOURCE} from '../text-native-source.mjs';
import {verifyTypedTargets} from './text-typed-targets.mjs';
const limits={timeout:60000},R='crate::translation_owned_results_core::',inputs={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
const caller=`pub fn owned(value:String)->Result<String,String>{${R}text_ok(value)}
pub fn unwrap(value:Result<String,String>)->String{${R}text_unwrap(value)}
pub fn mapped(value:Result<String,String>)->Result<String,String>{${R}text_to_text_map(value,|item|item)}
pub fn bound(value:Result<String,String>)->Result<String,String>{${R}text_to_text_and_then(value,|item|${R}text_ok(item))}
pub fn captured<'a>(value:Result<String,String>,text:&'a str)->Result<&'a str,String>{${R}text_to_str_map(value,|item|text)}
pub fn optional(value:Result<String,String>)->Option<String>{${R}text_ok_option(value)}
pub fn original(value:Result<u64,String>)->u64{crate::translation_primitive_results_core::u64_unwrap_or_else(value,|error|0_u64)}
pub fn copied(value:Result<u64,String>)->u64{${R}u64_unwrap_or_else(value,|error|18446744073709551615_u64)}
`;
function project(source=caller){const files={'src/lib.rs':'pub mod translation_core;\npub mod translation_text_core;\npub mod translation_primitive_results_core;\npub mod translation_owned_results_core;\n'+source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_text_core.rs':TEXT_NATIVE_SOURCE,'src/translation_primitive_results_core.rs':PRIMITIVE_RESULT_NATIVE_SOURCE,'src/translation_owned_results_core.rs':OWNED_RESULT_NATIVE_SOURCE};return translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path],jsonMacroDependencies:loadJsonMacroSourceProof(inputs),deriveDependencies:loadDeriveDependencyProof(inputs),cargoManifest:inputs.manifest,compilationProfile:PRODUCTION_PROFILE});}
test('owned String parameters captures and old/new same-named methods coexist in real JS and strict TS',limits,async()=>{const result=project();for(const name of ['owned','unwrap','mapped','bound','captured','optional','original','copied'])assert.ok(result.meta.executable.some(row=>row.name===name),JSON.stringify(result.meta.refused));await verifyTypedTargets(result,api=>{assert.deepEqual(api.owned(''),{$:'Ok',field0:''});assert.equal(api.unwrap({$:'Ok',field0:'é😀'}),'é😀');assert.deepEqual(api.mapped({$:'Ok',field0:''}),{$:'Ok',field0:''});assert.deepEqual(api.bound({$:'Err',field0:'old'}),{$:'Err',field0:'old'});assert.deepEqual(api.captured({$:'Ok',field0:'consumed'},'captured'),{$:'Ok',field0:'captured'});assert.deepEqual(api.optional({$:'Ok',field0:''}),{$:'Some',field0:''});assert.equal(api.original({$:'Err',field0:''}),0n);assert.equal(api.copied({$:'Err',field0:''}),18446744073709551615n);},{childTimeoutMs:20000});});
test('returned references cannot borrow a consumed owned success or claim an unrelated captured lifetime',limits,()=>{for(const source of [`pub fn wrong(value:Result<String,String>)->Result<&'static str,String>{${R}text_to_str_map(value,|item|&item)}`,`pub fn wrong<'a,'b>(value:Result<String,String>,left:&'a str,right:&'b str)->Result<&'a str,String>{${R}text_to_str_map(value,|item|right)}`,`pub fn wrong(value:Result<String,String>)->Result<String,String>{${R}text_to_text_map(value,|item|false)}`])assert.equal(project(source).meta.executable.some(row=>row.name==='wrong'),false);});

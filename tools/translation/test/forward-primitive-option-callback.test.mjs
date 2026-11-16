// Independent native caller and lifetime oracle SOURCE. Unrun during drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {translateProject} from '../project.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
import {PRIMITIVE_OPTION_NATIVE_SOURCE} from '../primitive-option-native-source.mjs';
import {PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE} from '../primitive-option-callback-native-source.mjs';
import {TEXT_NATIVE_SOURCE} from '../text-native-source.mjs';
import {verifyTypedTargets} from './text-typed-targets.mjs';
import {originalPrimitiveOptionCallbackProjection,requireOriginalJsonProjectionEmission} from '../router-core-json-updates.mjs';
const limits={timeout:60000},C='crate::translation_primitive_option_callbacks_core::',O='crate::translation_primitive_option_core::',T='crate::translation_text_core::',inputs={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
const caller=`pub fn mapped(value:Option<bool>)->Option<u64>{${C}bool_to_u64_map(value,|item|{if item{return 0_u64;}return 18446744073709551615_u64;})}
pub fn cleaned(value:Option<&str>)->Option<&str>{${C}str_to_str_map(value,|item|${T}trim(item))}
pub fn capture<'a,'b>(value:Option<&'a str>,text:&'b str)->Option<&'b str>{${C}str_to_str_map(value,|item|text)}
pub fn bind_capture<'a,'b>(value:Option<&'a str>,text:&'b str)->Option<&'b str>{${C}str_to_str_and_then(value,|item|${O}str_some(text))}
pub fn lazy(value:Option<u64>)->u64{${C}u64_unwrap_or_else(value,||${O}u64_unwrap(${O}u64_none()))}
pub fn lazy_text(value:Option<&str>,text:&str)->String{${C}str_unwrap_or_else(value,||${T}trim(text))}
`;
function project(source=caller,changes={}){const files={'src/lib.rs':'pub mod translation_core;\npub mod translation_text_core;\npub mod translation_primitive_option_core;\npub mod translation_primitive_option_callbacks_core;\n'+source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_text_core.rs':TEXT_NATIVE_SOURCE,'src/translation_primitive_option_core.rs':PRIMITIVE_OPTION_NATIVE_SOURCE,'src/translation_primitive_option_callbacks_core.rs':PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE,...changes};return translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path],jsonMacroDependencies:loadJsonMacroSourceProof(inputs),deriveDependencies:loadDeriveDependencyProof(inputs),cargoManifest:inputs.manifest,compilationProfile:PRODUCTION_PROFILE});}
test('actual native callbacks borrowed captures and lazy wrappers emit JS and independent strict TS',limits,async()=>{const result=project();for(const name of ['mapped','cleaned','capture','bind_capture','lazy','lazy_text'])assert.ok(result.meta.executable.some(row=>row.name===name),JSON.stringify(result.meta.refused));await verifyTypedTargets(result,api=>{assert.deepEqual(api.mapped({$:'Some',field0:false}),{$:'Some',field0:18446744073709551615n});assert.deepEqual(api.mapped({$:'None'}),{$:'None'});assert.deepEqual(api.cleaned({$:'Some',field0:'  é😀 '}),{$:'Some',field0:'é😀'});for(const name of ['capture','bind_capture'])assert.deepEqual(api[name]({$:'Some',field0:'old'},'new'),{$:'Some',field0:'new'});assert.equal(api.lazy({$:'Some',field0:0n}),0n);assert.throws(()=>api.lazy({$:'None'}),RangeError);assert.equal(api.lazy_text({$:'None'},'  é😀 '),'é😀');assert.equal(api.lazy_text({$:'Some',field0:''},'unselected'),'');},{childTimeoutMs:20000});});
test('separate captured and receiver lifetimes wrong domains and forged callback records cannot grant admission',limits,()=>{
 for(const source of [`pub fn wrong<'a,'b>(value:Option<&'a str>,text:&'b str)->Option<&'a str>{${C}str_to_str_map(value,|item|text)}`,`pub fn wrong(value:Option<u64>)->Option<u64>{${C}u64_to_u64_map(value,|item|false)}`,`pub fn wrong(value:Option<u64>)->Option<u64>{${C}u64_to_u64_and_then(value,|item|Some(-1_i64))}`,`pub fn wrong(value:Option<&str>)->Option<&'static str>{${C}str_to_str_map(value,|item|item)}`])assert.equal(project(source).meta.executable.some(row=>row.name==='wrong'),false);
 for(const name of ['translation_text_core','translation_primitive_option_core','translation_primitive_option_callbacks_core'])assert.equal(project(caller,{['src/'+name+'.rs']:'// changed complete library\n'}).meta.executable.some(row=>row.name==='mapped'),false);const detached={k:'routerHostCall',id:'router_option_callback_str_to_str_map',args:[],compatibilityCore:{id:'router-owned-json-primitive-option-callback-v1'}};assert.equal(originalPrimitiveOptionCallbackProjection(detached),null);assert.throws(()=>requireOriginalJsonProjectionEmission({},detached),/rechecked actual source function/u);
});

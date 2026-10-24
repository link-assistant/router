// Independent complete native caller SOURCE. Unrun during bulk drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {translateProject} from '../project.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
import {PRIMITIVE_OPTION_NATIVE_SOURCE} from '../primitive-option-native-source.mjs';
import {verifyTypedTargets} from './text-typed-targets.mjs';
import {requireOriginalJsonProjectionEmission,hasOriginalPrimitiveOptionAbsentLoan} from '../router-core-json-updates.mjs';
const limits={timeout:60000},O='crate::translation_primitive_option_core::',inputs={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
const caller=`pub fn zero()->u64{${O}u64_unwrap_or(${O}u64_some(0_u64),1_u64)}
pub fn fallback()->u64{${O}u64_unwrap_or(${O}u64_none(),18446744073709551615_u64)}
pub fn signed()->i64{${O}i64_unwrap(${O}i64_some(-9223372036854775808_i64))}
pub fn boolean()->bool{${O}bool_unwrap_or(${O}bool_some(false),true)}
pub fn chosen()->Option<bool>{${O}bool_and(${O}bool_some(false),${O}bool_some(true))}
pub fn empty(value:&str)->String{${O}str_unwrap_or(${O}str_some(value),"fallback")}
pub fn absent()->Option<&'static str>{${O}str_none()}
pub fn borrowed(value:&str)->Option<&str>{${O}str_some(value)}
`;
function project(source=caller,leaf=PRIMITIVE_OPTION_NATIVE_SOURCE){const files={'src/lib.rs':'pub mod translation_core;\npub mod translation_primitive_option_core;\n'+source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_primitive_option_core.rs':leaf};return translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path],jsonMacroDependencies:loadJsonMacroSourceProof(inputs),deriveDependencies:loadDeriveDependencyProof(inputs),cargoManifest:inputs.manifest,compilationProfile:PRODUCTION_PROFILE});}
test('actual native constructor fallback owned text and absent loan callers emit JS and strict TS',limits,async()=>{
 const result=project();for(const name of ['zero','fallback','signed','boolean','chosen','empty','absent','borrowed'])assert.ok(result.meta.executable.some(row=>row.name===name),JSON.stringify(result.meta.refused));await verifyTypedTargets(result,api=>{assert.equal(api.zero(),0n);assert.equal(api.fallback(),18446744073709551615n);assert.equal(api.signed(),-9223372036854775808n);assert.equal(api.boolean(),false);assert.deepEqual(api.chosen(),{$:'Some',field0:true});assert.equal(api.empty(''),'');assert.equal(api.empty('é😀'),'é😀');assert.deepEqual(api.absent(),{$:'None'});assert.deepEqual(api.borrowed('é😀'),{$:'Some',field0:'é😀'});},{childTimeoutMs:20000});
});
test('actual standard Option widths and lifetimes stay mandatory; public absence metadata supplies no authority',limits,()=>{
 for(const source of [`pub fn wrong()->u64{${O}u64_unwrap_or(Some(-1_i64),1_u64)}`,`pub fn wrong()->u64{${O}u64_unwrap_or(Some(1_u32),1_u64)}`,`pub fn wrong<'a,'b>(left:&'a str,right:&'b str)->Option<&'a str>{${O}str_some(right)}`])assert.equal(project(source).meta.executable.some(row=>row.name==='wrong'),false);assert.equal(project(caller,PRIMITIVE_OPTION_NATIVE_SOURCE+'\n// changed\n').meta.executable.some(row=>row.name==='zero'),false);const detached={k:'routerHostCall',id:'router_option_str_none',args:[],compatibilityCore:{id:'router-owned-json-primitive-option-v1'}};assert.equal(hasOriginalPrimitiveOptionAbsentLoan(detached),false);assert.throws(()=>requireOriginalJsonProjectionEmission({},detached),/rechecked actual source function/u);
});

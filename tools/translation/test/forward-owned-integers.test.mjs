// Independent actual Rust caller SOURCE; execute after complete bulk drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {translateProject} from '../project.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
import {INTEGER_NATIVE_SOURCE} from '../integer-native-source.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {requireOriginalJsonProjectionEmission} from '../router-core-json-updates.mjs';
const limits={timeout:60000},I='crate::translation_integer_core::',inputs={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
const caller=`pub fn sum(value:u64,other:u64)->u64{${I}u64_saturating_add(value,other)}
pub fn previous(value:u64)->u64{${I}u64_wrapping_sub(value,1_u64)}
pub fn signed(value:i64,other:i64)->i64{${I}i64_saturating_add(value,other)}
pub fn quotient(value:i64,other:i64)->Option<i64>{${I}i64_checked_div(value,other)}
pub fn absolute(value:i64)->Option<i64>{${I}i64_checked_abs(value)}
pub fn limited(value:u64,minimum:u64,maximum:u64)->u64{${I}u64_clamp(value,minimum,maximum)}
`;
function project(source=caller,leaf=INTEGER_NATIVE_SOURCE){const files={'src/lib.rs':'pub mod translation_core;\npub mod translation_integer_core;\n'+source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_integer_core.rs':leaf};return translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path],jsonMacroDependencies:loadJsonMacroSourceProof(inputs),deriveDependencies:loadDeriveDependencyProof(inputs),cargoManifest:inputs.manifest,compilationProfile:PRODUCTION_PROFILE});}
test('actual fixed-width native source callers emit executable JS and independent strict TypeScript',limits,async()=>{
 const result=project();for(const name of ['sum','previous','signed','quotient','absolute','limited'])assert.ok(result.meta.executable.some(row=>row.name===name),JSON.stringify(result.meta.refused));await verifyTypedTargets(result,api=>{assert.equal(api.sum(18446744073709551615n,1n),18446744073709551615n);assert.equal(api.previous(0n),18446744073709551615n);assert.equal(api.signed(-9223372036854775808n,-1n),-9223372036854775808n);assert.deepEqual(api.quotient(-7n,3n),{$:'Some',field0:-2n});assert.deepEqual(api.quotient(-9223372036854775808n,-1n),{$:'None'});assert.deepEqual(api.absolute(-9223372036854775808n),{$:'None'});assert.equal(api.limited(0n,1n,7n),1n);},{childTimeoutMs:20000});
});
test('false signedness width borrowed operands altered leaf and public IDs retain original refusals',limits,()=>{
 for(const source of [`pub fn wrong(value:i64)->u64{${I}u64_saturating_add(value,1_u64)}`,`pub fn wrong(value:usize)->u64{${I}u64_saturating_add(value,1_u64)}`,`pub fn wrong(value:&u64)->u64{${I}u64_saturating_add(value,1_u64)}`])assert.equal(project(source).meta.executable.some(row=>row.name==='wrong'),false);const changed=project(caller,INTEGER_NATIVE_SOURCE+'\n// changed\n');assert.equal(changed.meta.executable.some(row=>row.name==='sum'),false);assert.throws(()=>requireOriginalJsonProjectionEmission({},{k:'routerHostCall',id:'router_integer_u64_saturating_add',args:[]}),/rechecked actual source function/u);
});

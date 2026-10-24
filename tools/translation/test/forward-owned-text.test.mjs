// Independent actual Rust caller SOURCE. Unrun during bulk drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {translateProject} from '../project.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
import {TEXT_NATIVE_SOURCE} from '../text-native-source.mjs';
import {verifyTypedTargets} from './text-typed-targets.mjs';
import {requireOriginalJsonProjectionEmission} from '../router-core-json-updates.mjs';
const limits={timeout:60000},T='crate::translation_text_core::',inputs={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
const caller=`pub fn clean(value:&str)->&str{${T}trim(value)}
pub fn has(value:&str,pattern:&str)->bool{${T}contains(value,pattern)}
pub fn size(value:&str)->u64{${T}len_utf8(value)}
pub fn located(value:&str)->Option<u64>{${T}find(value,"é")}
pub fn sliced(value:&str)->Option<&str>{${T}slice_bytes(value,1_u64,5_u64)}
pub fn replaced(value:&str)->String{${T}replace(value,"😀","$&")}
pub fn repeated(value:&str)->String{${T}repeat(value,2_u64)}
pub fn stripped(value:&str)->Option<&str>{${T}strip_suffix(value,"終")}
`;
export function textProject(source=caller,leaf=TEXT_NATIVE_SOURCE){const files={'src/lib.rs':'pub mod translation_core;\npub mod translation_text_core;\n'+source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_text_core.rs':leaf};return translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path],jsonMacroDependencies:loadJsonMacroSourceProof(inputs),deriveDependencies:loadDeriveDependencyProof(inputs),cargoManifest:inputs.manifest,compilationProfile:PRODUCTION_PROFILE});}
test('actual native text callers emit behaviorally checked JS and independently strict TS',limits,async()=>{
 const result=textProject();for(const name of ['clean','has','size','located','sliced','replaced','repeated','stripped'])assert.ok(result.meta.executable.some(row=>row.name===name),JSON.stringify(result.meta.refused));await verifyTypedTargets(result,api=>{assert.equal(api.clean('\u0085😀\u3000'),'😀');assert.equal(api.clean('\ufeffx\ufeff'),'\ufeffx\ufeff');assert.equal(api.has('a😀é','😀'),true);assert.equal(api.size('a😀é'),7n);assert.deepEqual(api.located('a😀é'),{$:'Some',field0:5n});assert.deepEqual(api.sliced('a😀é'),{$:'Some',field0:'😀'});assert.deepEqual(api.sliced('aé'),{$:'None'});assert.equal(api.replaced('😀😀'),'$&$&');assert.equal(api.repeated('é😀'),'é😀é😀');assert.deepEqual(api.stripped('a😀終'),{$:'Some',field0:'a😀'});assert.deepEqual(api.stripped('a😀'),{$:'None'});},{childTimeoutMs:20000});
});
test('changed full native source false operand domains and detached public IDs stay refused',limits,()=>{
 for(const source of [`pub fn wrong(value:u64)->bool{${T}contains(value,"x")}`,`pub fn wrong(value:&str)->u64{${T}repeat(value,2_u64)}`,`pub fn wrong(value:&str,count:i64)->String{${T}repeat(value,count)}`,`pub fn wrong(value:&str)->Option<&str>{${T}slice_bytes(value,1_usize,2_usize)}`])assert.equal(textProject(source).meta.executable.some(row=>row.name==='wrong'),false);assert.equal(textProject(caller,TEXT_NATIVE_SOURCE+'\n// changed\n').meta.executable.some(row=>row.name==='clean'),false);assert.throws(()=>requireOriginalJsonProjectionEmission({},{k:'routerHostCall',id:'router_text_trim',args:[]}),/rechecked actual source function/u);
});

// Independent runtime/forward/native-source case SOURCE; every case is UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as runtime from '../text-runtime.mjs';
import {TEXT_CONTRACTS,emitTextDeclarations} from '../text-contracts.mjs';
import {TEXT_NATIVE_SOURCE,TEXT_DECLARATIONS_SOURCE} from '../text-native-source.mjs';
import {prepareTextAsciiSources} from '../prepare-text-ascii-sources.mjs';
import {prepareTextSha256Sources} from '../prepare-text-sha256-sources.mjs';
import {translateProject} from '../project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE,ROUTER_CORE_BASE64_SOURCE} from '../router-core-source-data.mjs';
import {verifyTypedTargets} from './text-typed-targets.mjs';
const limits={timeout:60000},vectors=JSON.parse(readFileSync(new URL('./fixtures/text-ascii-vectors.json',import.meta.url),'utf8')).vectors;
const names=['to_ascii_lowercase','to_ascii_uppercase','is_ascii','eq_ignore_ascii_case','trim_ascii','trim_ascii_start','trim_ascii_end','split_once_left','split_once_right','rsplit_once_left','rsplit_once_right'];
const caller=`
pub fn to_ascii_lowercase(value:&str)->String{crate::translation_text_core::to_ascii_lowercase(value)}
pub fn to_ascii_uppercase(value:&str)->String{crate::translation_text_core::to_ascii_uppercase(value)}
pub fn is_ascii(value:&str)->bool{crate::translation_text_core::is_ascii(value)}
pub fn eq_ignore_ascii_case(value:&str,other:&str)->bool{crate::translation_text_core::eq_ignore_ascii_case(value,other)}
pub fn trim_ascii(value:&str)->&str{crate::translation_text_core::trim_ascii(value)}
pub fn trim_ascii_start(value:&str)->&str{crate::translation_text_core::trim_ascii_start(value)}
pub fn trim_ascii_end(value:&str)->&str{crate::translation_text_core::trim_ascii_end(value)}
pub fn split_once_left<'a>(value:&'a str,pattern:&str)->Option<&'a str>{crate::translation_text_core::split_once_left(value,pattern)}
pub fn split_once_right<'a>(value:&'a str,pattern:&str)->Option<&'a str>{crate::translation_text_core::split_once_right(value,pattern)}
pub fn rsplit_once_left<'a>(value:&'a str,pattern:&str)->Option<&'a str>{crate::translation_text_core::rsplit_once_left(value,pattern)}
pub fn rsplit_once_right<'a>(value:&'a str,pattern:&str)->Option<&'a str>{crate::translation_text_core::rsplit_once_right(value,pattern)}
`;
function project(source=caller,native=TEXT_NATIVE_SOURCE){
 const inputs={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')},files={'src/lib.rs':'pub mod translation_core;\npub mod translation_text_core;\n'+source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE,'src/translation_text_core.rs':native};
 return translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path],jsonMacroDependencies:loadJsonMacroSourceProof(inputs),deriveDependencies:loadDeriveDependencyProof(inputs),cargoManifest:inputs.manifest,compilationProfile:PRODUCTION_PROFILE});
}
test('independent fixed vectors preserve ASCII-only casing exact whitespace and first or last delimiter behavior',limits,()=>{
 assert.deepEqual([...new Set(vectors.map(row=>row.operation))].sort(),[...names].sort());for(const row of vectors){const value=runtime['router_text_'+row.operation](...row.arguments);assert.deepEqual(value,row.expected,JSON.stringify(row));if(value&&typeof value==='object')assert.equal(Object.isFrozen(value),true);}
});
test('all new operations keep primitive scalar and input bounds without evaluating coercion hooks',limits,()=>{
 let touched=false;const fake={toString(){touched=true;return 'text';}};for(const name of names){const operation=runtime['router_text_'+name],binary=name==='eq_ignore_ascii_case'||name.includes('split_once');for(const value of [fake,'\ud800','x\udfff'])assert.throws(()=>operation(value,...(binary?['x']:[])));assert.throws(()=>operation('x'.repeat(1048577),...(binary?['x']:[])),/input bound/u);if(binary){assert.throws(()=>operation('valid',fake));assert.throws(()=>operation('valid','\ud800'));}assert.equal(touched,false);}
 assert.equal(runtime.router_text_to_ascii_lowercase('A'.repeat(1048576)),'a'.repeat(1048576));assert.equal(runtime.router_text_trim_ascii('\u000b'),'\u000b');
});
test('the shared catalog carries all eleven native caller functions into JavaScript and independently strict TypeScript',limits,async()=>{
 assert.equal(TEXT_CONTRACTS.length,45);assert.equal(emitTextDeclarations(),TEXT_DECLARATIONS_SOURCE);assert.equal(TEXT_NATIVE_SOURCE,readFileSync(new URL('../../../rust/src/translation_text_core.rs',import.meta.url),'utf8'));const result=project();for(const name of names)assert.ok(result.meta.executable.some(row=>row.name===name),name+JSON.stringify(result.meta.refused));await verifyTypedTargets(result,api=>{for(const row of vectors)assert.deepEqual(api[row.operation](...row.arguments),row.expected);},{childTimeoutMs:20000});assert.equal(result.meta.runtimeParity,false);
});
test('changed native implementations and incorrect operand or return domains remain refused',limits,()=>{
 assert.equal(project(caller,TEXT_NATIVE_SOURCE+'\n// changed\n').meta.executable.some(row=>names.includes(row.name)),false);for(const source of ['pub fn invalid(value:u64)->String{crate::translation_text_core::to_ascii_lowercase(value)}','pub fn invalid(value:&str)->bool{crate::translation_text_core::trim_ascii(value)}','pub fn invalid(value:&str)->String{crate::translation_text_core::split_once_left(value,":")}'])assert.equal(project(source).meta.executable.some(row=>row.name==='invalid'),false);
});
test('all nine complete compiler equations and adjacent native histories retain both phases and full inverses',limits,()=>{
 const plan=prepareTextAsciiSources();assert.equal(plan.files.length,9);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.nativeSourcePlan.current,plan.nativeSourcePlan.after);assert.equal(plan.nativeSourcePlan.inverse,plan.nativeSourcePlan.before);assert.equal(plan.nativeSourcePlan.rustExecuted,false);const previous=prepareTextSha256Sources().nativeSourcePlan;assert.equal(previous.originalAfter,plan.nativeSourcePlan.before);assert.equal(previous.after,plan.nativeSourcePlan.after);assert.equal(previous.laterHistories[0].inverse,previous.originalAfter);assert.equal(plan.receivingExecuted,false);
});

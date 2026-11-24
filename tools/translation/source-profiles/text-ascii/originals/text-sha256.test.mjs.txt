// Independent shared-operation SOURCE. All cases remain unrun during drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {router_text_sha256_base64_url_no_pad as challenge} from '../text-runtime.mjs';
import {TEXT_CONTRACTS,textContract,emitTextDeclarations} from '../text-contracts.mjs';
import {TEXT_NATIVE_SOURCE,TEXT_DECLARATIONS_SOURCE} from '../text-native-source.mjs';
import {prepareTextSha256Sources} from '../prepare-text-sha256-sources.mjs';
import {translateProject} from '../project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE,ROUTER_CORE_BASE64_SOURCE} from '../router-core-source-data.mjs';
import {verifyTypedTargets} from './text-typed-targets.mjs';
const limits={timeout:60000},vectors=JSON.parse(readFileSync(new URL('./fixtures/text-sha256-vectors.json',import.meta.url),'utf8')).vectors;
const inputs={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
function project(source='pub fn challenge(value:&str)->String{crate::translation_text_core::sha256_base64_url_no_pad(value)}',leaf=TEXT_NATIVE_SOURCE){
 const files={'src/lib.rs':'pub mod translation_core;\npub mod translation_text_core;\n'+source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE,'src/translation_text_core.rs':leaf};
 return translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path],jsonMacroDependencies:loadJsonMacroSourceProof(inputs),deriveDependencies:loadDeriveDependencyProof(inputs),cargoManifest:inputs.manifest,compilationProfile:PRODUCTION_PROFILE});
}
test('fixed independent SHA256 and PKCE vectors retain the URL alphabet and no padding',limits,()=>{
 for(const row of vectors){assert.equal(challenge(row.input),row.expected);assert.equal(row.expected.length,43);assert.match(row.expected,/^[A-Za-z0-9_-]+$/u);}
});
test('the hashing operation validates primitive scalar UTF8 before hashing and retains the input bound',limits,()=>{
 let touched=false;assert.throws(()=>challenge({toString(){touched=true;return 'abc';}}),/primitive text/u);assert.equal(touched,false);
 for(const value of ['\ud800','\udfff','x\ud800y'])assert.throws(()=>challenge(value),/Unicode scalar/u);
 assert.throws(()=>challenge('x'.repeat(1048577)),/input bound/u);assert.equal(challenge('x'.repeat(1048576)).length,43);assert.equal(challenge('π\0🙂').length,43);assert.notEqual(challenge('é'),challenge('e\u0301'));
});
test('one registry row reaches actual native source forward JavaScript and independently strict TypeScript',limits,async()=>{
 const row=textContract('sha256_base64_url_no_pad');assert.equal(row.parameters[0],'str');assert.equal(row.returns,'text-owned');assert.equal(row.rustPath,'crate::translation_text_core::sha256_base64_url_no_pad');assert.equal(TEXT_CONTRACTS.length,21);assert.equal(emitTextDeclarations(),TEXT_DECLARATIONS_SOURCE);
 assert.equal(TEXT_NATIVE_SOURCE,readFileSync(new URL('../../../rust/src/translation_text_core.rs',import.meta.url),'utf8'));const result=project();assert.ok(result.meta.executable.some(row=>row.name==='challenge'),JSON.stringify(result.meta.refused));await verifyTypedTargets(result,api=>{for(const row of vectors)assert.equal(api.challenge(row.input),row.expected);},{childTimeoutMs:20000});assert.equal(result.meta.runtimeParity,false);
});
test('wrong actual native sources and operand/result domains remain refused',limits,()=>{
 assert.equal(project(undefined,TEXT_NATIVE_SOURCE+'\n// changed\n').meta.executable.some(row=>row.name==='challenge'),false);
 for(const source of ['pub fn challenge(value:u64)->String{crate::translation_text_core::sha256_base64_url_no_pad(value)}','pub fn challenge(value:&str)->bool{crate::translation_text_core::sha256_base64_url_no_pad(value)}'])assert.equal(project(source).meta.executable.some(row=>row.name==='challenge'),false);
});
test('all six complete source equations and native append history retain both phases and full inverses',limits,()=>{
 const plan=prepareTextSha256Sources();assert.equal(plan.files.length,6);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}
 const native=plan.nativeSourcePlan;assert.equal(native.current,native.after);assert.equal(native.inverse,native.before);assert.deepEqual(native.stages.map(stage=>stage.phase),['language','repository']);assert.equal(native.nativeRustGrammarChecked,false);assert.equal(native.rustExecuted,false);assert.equal(plan.receivingExecuted,false);
});

// Independent original native literal and typed target SOURCE. ALL UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {translateProjectOwnedTextVectors} from '../owned-text-vector-project.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
import {verifyTypedTargets} from './owned-text-vector-typed-targets.mjs';
const limits={timeout:60000},text='::std::string::String',vector='::std::vec::Vec<'+text+'>',core='crate::translation_owned_text_vectors_core::',native=readFileSync(new URL('../../../rust/src/translation_owned_text_vectors_core.rs',import.meta.url),'utf8'),dependencies={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
function project(source){const files={'src/lib.rs':'pub mod translation_core;\npub mod translation_owned_text_vectors_core;\n'+source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_owned_text_vectors_core.rs':native};return translateProjectOwnedTextVectors({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path],jsonMacroDependencies:loadJsonMacroSourceProof(dependencies),deriveDependencies:loadDeriveDependencyProof(dependencies),cargoManifest:dependencies.manifest,compilationProfile:PRODUCTION_PROFILE});}
const admitted=(result,name)=>result.meta.executable.some(row=>row.name===name);
test('original temporary String arrays flatten to ordinary frozen runtime literals with native moves',limits,async()=>{
 const source=`pub fn empty()->${vector}{${core}vec_text_from_slice(&[])}
pub fn pair(first:${text},second:${text})->${vector}{${core}vec_text_from_slice(&[first,second])}
pub fn rebound(first:${text},second:${text})->${vector}{let mut values=${core}vec_text_from_slice(&[first]);values=${core}vec_text_push(values,second);values}
pub fn independent(value:${text})->::std::option::Option<${text}>{let values=${core}vec_text_from_slice(&[value]);let selected=${core}vec_text_get(&values,0_u64);let moved=${core}vec_text_append(values,${core}vec_text_new());selected}
pub fn nested(first:${text},second:${text})->${vector}{${core}vec_text_append(${core}vec_text_from_slice(&[first]),${core}vec_text_from_slice(&[second]))}`;
 const result=project(source);for(const name of ['empty','pair','rebound','independent','nested'])assert.equal(admitted(result,name),true,JSON.stringify(result.meta.refused));assert.match(result.javascript,/owned-text-vector-literal-runtime\.mjs/u);
 await verifyTypedTargets(result,api=>{assert.deepEqual(api.empty(),[]);assert.deepEqual(api.pair('é','🦀\u0000文'),['é','🦀\u0000文']);assert.deepEqual(api.rebound('first','second'),['first','second']);assert.deepEqual(api.independent('🦀'),{$:'Some',field0:'🦀'});assert.deepEqual(api.nested('x','y'),['x','y']);assert.equal(Object.isFrozen(api.pair('x','y')),true);},{childTimeoutMs:20000});
});
test('all 64 individual native String parameters preserve their actual evaluation order',limits,async()=>{
 const names=Array.from({length:64},(_,index)=>'value'+index),source='pub fn full('+names.map(name=>name+':'+text).join(',')+')->'+vector+'{'+core+'vec_text_from_slice(&['+names.join(',')+'])}',result=project(source);assert.equal(admitted(result,'full'),true,JSON.stringify(result.meta.refused));await verifyTypedTargets(result,api=>{const input=Array.from({length:64},(_,index)=>'v'+index);assert.deepEqual(api.full(...input),input);},{childTimeoutMs:20000});
});
test('literal temporary ownership refuses duplicate String moves, aliases, excess operands and borrowed str elements',limits,()=>{
 const bodies=[`${core}vec_text_from_slice(&[value,value])`,`let alias=value;${core}vec_text_from_slice(&[alias,value])`,`let values=${core}vec_text_from_slice(&[value]);${core}vec_text_from_slice(&[value])`,`${core}vec_text_from_slice(&[${Array(65).fill('value').join(',')}])`,`${core}vec_text_from_slice(&["borrowed"])`];for(const body of bodies)assert.equal(admitted(project(`pub fn bad(value:${text})->${vector}{${body}}`),'bad'),false);
});

// Independent original Rust caller/typed-target/freshness/refusal SOURCE.
// ALL UNRUN. Native compilation/oracle execution is authorized in CI only.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {translateProjectOwnedTextVectors as translateProject} from '../owned-text-vector-project.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
import {verifyTypedTargets} from './owned-text-vector-readonly-typed-targets.mjs';
import {prepareOwnedTextVectorNativeReadonlyTextSources} from '../prepare-owned-text-vector-native-readonly-text-sources.mjs';
import {TEXT_NATIVE_SOURCE} from '../text-native-source.mjs';
import {ownedTextVectorJoinHelperSources,defaultOwnedTextVectorJoinHelperNames} from '../owned-text-vector-join-helper-sources.mjs';
import {borrowedScalarTextCandidate,borrowedScalarTextHelperCandidate} from '../owned-text-vector-readonly-text-candidate.mjs';
import {SOURCE_STR} from '../extensions/source-contract-types.mjs';
const limits={timeout:60000},namespace='crate::translation_owned_text_vectors_core::',text='::std::string::String',vector='::std::vec::Vec<'+text+'>',n=operation=>namespace+'vec_text_'+operation;
const native=readFileSync(new URL('../../../rust/src/translation_owned_text_vectors_core.rs',import.meta.url),'utf8'),dependencies={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
function files(source,leaf=native,edge='pub mod translation_owned_text_vectors_core;'){
 return {'src/lib.rs':'pub mod translation_core;\npub mod translation_text_core;\n'+edge+'\n'+source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_owned_text_vectors_core.rs':leaf,'src/translation_text_core.rs':TEXT_NATIVE_SOURCE};
}
function project(input){return translateProject({entry:'src/lib.rs',paths:Object.keys(input),readSource:path=>input[path],jsonMacroDependencies:loadJsonMacroSourceProof(dependencies),deriveDependencies:loadDeriveDependencyProof(dependencies),cargoManifest:dependencies.manifest,compilationProfile:PRODUCTION_PROFILE});}
const admitted=(result,name)=>result.meta.executable.some(row=>row.name===name);

const textCore='crate::translation_text_core::';
const helpers=`
fn repeated(values:&${vector},suffix:&str)->${text}{let count=${n('len')}(values);${textCore}repeat(suffix,count)}
fn shared_count(values:&${vector},suffix:&str)->::core::primitive::u64{let checked=${n('len')}(values);if ${textCore}is_empty(suffix){${n('len')}(values)}else{${n('len')}(values)}}
fn nested(values:&${vector},suffix:&str)->${text}{let checked=${n('len')}(values);repeated(values,suffix)}
fn consuming(values:${vector},suffix:&str)->${text}{let checked=${n('truncate')}(values,18446744073709551615_u64);repeated(&checked,suffix)}
pub fn build(value:${text},suffix:&str)->${text}{let values=${n('push')}(${n('new')}(),value);repeated(&values,suffix)}
pub fn readonly_input(values:&${vector},suffix:&str)->${text}{let checked=${n('len')}(values);nested(values,suffix)}
pub fn owned_input(values:${vector},suffix:&str)->${text}{let checked=${n('truncate')}(values,18446744073709551615_u64);consuming(checked,suffix)}
pub fn counted(value:${text},suffix:&str)->::core::primitive::u64{let values=${n('push')}(${n('new')}(),value);shared_count(&values,suffix)}
`;
test('actual same-module borrowed str helpers retain complete source and native vector/text domains',limits,async t=>{
 const result=project(files(helpers));for(const name of ['build','readonly_input','owned_input','counted'])assert.equal(admitted(result,name),true,name+': '+JSON.stringify(result.meta.refused));await verifyTypedTargets(result,api=>{for(const suffix of ['', 'é', '🦀\u0000']){assert.equal(api.build('value',suffix),suffix);assert.equal(api.counted('value',suffix),1n);const input=Object.freeze(['one','two']);assert.equal(api.readonly_input(input,suffix),suffix.repeat(2));assert.equal(api.owned_input(input,suffix),suffix.repeat(2));assert.deepEqual(input,['one','two']);}assert.throws(()=>api.readonly_input(['x'],'x'));assert.throws(()=>api.readonly_input(Object.freeze(Array(4097).fill('')),''));assert.throws(()=>api.build('x','x'.repeat(1048577)));},{childTimeoutMs:20000,recordCompilerVersion:version=>t.diagnostic(JSON.stringify({tool:'TypeScript',version}))});
});
test('complete actual canonical join fold is a native helper with shared vector and readonly text input',limits,async t=>{
 const helper=ownedTextVectorJoinHelperSources({...defaultOwnedTextVectorJoinHelperNames(),functionName:'joined'}).sources.find(row=>row.language==='Rust').source,source=helper+`\npub fn via_join(values:&${vector},separator:&str)->${text}{let checked=${n('len')}(values);joined(values,separator)}`,result=project(files(source));assert.equal(admitted(result,'via_join'),true,JSON.stringify(result.meta.refused));await verifyTypedTargets(result,api=>{for(const values of [[],[''],['é','🦀\u0000文']])for(const separator of ['',',','\n\n']){const input=Object.freeze([...values]);assert.equal(api.via_join(input,separator),values.join(separator));assert.deepEqual(input,values);}},{childTimeoutMs:20000,recordCompilerVersion:version=>t.diagnostic(JSON.stringify({tool:'TypeScript',version}))});
});
test('source role qualification cannot skip vector entry guards, borrowed-result refusal or callee body ownership',limits,()=>{
 const missing=`fn missing(values:&${vector},suffix:&str)->${text}{${textCore}repeat(suffix,1_u64)}pub fn invalid(values:&${vector},suffix:&str)->${text}{let checked=${n('len')}(values);missing(values,suffix)}`,borrowed=`fn escaped(values:&${vector},suffix:&str)->&str{let checked=${n('len')}(values);suffix}pub fn invalid(values:&${vector},suffix:&str)->&str{let checked=${n('len')}(values);escaped(values,suffix)}`,moved=`fn bad(values:${vector},suffix:&str)->${text}{let checked=${n('truncate')}(values,18446744073709551615_u64);let moved=${n('append')}(checked,${n('new')}());${textCore}repeat(suffix,${n('len')}(&checked))}pub fn invalid(values:${vector},suffix:&str)->${text}{let checked=${n('truncate')}(values,18446744073709551615_u64);bad(checked,suffix)}`;
 for(const source of [missing,borrowed,moved])assert.equal(admitted(project(files(source)),'invalid'),false);
 const changed=files(helpers);changed['src/translation_text_core.rs']+='\n// stale leaf\n';assert.equal(admitted(project(changed),'build'),false);
});
test('a later helper argument cannot move and restore the String behind an earlier readonly text loan',limits,()=>{
 const callee=`fn three(values:&${vector},suffix:&str,later:${text})->${text}{let checked=${n('len')}(values);let consumed=${textCore}clear_owned(later);${textCore}repeat(suffix,${n('len')}(values))}`,positive=callee+`pub fn valid_owner(value:${text},suffix:${text})->${text}{let values=${n('push')}(${n('new')}(),value);three(&values,suffix.as_str(),${textCore}to_owned("later"))}`,source=callee+`pub fn invalid(value:${text},mut suffix:${text})->${text}{let values=${n('push')}(${n('new')}(),value);three(&values,suffix.as_str(),{let old=suffix;suffix=${textCore}to_owned("new");old})}`,result=project(files(source));const valid=project(files(positive));assert.equal(admitted(valid,'valid_owner'),true,JSON.stringify(valid.meta.refused));assert.equal(admitted(result,'invalid'),false);assert.ok(result.meta.refused.some(row=>/loan|borrow|mov/iu.test(row.message)));
});
test('descriptor-only readonly text candidates are inert, reject unknown reference domains and never invoke getters',limits,()=>{
 assert.equal(borrowedScalarTextCandidate(SOURCE_STR),true);assert.equal(borrowedScalarTextCandidate({kind:'string',rustOwnership:{kind:'borrowed',source:'str'}}),true);for(const value of [null,{},new Proxy(SOURCE_STR,{}),{...SOURCE_STR,rustReference:{kind:'shared'}},{...SOURCE_STR,patternOwnershipRefusal:'unknown'},{...SOURCE_STR,rustOwnership:{kind:'owned',source:'String'}},{...SOURCE_STR,rustBorrowingUnresolved:true},{...SOURCE_STR,rustStandardSignature:{kind:'borrowed-str',origin:'public'}}])assert.equal(borrowedScalarTextCandidate(value),false);let read=false;const value={...SOURCE_STR};Object.defineProperty(value,'rustReference',{get(){read=true;return undefined;}});assert.equal(borrowedScalarTextCandidate(value),false);assert.equal(read,false);assert.equal(borrowedScalarTextHelperCandidate({params:[{type:SOURCE_STR}]}),true);assert.equal(borrowedScalarTextHelperCandidate({params:new Proxy([{type:SOURCE_STR}],{})}),false);
});
test('complete readonly-source substitutions keep the original flow, source metadata and receiving obligations separate',limits,()=>{const plan=prepareOwnedTextVectorNativeReadonlyTextSources();assert.ok(plan.files.some(row=>row.path==='tools/translation/owned-text-vector-readonly-native-flow.mjs'));assert.ok(plan.files.some(row=>row.path==='tools/translation/router-core-json-updates.mjs'));assert.equal(plan.receivingExecuted,false);for(const row of plan.files){assert.equal(row.inverse,row.before);assert.ok(row.after.split('\n').length-(row.after.endsWith('\n')?1:0)<1000);}});

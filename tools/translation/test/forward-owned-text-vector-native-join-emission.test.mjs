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
import {prepareOwnedTextVectorNativeJoinEmissionSources} from '../prepare-owned-text-vector-native-join-emission-sources.mjs';
import {originalParsedDeclarationSource} from '../extensions/source-links.mjs';
import {emitOriginalNativeTextJoinStatements} from '../router-core-json-updates.mjs';
import {nativeOwnedTextJoinSourceMatches} from '../native-owned-text-join-emission.mjs';
import {TEXT_NATIVE_SOURCE} from '../text-native-source.mjs';
const limits={timeout:60000},namespace='crate::translation_owned_text_vectors_core::',text='::std::string::String',vector='::std::vec::Vec<'+text+'>',n=operation=>namespace+'vec_text_'+operation;
const native=readFileSync(new URL('../../../rust/src/translation_owned_text_vectors_core.rs',import.meta.url),'utf8'),dependencies={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
function files(source,leaf=native,edge='pub mod translation_owned_text_vectors_core;'){
 return {'src/lib.rs':'pub mod translation_core;\npub mod translation_text_core;\n'+edge+'\n'+source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_owned_text_vectors_core.rs':leaf,'src/translation_text_core.rs':TEXT_NATIVE_SOURCE};
}
function project(input){return translateProject({entry:'src/lib.rs',paths:Object.keys(input),readSource:path=>input[path],jsonMacroDependencies:loadJsonMacroSourceProof(dependencies),deriveDependencies:loadDeriveDependencyProof(dependencies),cargoManifest:dependencies.manifest,compilationProfile:PRODUCTION_PROFILE});}
const admitted=(result,name)=>result.meta.executable.some(row=>row.name===name);


// Independent literal original source, not generated from the matcher/catalog.
const helper=`fn joined(values: &::std::vec::Vec<::std::string::String>, separator: &str) -> ::std::string::String {
    let count = crate::translation_owned_text_vectors_core::vec_text_len(values);
    let _separator_bytes = crate::translation_text_core::len_utf8(separator);
    let mut output = crate::translation_text_core::to_owned("");
    let mut index = 0u64;
    while index < count {
        if index > 0u64 { output = crate::translation_text_core::append_owned(output, separator); }
        match crate::translation_owned_text_vectors_core::vec_text_get(values, index) {
            Some(value) => { output = crate::translation_text_core::append_owned(output, &value); }
            None => {}
        }
        index = index + 1u64;
    }
    output
}`;
const caller=`pub fn via_join(values:&${vector},separator:&str)->${text}{let checked=${n('len')}(values);joined(values,separator)}`;

test('genuine complete native helper emits the kernel in JS and strict TS with full original bounds',limits,async t=>{
 const result=project(files(helper+'\n'+caller));
 assert.equal(admitted(result,'via_join'),true,JSON.stringify(result.meta.refused));
 for(const target of [result.javascript,result.typescript]){
  assert.match(target,/router_owned_text_vec_join as ml_host_router_owned_text_vec_join/u);
  assert.match(target,/return ml_host_router_owned_text_vec_join\(/u);
  assert.match(target,/owned-text-vector-join-runtime\.mjs/u);
 }
 await verifyTypedTargets(result,api=>{
  const started=performance.now();
  for(const values of [[],[''],['é','🦀\u0000文'],Array(4096).fill('x')]){
   for(const separator of ['',',','\n']){
    const frozen=Object.freeze([...values]);assert.equal(api.via_join(frozen,separator),values.join(separator));
    assert.deepEqual(frozen,values);
   }
  }
  const boundary=Object.freeze(['x'.repeat(1048576)]);
  assert.equal(api.via_join(boundary,''),boundary[0]);
  assert.throws(()=>api.via_join(Object.freeze(['x'.repeat(1048576),'x']),''));
  assert.throws(()=>api.via_join(Object.freeze(Array(4097).fill('')),''));
  assert.throws(()=>api.via_join(['x'],''));
  assert.throws(()=>api.via_join(Object.freeze(['\ud800']),''));
  assert.throws(()=>api.via_join(Object.freeze([]),'x'.repeat(1048577)));
  const elapsedMs=performance.now()-started;
  t.diagnostic(JSON.stringify({nativeJoinKernelFullBoundaryElapsedMs:elapsedMs}));
  assert.ok(elapsedMs<20000,'retain original synchronous 20-second target deadline');
 },{childTimeoutMs:20000,recordCompilerVersion:version=>t.diagnostic(JSON.stringify({tool:'TypeScript',version}))});
});

test('function names do not substitute for complete native fold source',limits,async()=>{
 const changed=helper.replace('append_owned(output, separator)','append_owned(output, "!")');
 const result=project(files(changed+'\n'+caller));
 assert.equal(admitted(result,'via_join'),true,JSON.stringify(result.meta.refused));
 assert.doesNotMatch(result.javascript,/return ml_host_router_owned_text_vec_join\(/u);
 await verifyTypedTargets(result,api=>assert.equal(api.via_join(Object.freeze(['a','b']),','),'a!b'),{childTimeoutMs:20000});
 assert.equal(nativeOwnedTextJoinSourceMatches(helper,'joined'),true);
 assert.equal(nativeOwnedTextJoinSourceMatches(changed,'joined'),false);
 for(const source of [helper+'\n// trailing code',helper.replace('fn joined','unsafe fn joined'),helper.replace('None => {}','None => { output = crate::translation_text_core::to_owned("bad"); }')]){
  assert.equal(nativeOwnedTextJoinSourceMatches(source,'joined'),false);
 }
});

test('late same-shape source changes cannot become a checked kernel helper',limits,()=>{
 const stale=files(helper+'\n'+caller);
 stale['src/translation_owned_text_vectors_core.rs']+='\n// changed source\n';
 const result=project(stale);assert.equal(admitted(result,'via_join'),false);
 const forged={k:'fn',name:'joined',nativeTextJoinKernel:true,body:{k:'literal',value:'fake'}};
 assert.equal(originalParsedDeclarationSource(forged),null);
 assert.equal(emitOriginalNativeTextJoinStatements({nativeTextJoinKernel:true},forged.body),null);
 let observed=false;const trap=new Proxy({}, {get(){observed=true;throw Error('unexpected public source access');}});
 assert.equal(originalParsedDeclarationSource(trap),null);assert.equal(observed,false);
});

test('source-equation profile retains complete originals, both phases and original inverses',limits,()=>{
 const plan=prepareOwnedTextVectorNativeJoinEmissionSources();
 assert.equal(plan.receivingExecuted,false);
 for(const path of ['tools/translation/extensions/source-links.mjs','tools/translation/router-core-json-updates.mjs','tools/translation/extensions/host-contracts.mjs','tools/translation/owned-text-vector-forward-domain.mjs']){
  assert.ok(plan.files.some(row=>row.path===path));
 }
 for(const row of plan.files){assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.ok(row.after.split('\n').length-(row.after.endsWith('\n')?1:0)<1000);}
});

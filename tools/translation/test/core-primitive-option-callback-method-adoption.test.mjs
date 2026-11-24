// Independent adoption, packet and installer SOURCE. Unrun during drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {proposeCorePrimitiveOptionCallbackMethodCorpus} from '../migrate-core-primitive-option-callback-methods.mjs';
import {proposeCoreAdoptionSequence} from '../propose-primitive-option-callback-method-adoption-corpus.mjs';
import {planCheckedPrimitiveOptionCallbackMethodAdoption,applyCheckedPrimitiveOptionCallbackMethodAdoption} from '../checked-primitive-option-callback-method-adoption.mjs';
import {preparePrimitiveOptionCallbackMethodAdoption} from '../prepare-primitive-option-callback-method-adoption.mjs';
import {PRIMITIVE_OPTION_NATIVE_SOURCE} from '../primitive-option-native-source.mjs';
import {PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE} from '../primitive-option-callback-native-source.mjs';
import {TEXT_NATIVE_SOURCE} from '../text-native-source.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {translateProject} from '../project.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {verifyTypedTargets} from './text-typed-targets.mjs';
const limits={timeout:60000},dependencies={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
const source=`pub fn identity(value:Option<u64>)->Option<u64>{value.map(|item|item)}
pub fn captured<'a>(value:Option<u64>,text:&'a str)->Option<&'a str>{value.map(|item|text)}
pub fn bind(value:Option<i64>)->Option<i64>{value.and_then(|item|Some(item))}
pub fn nested(value:Option<u64>)->Option<u64>{value.map(|item|item).and_then(|item|Some(item))}
pub fn fallback(value:Option<u64>)->u64{value.unwrap_or_else(||0)}
pub fn text(value:Option<&str>,fallback:&str)->String{value.unwrap_or_else(||fallback).to_owned()}
pub fn branches(value:Option<bool>)->Option<u64>{value.map(|item|->u64{if item{return 0;}return 18446744073709551615;})}
`;
function files(caller=source){return {'src/lib.rs':'pub mod translation_core;\npub mod translation_text_core;\npub mod translation_primitive_option_core;\npub mod translation_primitive_option_callbacks_core;\n'+caller,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_text_core.rs':TEXT_NATIVE_SOURCE,'src/translation_primitive_option_core.rs':PRIMITIVE_OPTION_NATIVE_SOURCE,'src/translation_primitive_option_callbacks_core.rs':PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE};}
const propose=caller=>proposeCorePrimitiveOptionCallbackMethodCorpus({files:files(caller),dependencyInputs:dependencies});
test('complete immutable callback chains retain CST inverses and freshly translate both targets',limits,async()=>{
 const proposal=propose(source),root=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.equal(root.selections.length,7);for(const selection of root.selections){assert.equal(selection.executableAdmission,false);assert.equal(selection.oldTraitDispatchProved,false);}assert.equal(transportConcreteSyntaxMeta(root.before.meta).source,root.before.source);assert.equal(transportConcreteSyntaxMeta(root.after.meta).source,root.after.source);assert.equal(root.mapping.filter(row=>row.kind==='substitution').length,7);
 const result=translateProject({entry:'src/lib.rs',paths:Object.keys(proposal.after),readSource:path=>proposal.after[path],jsonMacroDependencies:loadJsonMacroSourceProof(dependencies),deriveDependencies:loadDeriveDependencyProof(dependencies),cargoManifest:dependencies.manifest,compilationProfile:PRODUCTION_PROFILE});for(const name of ['identity','captured','bind','nested','fallback','text','branches'])assert.ok(result.meta.executable.some(row=>row.name===name),JSON.stringify(result.meta.refused));await verifyTypedTargets(result,api=>{assert.deepEqual(api.identity({$:'Some',field0:0n}),{$:'Some',field0:0n});assert.deepEqual(api.captured({$:'Some',field0:0n},'😀'),{$:'Some',field0:'😀'});assert.deepEqual(api.bind({$:'Some',field0:-1n}),{$:'Some',field0:-1n});assert.deepEqual(api.nested({$:'None'}),{$:'None'});assert.equal(api.fallback({$:'None'}),0n);assert.equal(api.text({$:'Some',field0:''},'unused'),'');assert.equal(api.text({$:'None'},'😀'),'😀');assert.deepEqual(api.branches({$:'Some',field0:false}),{$:'Some',field0:18446744073709551615n});},{childTimeoutMs:20000});
});
function workspace(t,caller=source){const root=mkdtempSync(join(tmpdir(),'router-callback-adoption-'));t.after(()=>rmSync(root,{recursive:true,force:true}));for(const [path,source]of Object.entries({...files(caller),'Cargo.toml':dependencies.manifest,'Cargo.lock':dependencies.lock})){mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),source);}for(const args of [['init','-q'],['-c','core.hooksPath=/dev/null','add','.'],['-c','core.hooksPath=/dev/null','-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','source baseline']])execFileSync('git',args,{cwd:root,stdio:'pipe',timeout:10000});return root;}
test('packets preserve complete source equations and installation freshly checks selected entire bodies',limits,async t=>{
 const root=workspace(t),out=join(root,'..','callback-packets-'+root.split('/').at(-1));t.after(()=>rmSync(out,{recursive:true,force:true}));const report=await proposeCoreAdoptionSequence({root,output:out},'primitive-option-callback-methods','gzip');assert.equal(report.semanticAdmission,false);const options={root,functions:[{path:'src/lib.rs',name:'fallback'}]},plan=planCheckedPrimitiveOptionCallbackMethodAdoption(options);assert.equal(plan.wholeRouterSynchronization,false);assert.equal(plan.crossInvocationCache,false);const forged=structuredClone(plan);forged.outputs[0].after+='\n// forged\n';assert.throws(()=>applyCheckedPrimitiveOptionCallbackMethodAdoption(JSON.stringify(forged),options));applyCheckedPrimitiveOptionCallbackMethodAdoption(JSON.stringify(plan),options);assert.match(readFileSync(join(root,'src/lib.rs'),'utf8'),/translation_primitive_option_callbacks_core::u64_unwrap_or_else/u);
});
test('unknown callback shapes mutable bindings and body lies remain proposals or preserved refusals',limits,t=>{
 for(const caller of ['pub fn bad(mut value:Option<u64>)->Option<u64>{value.map(|item|item)}','pub fn bad(value:Option<u64>)->Option<u64>{value.map(|item:u32|item)}','pub fn bad(value:Option<u64>)->Option<u64>{value.map(|item|unknown(item))}'])assert.equal(propose(caller).proposals.flatMap(row=>row.selections).length,0);const root=workspace(t,'pub fn bad(value:Option<u64>)->Option<u64>{value.map(|item|->u64{false})}');assert.throws(()=>planCheckedPrimitiveOptionCallbackMethodAdoption({root,functions:[{path:'src/lib.rs',name:'bad'}]}));
});
test('four complete source copies retain original sources both rule sequences and exact inverses',limits,()=>{const plan=preparePrimitiveOptionCallbackMethodAdoption();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});

// Independent Result adoption/installer regression SOURCE. Unrun during drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {proposeCorePrimitiveResultMethodCorpus} from '../migrate-core-primitive-result-methods.mjs';
import {proposeCoreAdoptionSequence} from '../propose-primitive-result-method-adoption-corpus.mjs';
import {planCheckedPrimitiveResultMethodAdoption,applyCheckedPrimitiveResultMethodAdoption} from '../checked-primitive-result-method-adoption.mjs';
import {preparePrimitiveResultMethodAdoption} from '../prepare-primitive-result-method-adoption.mjs';
import {PRIMITIVE_RESULT_NATIVE_SOURCE} from '../primitive-result-native-source.mjs';
import {TEXT_NATIVE_SOURCE} from '../text-native-source.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {translateProject} from '../project.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {verifyTypedTargets} from './text-typed-targets.mjs';
const limits={timeout:60000},dependencies={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
const source=`pub fn fallback(value:Result<u64,String>)->u64{value.unwrap_or(0)}
pub fn success(value:Result<bool,String>)->bool{value.is_ok()}
pub fn unwrap_error(value:Result<bool,String>)->String{value.unwrap_err()}
pub fn owned(value:Result<&str,String>)->String{value.unwrap_or("").to_owned()}
pub fn mapped(value:Result<u64,String>)->Result<u64,String>{value.map(|item|item)}
pub fn bound(value:Result<i64,String>)->Result<i64,String>{value.and_then(|item|Ok(item))}
pub fn nested(value:Result<u64,String>)->Result<u64,String>{value.map(|item|item).and_then(|item|Ok(item))}
pub fn changed_error(value:Result<u64,String>)->Result<u64,String>{value.map_err(|error|error)}
pub fn recovered(value:Result<u64,String>)->Result<u64,String>{value.or_else(|error|Ok(0))}
pub fn lazy(value:Result<u64,String>)->u64{value.unwrap_or_else(|error|0)}
`;
function files(caller=source){return {'src/lib.rs':'pub mod translation_core;\npub mod translation_text_core;\npub mod translation_primitive_results_core;\n'+caller,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_text_core.rs':TEXT_NATIVE_SOURCE,'src/translation_primitive_results_core.rs':PRIMITIVE_RESULT_NATIVE_SOURCE};}
const propose=caller=>proposeCorePrimitiveResultMethodCorpus({files:files(caller),dependencyInputs:dependencies});
test('closed ordinary Result methods and callback chains retain full inverse proposals and actual executable callers',limits,async()=>{
 const proposal=propose(source),root=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.equal(root.selections.length,10);assert.equal(root.selections.find(row=>row.function==='nested').operations.length,2);assert.equal(proposal.executableAdmission,false);for(const row of proposal.proposals){assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,row.before.source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,row.before.source);}
 const result=translateProject({entry:'src/lib.rs',paths:Object.keys(proposal.after),readSource:path=>proposal.after[path],jsonMacroDependencies:loadJsonMacroSourceProof(dependencies),deriveDependencies:loadDeriveDependencyProof(dependencies),cargoManifest:dependencies.manifest,compilationProfile:PRODUCTION_PROFILE});for(const name of ['fallback','success','unwrap_error','owned','mapped','bound','nested','changed_error','recovered','lazy'])assert.ok(result.meta.executable.some(row=>row.name===name),JSON.stringify(result.meta.refused));await verifyTypedTargets(result,api=>{assert.equal(api.fallback({$:'Err',field0:''}),0n);assert.equal(api.success({$:'Ok',field0:false}),true);assert.equal(api.unwrap_error({$:'Err',field0:''}),'');assert.equal(api.owned({$:'Ok',field0:''}),'');assert.deepEqual(api.mapped({$:'Ok',field0:18446744073709551615n}),{$:'Ok',field0:18446744073709551615n});assert.deepEqual(api.bound({$:'Ok',field0:-9223372036854775808n}),{$:'Ok',field0:-9223372036854775808n});assert.deepEqual(api.nested({$:'Err',field0:'old'}),{$:'Err',field0:'old'});assert.deepEqual(api.changed_error({$:'Err',field0:'é😀'}),{$:'Err',field0:'é😀'});assert.deepEqual(api.recovered({$:'Err',field0:''}),{$:'Ok',field0:0n});assert.equal(api.lazy({$:'Ok',field0:0n}),0n);assert.equal(api.lazy({$:'Err',field0:'old'}),0n);},{childTimeoutMs:20000});
});
function workspace(t,caller=source){const root=mkdtempSync(join(tmpdir(),'router-result-adoption-'));t.after(()=>rmSync(root,{recursive:true,force:true}));for(const [path,source]of Object.entries({...files(caller),'Cargo.toml':dependencies.manifest,'Cargo.lock':dependencies.lock})){mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),source);}for(const args of [['init','-q'],['-c','core.hooksPath=/dev/null','add','.'],['-c','core.hooksPath=/dev/null','-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','source baseline']])execFileSync('git',args,{cwd:root,stdio:'pipe',timeout:10000});return root;}
test('complete compressed packets and selected fresh installation preserve whole current source equations',limits,async t=>{
 const root=workspace(t),output=join(root,'..','result-packets-'+root.split('/').at(-1));t.after(()=>rmSync(output,{recursive:true,force:true}));const receipt=await proposeCoreAdoptionSequence({root,output},'primitive-result-methods','gzip');assert.equal(receipt.sequence,'primitive-result-methods');assert.equal(receipt.semanticAdmission,false);const options={root,functions:[{path:'src/lib.rs',name:'fallback'}]},plan=planCheckedPrimitiveResultMethodAdoption(options),changed=plan.outputs.find(row=>row.kind==='adopted-source');assert.equal(plan.functions.length,1);assert.equal(plan.crossInvocationCache,false);assert.match(changed.after,/translation_primitive_results_core::u64_unwrap_or/u);assert.ok(changed.after.includes('value.map(|item|item)'));const forged=structuredClone(plan);forged.outputs.find(row=>row.kind==='adopted-source').after+='\n// forged\n';assert.throws(()=>applyCheckedPrimitiveResultMethodAdoption(JSON.stringify(forged),options));applyCheckedPrimitiveResultMethodAdoption(JSON.stringify(plan),options);assert.equal(readFileSync(join(root,'src/lib.rs'),'utf8'),changed.after);
});
test('unknown result layouts mutable inputs and dishonest callback bodies cannot gain admission',limits,t=>{
 for(const caller of ['type Result<T,E>=Other<T,E>;\n'+source,'pub fn bad(mut value:Result<u64,String>)->u64{value.unwrap_or(0)}','pub fn bad(value:Result<u64,&str>)->u64{value.unwrap_or(0)}','pub fn bad(value:Result<String,String>)->String{value.unwrap()}','pub fn bad(value:Result<u64,String>)->Result<u64,String>{value.map(|item|unknown(item))}'])assert.equal(propose(caller).proposals.flatMap(row=>row.selections).length,0);const root=workspace(t,'pub fn bad(value:Result<u64,String>)->Result<u64,String>{value.map(|item|->u64{false})}');assert.throws(()=>planCheckedPrimitiveResultMethodAdoption({root,functions:[{path:'src/lib.rs',name:'bad'}]}));
});
test('four full source copies retain separate ordered stages and exact complete inverses',limits,()=>{const plan=preparePrimitiveResultMethodAdoption();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});

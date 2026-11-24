// Independent ordinary owned Result method SOURCE. Unrun during bulk drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {proposeCoreOwnedResultMethodCorpus} from '../migrate-core-owned-result-methods.mjs';
import {proposeCoreAdoptionSequence} from '../propose-owned-result-method-adoption-corpus.mjs';
import {planCheckedOwnedResultMethodAdoption,applyCheckedOwnedResultMethodAdoption} from '../checked-owned-result-method-adoption.mjs';
import {prepareOwnedResultMethodAdoption} from '../prepare-owned-result-method-adoption.mjs';
import {OWNED_RESULT_NATIVE_SOURCE} from '../owned-result-native-source.mjs';
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
const source=`pub fn fallback(value:Result<String,String>,other:String)->String{value.unwrap_or(other)}
pub fn unwrapped(value:Result<String,String>)->String{value.unwrap()}
pub fn mapped(value:Result<String,String>)->Result<String,String>{value.map(|item|item)}
pub fn bound(value:Result<String,String>)->Result<String,String>{value.and_then(|item|Ok(item))}
pub fn changed_error(value:Result<String,String>)->Result<String,String>{value.map_err(|error|error.to_string())}
pub fn lazy(value:Result<String,String>,fallback:&str)->String{value.unwrap_or_else(|error|fallback.to_owned())}
pub fn recovered(value:Result<String,String>)->Result<String,String>{value.or_else(|error|Ok("".to_owned()))}
pub fn optional(value:Result<String,String>)->Option<String>{value.ok()}
pub fn error_option(value:Result<String,String>)->Option<String>{value.err()}
pub fn copied(value:Result<&str,String>)->Result<String,String>{value.map(|item|item.to_owned())}
`;
function files(caller=source){return {'src/lib.rs':'pub mod translation_core;\npub mod translation_text_core;\npub mod translation_primitive_results_core;\npub mod translation_owned_results_core;\n'+caller,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_text_core.rs':TEXT_NATIVE_SOURCE,'src/translation_primitive_results_core.rs':PRIMITIVE_RESULT_NATIVE_SOURCE,'src/translation_owned_results_core.rs':OWNED_RESULT_NATIVE_SOURCE};}
const propose=caller=>proposeCoreOwnedResultMethodCorpus({files:files(caller),dependencyInputs:dependencies});
test('ordinary owned String Result methods keep complete inverses and qualify entire actual native callers',limits,async()=>{
 const proposal=propose(source),root=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.equal(root.selections.length,10);assert.equal(proposal.after['src/translation_primitive_results_core.rs'],PRIMITIVE_RESULT_NATIVE_SOURCE);assert.equal(proposal.after['src/translation_owned_results_core.rs'],OWNED_RESULT_NATIVE_SOURCE);assert.equal(proposal.executableAdmission,false);for(const row of proposal.proposals){assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,row.before.source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,row.before.source);}
 const result=translateProject({entry:'src/lib.rs',paths:Object.keys(proposal.after),readSource:path=>proposal.after[path],jsonMacroDependencies:loadJsonMacroSourceProof(dependencies),deriveDependencies:loadDeriveDependencyProof(dependencies),cargoManifest:dependencies.manifest,compilationProfile:PRODUCTION_PROFILE});for(const name of ['fallback','unwrapped','mapped','bound','changed_error','lazy','recovered','optional','error_option','copied'])assert.ok(result.meta.executable.some(row=>row.name===name),JSON.stringify(result.meta.refused));await verifyTypedTargets(result,api=>{assert.equal(api.fallback({$:'Ok',field0:''},'unused'),'');assert.equal(api.fallback({$:'Err',field0:''},'😀'),'😀');assert.equal(api.unwrapped({$:'Ok',field0:'é😀'}),'é😀');assert.deepEqual(api.mapped({$:'Ok',field0:''}),{$:'Ok',field0:''});assert.deepEqual(api.bound({$:'Err',field0:'old'}),{$:'Err',field0:'old'});assert.deepEqual(api.changed_error({$:'Err',field0:''}),{$:'Err',field0:''});assert.equal(api.lazy({$:'Err',field0:'old'},'😀'),'😀');assert.deepEqual(api.recovered({$:'Err',field0:''}),{$:'Ok',field0:''});assert.deepEqual(api.optional({$:'Ok',field0:''}),{$:'Some',field0:''});assert.deepEqual(api.error_option({$:'Err',field0:''}),{$:'Some',field0:''});assert.deepEqual(api.copied({$:'Ok',field0:'é😀'}),{$:'Ok',field0:'é😀'});},{childTimeoutMs:20000});
});
function workspace(t,caller=source){const root=mkdtempSync(join(tmpdir(),'router-owned-result-adoption-'));t.after(()=>rmSync(root,{recursive:true,force:true}));for(const [path,source]of Object.entries({...files(caller),'Cargo.toml':dependencies.manifest,'Cargo.lock':dependencies.lock})){mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),source);}for(const args of [['init','-q'],['-c','core.hooksPath=/dev/null','add','.'],['-c','core.hooksPath=/dev/null','-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','source baseline']])execFileSync('git',args,{cwd:root,stdio:'pipe',timeout:10000});return root;}
test('complete compressed packets and fresh selected installation retain the two original native implementations',limits,async t=>{
 const root=workspace(t),output=join(root,'..','owned-result-packets-'+root.split('/').at(-1));t.after(()=>rmSync(output,{recursive:true,force:true}));const receipt=await proposeCoreAdoptionSequence({root,output},'owned-result-methods','gzip');assert.equal(receipt.sequence,'owned-result-methods');assert.equal(receipt.semanticAdmission,false);const options={root,functions:[{path:'src/lib.rs',name:'fallback'}]},plan=planCheckedOwnedResultMethodAdoption(options),changed=plan.outputs.find(row=>row.kind==='adopted-source');assert.equal(plan.functions.length,1);assert.equal(plan.crossInvocationCache,false);assert.match(changed.after,/translation_owned_results_core::text_unwrap_or/u);const forged=structuredClone(plan);forged.outputs.find(row=>row.kind==='adopted-source').after+='\n// forged\n';assert.throws(()=>applyCheckedOwnedResultMethodAdoption(JSON.stringify(forged),options));applyCheckedOwnedResultMethodAdoption(JSON.stringify(plan),options);assert.equal(readFileSync(join(root,'src/translation_primitive_results_core.rs'),'utf8'),PRIMITIVE_RESULT_NATIVE_SOURCE);assert.equal(readFileSync(join(root,'src/translation_owned_results_core.rs'),'utf8'),OWNED_RESULT_NATIVE_SOURCE);
});
test('unknown success/error layouts mutable inputs and dishonest callback annotations remain refused',limits,t=>{
 for(const caller of ['type String=Other;\n'+source,'pub fn bad(mut value:Result<String,String>)->String{value.unwrap()}','pub fn bad(value:Result<Vec<String>,String>)->Vec<String>{value.unwrap()}','pub fn bad(value:Result<String,&str>)->String{value.unwrap()}','pub fn bad(value:Result<String,String>)->Result<String,String>{value.map(|item|unknown(item))}'])assert.equal(propose(caller).proposals.flatMap(row=>row.selections).length,0);const root=workspace(t,'pub fn bad(value:Result<String,String>)->Result<String,String>{value.map(|item|->String{false})}');assert.throws(()=>planCheckedOwnedResultMethodAdoption({root,functions:[{path:'src/lib.rs',name:'bad'}]}));
});
test('four complete selector/corpus/packet/installer source copies retain both ordered histories',limits,()=>{const plan=prepareOwnedResultMethodAdoption();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});

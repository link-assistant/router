// Independent source-bound sequence/regression SOURCE. Every case is unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {repositorySourceURL,repositoryWorkspaceManifestURL} from './fixtures/repository-paths.mjs';
import {proposeSourceBackedCoreAdoptionSequence,reviewSourceBackedCoreAdoptionSequence} from '../source-bound-core-adoption-sequence.mjs';
import {proposePhysicalCoreAdoptionSequence,reviewPhysicalCoreAdoptionSequence} from '../source-bound-physical-core-adoption-sequence.mjs';
import {createSourceBackedFormattingInspection} from '../source-bound-formatting-support.mjs';
import {resolveModuleGraph} from '../project.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_BASE64_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
import {prepareSourceBoundAdoptionSequenceSources} from '../prepare-source-bound-adoption-sequence-sources.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const limits={timeout:60000},root=new URL('../../../',import.meta.url),dependencyInputs={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')};
const application='#[rustfmt::skip]pub fn formatted(value:u8)->String{format!("value={value}")}\n#[rustfmt::skip]pub fn accepted(value:&crate::translation_core::Str)->bool{matches!(value,"a"|"😀")}\n#[rustfmt::skip]pub fn values()->Vec<u8>{vec![0u8,255u8]}\n';
const files=()=>({'rust/src/lib.rs':'pub mod translation_core;pub mod app;','rust/src/app.rs':application,'rust/src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'rust/src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'rust/src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'rust/src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE,'rust/src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE});
function propose(){return proposeSourceBackedCoreAdoptionSequence({entry:'rust/src/lib.rs',files:files(),dependencyInputs,compilationProfile:PRODUCTION_PROFILE});}
const clone=value=>JSON.parse(JSON.stringify(value));
test('all three actual source producers compose tool-owned functions and retain every native attribute',limits,()=>{
 const result=propose(),review=reviewSourceBackedCoreAdoptionSequence(clone(result));assert.deepEqual(result.history.map(row=>row.name),['formatting','matches','vectors']);assert.deepEqual(result.summary.stepSelections.map(row=>row.selectedFunctions),[1,1,1]);assert.equal(result.summary.distinctCandidateFunctions,3);assert.equal(result.semanticAdmission,false);assert.equal(result.executableCoverageGain,null);assert.equal(result.newAcrossInvocationCache,false);assert.equal(review.completeSourceInverse,true);
 const final=result.files['rust/src/app.rs'];assert.equal(final.split('#[rustfmt::skip]').length,4);for(const document of result.documents)assert.equal(transportConcreteSyntaxMeta(document.meta).source,document.source);
 for(const history of result.history){assert.ok(history.proposal.bindingInspections.some(row=>row.path==='rust/src/app.rs'));assert.equal(history.proposal.producerEffects.executableAdmission,false);assert.equal(history.proposal.producerEffects.crossInvocationCache,false);}
});
test('readback reconstructs complete original inspection facts and refuses modified or omitted evidence',limits,()=>{
 const original=propose(),alterations=[result=>{result.history[0].proposal.producerEffects.dependenciesDigest='copied';},result=>{result.history[0].proposal.bindingInspections[0].sourceInspectionOnly=false;},result=>{const rows=result.history[0].proposal.bindingInspections;rows.push(clone(rows[0]));},result=>{result.history[0].proposal.bindingInspections=[];},result=>{result.history[0].proposal.producerEffects.copiedAuthority=true;}];
 for(const alter of alterations){const candidate=clone(original);alter(candidate);assert.throws(()=>reviewSourceBackedCoreAdoptionSequence(candidate),/inspection|producer effects/u);}
});
test('no-derive direct inspection preserves full source inverse and keeps Cargo as unverified source data',limits,()=>{
 const entry='rust/src/lib.rs',source='#[rustfmt::skip]pub fn identity(value:bool)->bool{value}',graph=resolveModuleGraph({entry,paths:[entry],readSource:()=>source,compilationProfile:PRODUCTION_PROFILE}),inspection=createSourceBackedFormattingInspection(graph,dependencyInputs),row=inspection.forOriginalFile(entry,source);assert.equal(row.attributes.length,1);assert.equal(row.attributes[0].name,'rustfmt');assert.equal(row.inverse,source);assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,source);assert.equal(row.after.source.includes('#[rustfmt::skip]'),false);assert.equal(row.sourceInspectionOnly,true);assert.equal(row.executableAdmission,false);
 const result=inspection.finish();assert.equal(result.producerEffects.producerMode,'original-source-without-derive-v1');assert.equal(result.producerEffects.dependenciesDigest,null);assert.equal(result.producerEffects.deriveDependenciesVerified,false);assert.equal(result.producerEffects.executableAdmission,false);
});
test('tool-prefix shadows unknown attributes and module macros cannot be erased by direct inspection',limits,()=>{
 const entry='rust/src/lib.rs',base='#[rustfmt::skip]pub fn identity(value:bool)->bool{value}';
 for(const source of ['mod rustfmt{}'+base,'#[unknown]pub struct Hidden;'+base,'#![no_implicit_prelude]'+base]){const graph=resolveModuleGraph({entry,paths:[entry],readSource:()=>source,compilationProfile:PRODUCTION_PROFILE}),inspection=createSourceBackedFormattingInspection(graph,dependencyInputs),row=inspection.forOriginalFile(entry,source);assert.equal(row.attributes.length,0);assert.equal(row.after.source,source);}
 const source='unknown!();'+base,graph=resolveModuleGraph({entry,paths:[entry],readSource:()=>source,compilationProfile:PRODUCTION_PROFILE});assert.throws(()=>createSourceBackedFormattingInspection(graph,dependencyInputs).forOriginalFile(entry,source),/unknown original module macro producer/u);
});
test('physical multi-language layout retains current sources and refuses changed original files',limits,t=>{
 const directory=mkdtempSync(join(tmpdir(),'router-source-bound-sequence-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const input={...files(),'rust/Cargo.toml':dependencyInputs.manifest,'Cargo.lock':dependencyInputs.lock,'Cargo.toml':readFileSync(repositoryWorkspaceManifestURL(root),'utf8')};for(const [path,source]of Object.entries(input)){mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),source);}
 const result=proposePhysicalCoreAdoptionSequence(directory);assert.equal(result.sequence.entry,'rust/src/lib.rs');assert.equal(result.applicationSourcesInstalled,false);assert.equal(reviewPhysicalCoreAdoptionSequence(clone(result),directory).completeSourceInverse,true);assert.equal(readFileSync(join(directory,'rust/src/app.rs'),'utf8'),application);writeFileSync(join(directory,'rust/src/app.rs'),application+'\n');assert.throws(()=>reviewPhysicalCoreAdoptionSequence(result,directory),/source|original|physical/u);
});
test('eight complete source equations retain native owner spans two phases and full original inverses',limits,()=>{
 const plan=prepareSourceBoundAdoptionSequenceSources();assert.equal(plan.files.length,8);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});

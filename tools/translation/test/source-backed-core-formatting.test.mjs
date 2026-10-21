import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {proposeSourceBackedCoreFormattingCorpus} from '../source-backed-core-formatting.mjs';
import {proposeCoreFormattingCorpus} from '../propose-core-formatting-corpus.mjs';
import {prepareSourceBackedFormatting} from '../prepare-source-backed-formatting.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE} from '../router-core-formatting.mjs';
import {ROUTER_CORE_PRIMITIVES_SOURCE} from '../router-core-primitives.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {translateProject,resolveModuleGraph} from '../project.mjs';
import {createEnclosingCoreAdoptionProducerContext,coreAdoptionProducerClosedAttributeSpans} from '../core-adoption-producer-context.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {parseProgram,serializeProgram} from '../semantic-meta.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
const root=new URL('../../../',import.meta.url),dependencyInputs={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')};
const files=(source,parent='pub mod translation_core;pub mod app;')=>({'src/lib.rs':parent,'src/app.rs':source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE});
const options={timeout:60_000},row=proposal=>proposal.rows.find(row=>row.path==='src/app.rs');
const propose=input=>proposeSourceBackedCoreFormattingCorpus({files:input,dependencyInputs});
function inverses(proposal){
 for(const selected of proposal.rows.filter(row=>row.proposal)){
  const value=selected.proposal;assert.equal(transportConcreteSyntaxMeta(value.before.meta).source,value.before.source);assert.equal(transportConcreteSyntaxMeta(value.after.meta).source,value.after.source);
  let source=value.after.source;for(const edit of [...value.mapping].reverse())if(edit.kind==='substitution'){assert.equal(source.slice(...edit.after),edit.replacement);source=source.slice(0,edit.after[0])+edit.expected+source.slice(edit.after[1]);}assert.equal(source,value.before.source);
 }
 for(const inspection of proposal.bindingInspections){assert.equal(transportConcreteSyntaxMeta(inspection.before.meta).source,inspection.before.source);assert.equal(transportConcreteSyntaxMeta(inspection.after.meta).source,inspection.after.source);let source=inspection.after.source;for(const edit of [...inspection.edits].reverse()){assert.equal(source.slice(...edit.span),edit.replacement);source=source.slice(0,edit.span[0])+edit.expected+source.slice(edit.span[1]);}assert.equal(source,inspection.before.source);assert.equal(inspection.inverse,inspection.before.source);assert.equal(inspection.after.source.length,inspection.before.source.length);assert.deepEqual(inspection.trace.map(row=>row.phase),['language','repository']);}
}
test('source preparation copies complete original functions with native syntax and full CST inverse',options,()=>{
 const prepared=prepareSourceBackedFormatting();assert.equal(prepared.typescriptVersion,'5.9.3');assert.equal(prepared.originalPublicAPIsUnchanged,true);
 for(const file of prepared.files){assert.equal(file.current,file.after);assert.equal(transportConcreteSyntaxMeta(file.beforeMeta).source,file.original);assert.equal(transportConcreteSyntaxMeta(file.afterMeta).source,file.after);assert.equal(file.inverse,file.original);assert.deepEqual(file.trace.map(row=>row.phase),['language','repository']);}
});
test('old corpus remains unchanged and ordinary inputs retain its exact original proposals',options,()=>{
 const input=files('pub fn message(name:&str)->String{format!("hello {name}")}'),legacy=proposeCoreFormattingCorpus({files:input}),current=propose(input);
 assert.deepEqual(current.rows,legacy.rows);assert.deepEqual(current.summary,legacy.summary);inverses(current);assert.equal(current.semanticAdmission,false);assert.equal(current.producerEffects,null);
});
test('fresh original builtin derive closure permits formatting inspection while original attributes and strict targets survive',options,async()=>{
 const source='#[derive(Clone,Copy,Debug,Eq,PartialEq)]pub struct Marker{value:u8}\npub fn message(name:&str)->String{format!("hello {name}")}',input=files(source),legacy=proposeCoreFormattingCorpus({files:input}),proposal=propose(input);
 assert.equal(row(legacy).status,'skipped');assert.equal(row(proposal).status,'proposed');assert.equal(proposal.summary.selectedFunctions,1);assert.equal(proposal.producerEffects.selections.length,1);assert.ok(row(proposal).proposal.after.source.startsWith('#[derive(Clone,Copy,Debug,Eq,PartialEq)]'));assert.equal(row(proposal).proposal.before.source,source);inverses(proposal);
 const actual={...input,'src/app.rs':row(proposal).proposal.after.source},translated=translateProject({entry:'src/lib.rs',paths:Object.keys(actual),readSource:path=>actual[path],deriveDependencies:loadDeriveDependencyProof(dependencyInputs)}),wire=JSON.stringify(translated.meta.checkedSemanticProgram);assert.equal(serializeProgram(parseProgram(wire)),wire);assert.ok(translated.meta.executable.some(row=>row.name==='app.message'));
 await verifyTypedTargets(translated,api=>{for(const name of ['','Ω😀','e\u0301'])assert.equal(api['app.message'](name),'hello '+name);},{childTimeoutMs:20_000});
});
test('registered original Serde container and field helpers close inspection and preserve every original byte outside adoption edits',options,()=>{
 const source='#[derive(serde::Serialize)]\n#[serde(rename_all="camelCase")]\npub struct Marker{#[serde(rename="😀")]value:u8}\npub fn message()->String{format!("ok")}',proposal=propose(files(source));
 assert.equal(row(proposal).status,'proposed');inverses(proposal);const inspected=proposal.bindingInspections.find(row=>row.path==='src/app.rs');assert.deepEqual(inspected.attributes.map(row=>[row.name,row.position]),[['derive','container'],['serde','container'],['serde','field']]);assert.ok(row(proposal).proposal.after.source.includes('#[serde(rename="😀")]'));assert.equal(proposal.producerEffects.generatedImplBehavior,false);
});
test('unknown attrs helpers producers imports cfg and shadows remain original complete-source refusals',options,()=>{
 const body='pub fn message()->String{format!("ok")}',prefix='#[derive(Clone)]pub struct Marker{value:u8}';
 for(const source of ['#[unknown]'+prefix+body,'#[derive(Unknown)]pub struct Marker{value:u8}'+body,'#[derive(serde::Serialize)]pub struct Marker{#[serde(unknown)]value:u8}'+body,'use unknown::*;'+prefix+body,'macro_rules! format{()=>{"shadow"}}'+prefix+body,'unknown!();'+prefix+body]){
  const proposal=propose(files(source));assert.equal(row(proposal).status,'skipped',source);assert.equal(proposal.inputs.find(row=>row.path==='src/app.rs').source,source);inverses(proposal);
 }
 const inactive=propose(files(prefix+body,'pub mod translation_core;#[cfg(unknown)]pub mod app;'));assert.equal(row(inactive).status,'skipped');
 const absent=proposeSourceBackedCoreFormattingCorpus({files:files(prefix+body)});assert.equal(row(absent).status,'skipped');assert.equal(absent.producerEffects,null);
 const changed=proposeSourceBackedCoreFormattingCorpus({files:files(prefix+body),dependencyInputs:{...dependencyInputs,lock:dependencyInputs.lock+'\n'}});assert.equal(row(changed).status,'skipped');
});
test('private producer inputs reject copied contexts and a different physical source association',options,()=>{
 const input=files('#[derive(Clone)]pub struct Marker{value:u8}pub fn message()->String{format!("ok")}'),graph=resolveModuleGraph({entry:'src/lib.rs',paths:Object.keys(input),readSource:path=>input[path]}),context=createEnclosingCoreAdoptionProducerContext({modules:graph.modules,compilationProfile:graph.compilationProfile,dependencyInputs}),module=graph.modules.find(row=>row.file==='src/app.rs');
 assert.ok(coreAdoptionProducerClosedAttributeSpans(context,module).length);assert.deepEqual(coreAdoptionProducerClosedAttributeSpans(context,{...module,source:module.source+'\n'}),[]);assert.throws(()=>coreAdoptionProducerClosedAttributeSpans(structuredClone(context),module),/copied|foreign/);
});

// Independent actual macro/attribute/project source cases. All remain unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeScopedLocalDeclarativeSource} from '../scoped-local-declarative-source.mjs';
import {proposeAttributedScopedLocalDeclarativeSource} from '../attributed-scoped-local-declarative-source.mjs';
import {translateAttributedScopedLocalDeclarativeProject} from '../attributed-scoped-local-declarative-project.mjs';
import {withPassiveMacroAttributeValidation} from '../passive-macro-attribute-source.mjs';
import {captureSourceModuleViews,originalModuleViewItems} from '../source-module-views.mjs';
import {preparePassiveMacroAttributeSources} from '../prepare-passive-macro-attribute-sources.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const limits={timeout:60000},sourcePath='rust/src/lib.rs';
const definition='#[allow(unused_macros)]macro_rules! make {($name:ident,$value:literal)=>{#[allow(dead_code)]pub fn $name()->u8{$value}}}\n';
const propose=source=>proposeAttributedScopedLocalDeclarativeSource({source,sourcePath});
test('actual passive attributed definitions and generated items preserve scoped lexical inheritance and all source inverses',limits,()=>{
 const source='// 🌍 exact original positions\r\n'+definition+'pub mod child{make!(seven,7);pub mod nested{make!(nine,9);}}\nmake!(three,3);',result=propose(source);assert.equal(result.edits.length,3);assert.equal(result.refusals.length,0);assert.deepEqual(result.edits.map(row=>row.module),[['child'],['child','nested'],[]]);assert.ok(result.after.includes(definition));assert.match(result.after,/#\s*\[\s*allow\s*\(\s*dead_code\s*\)/u);assert.equal(result.history.inverse,source);
 for(const row of result.edits){assert.equal(source.slice(row.span.start,row.span.end),row.before);assert.equal(row.passiveAttributes.attributes.length,1);assert.equal(row.passiveAttributes.attributes[0].sourceDomain,'generated-expansion');assert.equal(row.passiveAttributes.attributes[0].originalCallerOwnerResolved,false);}assert.equal(result.namespaceAuthority,false);assert.equal(result.semanticAuthority,false);assert.equal(result.receivingExecuted,false);
 const legacy=proposeScopedLocalDeclarativeSource({source,sourcePath});assert.equal(legacy.edits.length,0);assert.equal(legacy.after,source);
});
test('original passive definition attributes and recursive surviving pure macros share one complete source operation',limits,()=>{
 const source=definition+'#[warn(unused_macros)]macro_rules! outer{($name:ident,$value:literal)=>{make!($name,$value);}}\nouter!(selected,4);',result=propose(source);assert.equal(result.edits.length,1);assert.equal(result.edits[0].expansion.receipts.length,1);assert.match(result.after,/fn selected/u);assert.equal(result.history.inverse,source);
 const stability='macro_rules! m{($name:ident)=>{#[stable(feature="fixture",since="1")]pub fn $name()->bool{true}}}m!(selected);',stable=propose(stability);assert.equal(stable.edits.length,1);assert.equal(stable.edits[0].passiveAttributes.attributes[0].name,'stable');assert.equal(stable.namespaceAuthority,false);
});
test('unknown derive cfg export raw qualified and macro-valued output attributes retain complete original invocations',limits,()=>{
 for(const attribute of ['#[unknown]','#[derive(Clone)]','#[cfg(unix)]','#[macro_export]','#[rustfmt::skip]','#[stable::transform]','#[allow(make!())]','#[allow(dead_code,dead_code)]']){
  const source='macro_rules! m{($name:ident)=>{'+attribute+'pub fn $name()->bool{true}}}m!(selected);',result=propose(source);if(attribute==='#[allow(dead_code,dead_code)]'){assert.equal(result.edits.length,1);continue;}assert.equal(result.edits.length,0,attribute);assert.equal(result.after,source);assert.ok(result.refusals.length>0,attribute);assert.equal(result.history.inverse,source);
 }
 for(const source of [definition+'#[allow(dead_code)]make!(selected,1);','#[unknown]'+definition+'make!(selected,1);','macro_rules! m{()=>{macro_rules! child{()=>{}}}}m!();','macro_rules! m{($name:ident)=>{pub fn $name(value:u8)->u8{value}}}m!(value);','macro_rules! m{()=>{$crate::other!();}}m!();']){const result=propose(source);assert.equal(result.edits.length,0,source);assert.equal(result.after,source);assert.equal(result.history.inverse,source);}
});
test('source validator closes saved capabilities on success throw and rejected async/thenable results',limits,()=>{
 let saved;const source=definition,captured=captureSourceModuleViews({source,sourcePath}),view=captured.views[0],module={file:sourcePath,path:[],source,sourceView:view,compilationProfile:view.compilationProfile},item=originalModuleViewItems(view,source)[0];
 const result=withPassiveMacroAttributeValidation(validator=>{saved=validator;const header=validator.header(module,item);assert.equal(header.closed,true);assert.equal(header.attributes[0].name,'allow');return validator.generated('#[allow(clippy::all)]pub fn selected()->bool{true}',{sourcePath});});assert.equal(result.attributes.length,1);assert.equal(result.namespaceAuthority,false);assert.throws(()=>saved.header(module,item),/closed/u);
 const failure=new Error('original source failure');assert.throws(()=>withPassiveMacroAttributeValidation(validator=>{saved=validator;throw failure;}),error=>error===failure);assert.throws(()=>saved.generated('pub fn selected(){}',{sourcePath}),/closed/u);let calls=0;assert.throws(()=>withPassiveMacroAttributeValidation(async()=>{calls++;}),/synchronous/u);assert.equal(calls,0);const thenable={};Object.defineProperty(thenable,'then',{get(){calls++;return ()=>{};}});assert.throws(()=>withPassiveMacroAttributeValidation(()=>thenable),/thenable/u);assert.equal(calls,0);
});
test('complete copied project re-enters checked enclosing frontend and both independent emitted targets',limits,async()=>{
 const source=definition+'pub mod child{make!(seven,7);}pub fn answer()->u8{child::seven()}',result=translateAttributedScopedLocalDeclarativeProject({entry:sourcePath,paths:[sourcePath],readSource:()=>source});assert.equal(result.sourceExpansion.proposals[0].edits.length,1);assert.equal(result.sourceExpansion.originalSourceEquivalenceQualified,false);assert.equal(result.sourceExpansion.originalApplicationCoverageQualified,false);assert.equal(result.sourceExpansion.proposals[0].history.inverse,source);assert.equal(result.meta.runtimeParity,false);await verifyTypedTargets(result,api=>assert.equal(api.answer(),7n),{childTimeoutMs:20000});
});
test('whole original source copy families retain original engine scopes both phases and exact inverses',limits,()=>{
 const plan=preparePassiveMacroAttributeSources();assert.equal(plan.files.length,5);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.sourceAuthority,false);assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});

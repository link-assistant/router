// Independent active conditional SOURCE draft. No case has been executed.
import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeActiveConditionalTrackedTextualSources} from '../tracked-local-declarative-source.mjs';
import {translateActiveConditionalCommentDocTrackedLocalDeclarativeProject} from '../active-conditional-comment-doc-tracked-local-declarative-project.mjs';
import {prepareActiveConditionalNormalizationSources} from '../prepare-active-conditional-normalization-sources.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const limits={timeout:60000},entry='rust/src/lib.rs';
function input(files,profile={flags:{test:false}}){return {entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:profile};}
function propose(source,profile){return proposeActiveConditionalTrackedTextualSources(input({[entry]:source},profile));}
test('known recursive predicates preserve payload order and exact inner/outer style with full source inverses',limits,()=>{
 const source='#![cfg_attr(not(test),doc="module α😀",forbid(unsafe_code))]\n#[cfg_attr(all(),doc="first",cfg_attr(any(),unknown),cfg_attr(not(test),doc="second",allow(dead_code)))]pub fn chosen()->u8{7}',result=propose(source);assert.equal(result.refusals.length,0);assert.equal(result.selections.length,2);assert.equal(result.files[0].after,'#![doc="module α😀"]#![forbid(unsafe_code)]\n#[doc="first"]#[doc="second"]#[allow(dead_code)]pub fn chosen()->u8{7}');assert.equal(result.files[0].history.inverse,source);assert.equal(result.selections[1].expansion.outputs.length,3);assert.equal(result.originalCompilerSource.selections.expandCfgAttrItem.name,'expand_cfg_attr_item');assert.equal(result.compilerDiagnosticTracePreserved,false);assert.equal(result.namespaceAuthority,false);assert.equal(result.originalSourceEquivalenceQualified,false);
});
test('false original attributes remove no body or attached documentation, including unknown inactive payloads and empty output lists',limits,()=>{
 const source='/// ordinary outer doc\n#[cfg_attr(any(),unknown)]#[cfg_attr(all(),)]pub fn chosen()->u8{7}',result=propose(source);assert.equal(result.refusals.length,0);assert.equal(result.selections.length,2);assert.equal(result.files[0].after,'/// ordinary outer doc\npub fn chosen()->u8{7}');assert.equal(result.files[0].history.inverse,source);
});
test('active cfg payloads retain the original item for the independent whole-item configuration stage',limits,()=>{
 const source='#[cfg_attr(all(),cfg(any()),doc="absent")]unknown!();',result=propose(source);assert.equal(result.refusals.length,0);assert.equal(result.files[0].after,'#[cfg(any())]#[doc="absent"]unknown!();');assert.equal(result.files[0].history.inverse,source);
});
test('known module macro_use payloads and actual child inner attributes preserve tracked source selection',limits,()=>{
 const files={[entry]:'#[cfg_attr(not(test),macro_use)]pub mod helpers;chosen!(after);','rust/src/helpers.rs':'#![cfg_attr(not(test),doc="helpers",allow(dead_code))]macro_rules! chosen {($name:ident)=>{pub fn $name()->u8{7}}}'},result=proposeActiveConditionalTrackedTextualSources(input(files));assert.equal(result.refusals.length,0);assert.equal(result.selections.length,2);assert.ok(result.files.find(row=>row.sourcePath===entry).after.startsWith('#[macro_use]'));for(const row of result.files)assert.equal(row.history.inverse,files[row.sourcePath]);
});
test('unknown predicates and actual active procedural/tool/raw/macro-valued payloads preserve their complete original sources',limits,()=>{
 for(const source of ['#[cfg_attr(unknown,doc="unselected")]pub fn chosen(){}','#[cfg_attr(all(),unknown)]pub fn chosen(){}','#[cfg_attr(all(),derive(Clone))]pub struct Chosen;','#[cfg_attr(all(),rustfmt::skip)]pub fn chosen(){}','#[cfg_attr(all(),r#doc="raw")]pub fn chosen(){}','#[cfg_attr(all(),doc=include_str!("doc.md"))]pub fn chosen(){}','#[cfg_attr(all(),crate_name="changed")]pub fn chosen(){}','#[cfg_attr(all(),crate_type="lib")]pub fn chosen(){}']){const result=propose(source);assert.equal(result.selections.length,0,source);assert.ok(result.refusals.length>0,source);assert.equal(result.files[0].after,source);assert.equal(result.files[0].history.inverse,source);}
 const unknown=propose('#[cfg_attr(test,doc="unknown")]pub fn chosen(){}',null);assert.ok(unknown.refusals.length>0);assert.equal(unknown.selections.length,0);
});
test('unknown enclosing producers and late inner attributes prevent nested source edits',limits,()=>{
 for(const source of ['#![unknown]\n#[cfg_attr(all(),doc="chosen")]pub fn chosen(){}','#[unknown]pub mod child{#[cfg_attr(all(),doc="chosen")]pub fn chosen(){}}','pub fn before(){}#![cfg_attr(all(),doc="late")]']){const result=propose(source);assert.equal(result.selections.length,0);assert.ok(result.refusals.length>0);assert.equal(result.files[0].after,source);}
});
test('whole source and explicit profile callbacks stay current throughout conditional expansion',limits,()=>{
 let calls=0;assert.throws(()=>proposeActiveConditionalTrackedTextualSources({entry,paths:[entry],readSource:()=>++calls===1?'#[cfg_attr(all(),doc="original")]pub fn chosen(){}':'#[cfg_attr(all(),doc="changed")]pub fn chosen(){}',compilationProfile:{flags:{test:false}}}),/source changed/u);const profile={flags:{test:false}};assert.throws(()=>proposeActiveConditionalTrackedTextualSources({entry,paths:[entry],readSource:()=>{profile.flags.test=true;return '#[cfg_attr(all(),doc="chosen")]pub fn chosen(){}';},compilationProfile:profile}),/profile changed/u);
});
test('all five physical source domains feed the existing independent JS and strict TS target path',limits,async()=>{
 const files={[entry]:'#![cfg_attr(not(test),doc="root",forbid(unsafe_code))]\n#[cfg_attr(not(test),macro_use)]pub mod helpers;chosen!(after);pub fn answer()->u8{after()}','rust/src/helpers.rs':'/*! helpers */#[cfg_attr(all(),doc="original macro",allow(dead_code))]macro_rules! chosen {($name:ident)=>{#[doc="generated"]pub fn $name()->u8{7}}}'},result=translateActiveConditionalCommentDocTrackedLocalDeclarativeProject(input(files)),expansion=result.sourceExpansion;assert.equal(expansion.activeConditioning.selections.length,3);assert.equal(expansion.lineDocumentation.selections.length,1);assert.equal(expansion.moduleExpansion.edits.length,1);for(const row of expansion.proposals){assert.equal(row.history.inverse,files[row.sourcePath]);assert.equal(row.activeConditionalHistory.inverse,files[row.sourcePath]);}assert.equal(expansion.originalApplicationCoverageQualified,false);await verifyTypedTargets(result,api=>{assert.equal(api.after(),7n);assert.equal(api.answer(),7n);},{childTimeoutMs:20000});
});
test('all five active conditional source equations keep full native owners both sequences and complete inverses',limits,()=>{
 const plan=prepareActiveConditionalNormalizationSources();assert.equal(plan.files.length,5);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});

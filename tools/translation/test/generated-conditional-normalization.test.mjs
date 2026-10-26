// Independent generated conditional SOURCE draft; all cases remain unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeGeneratedConditionalSource} from '../generated-conditional-source.mjs';
import {proposeConfiguredGeneratedTrackedLocalDeclarativeSources,proposeLiteralDocInnerLintModuleMacroUseTrackedLocalDeclarativeSources} from '../tracked-local-declarative-source.mjs';
import {withConfiguredLiteralDocMacroAttributeValidation} from '../passive-macro-attribute-source.mjs';
import {translateConfiguredGeneratedTrackedLocalDeclarativeProject} from '../configured-generated-tracked-local-declarative-project.mjs';
import {prepareGeneratedConditionalNormalizationSources} from '../prepare-generated-conditional-normalization-sources.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const limits={timeout:60000},entry='rust/src/lib.rs',profile={flags:{test:false}};
const fixture='macro_rules! chosen {()=>{#[cfg_attr(not(test),doc="generated α😀",allow(dead_code))]pub fn after()->u8{7}#[cfg_attr(all(),cfg(any()))]pub fn hidden()->u8{999}}}chosen!();';
function input(source){return {entry,paths:[entry],readSource:()=>source,compilationProfile:profile};}
test('generated source configuration retains native, active and configured whole source domains independently',limits,()=>{
 const source='#[cfg_attr(not(test),doc="generated α😀")]pub fn after()->u8{7}#[cfg(any())]pub fn hidden()->u8{999}',result=proposeGeneratedConditionalSource(source,{sourcePath:entry,compilationProfile:profile});assert.equal(result.before,source);assert.equal(result.after,'#[doc="generated α😀"]pub fn after()->u8{7}');assert.equal(result.history.inverse,source);assert.equal(result.active.files[0].history.inverse,source);assert.equal(result.configured.files[0].history.inverse,result.active.files[0].after);assert.equal(result.retainedRawBytes,Buffer.byteLength(source)+Buffer.byteLength(result.active.files[0].after)+Buffer.byteLength(result.after));assert.ok(result.observedSourceCells>0);assert.equal(result.namespaceAuthority,false);assert.equal(result.originalSourceEquivalenceQualified,false);
});
test('the source-normalizing macro frame independently validates each surviving actual generated doc/lint header',limits,()=>{
 const source='#[cfg_attr(all(),doc="generated",allow(dead_code))]pub fn after()->u8{7}',result=withConfiguredLiteralDocMacroAttributeValidation(validator=>validator.generated(source,{sourcePath:entry,compilationProfile:profile}));assert.equal(result.originalGeneratedSource,source);assert.equal(result.source,'#[doc="generated"]#[allow(dead_code)]pub fn after()->u8{7}');assert.deepEqual(result.attributes.map(row=>row.name),['doc','allow']);assert.ok(result.attributes.every(row=>row.sourceDomain==='generated-expansion'&&row.originalCallerOwnerResolved===false));assert.equal(result.sourceNormalization.history.inverse,source);
});
test('native expansion proof is immutable beside configured generated edits while the legacy expander retains its original refusal',limits,()=>{
 const result=proposeConfiguredGeneratedTrackedLocalDeclarativeSources(input(fixture));assert.equal(result.refusals.length,0);assert.equal(result.edits.length,1);const row=result.edits[0],normal=row.passiveAttributes.sourceNormalization;assert.ok(row.expansion.source.includes('cfg_attr'));assert.equal(normal.before,row.expansion.source);assert.equal(normal.history.inverse,row.expansion.source);assert.ok(!row.after.includes('cfg_attr'));assert.ok(!row.after.includes('hidden'));assert.ok(row.after.includes('after'));assert.equal(result.files[0].history.inverse,fixture);const legacy=proposeLiteralDocInnerLintModuleMacroUseTrackedLocalDeclarativeSources(input(fixture));assert.equal(legacy.edits.length,0);assert.ok(legacy.refusals.length>0);
});
test('unknown conditional producers and all original generated inner attributes remain refused even behind inactive cfg',limits,()=>{
 for(const source of ['#[cfg_attr(unknown,doc="unselected")]pub fn chosen(){}','#[cfg_attr(all(),unknown)]pub fn chosen(){}','#[cfg_attr(all(),derive(Clone))]pub struct Chosen;','#[cfg(any())]pub mod child{#![doc="inner"]}','#![cfg_attr(any(),unknown)]pub fn chosen(){}'])assert.throws(()=>withConfiguredLiteralDocMacroAttributeValidation(validator=>validator.generated(source,{sourcePath:entry,compilationProfile:profile})),/conditional|inner|producer/u,source);
 const absent=proposeGeneratedConditionalSource('#[cfg(any())]pub fn hidden()->u8{999}',{sourcePath:entry,compilationProfile:profile});assert.equal(absent.after,'');assert.equal(absent.history.inverse,absent.before);
});
test('complete generated source and tree bounds remain finite with full original inner refusal before source substitution',limits,()=>{
 assert.throws(()=>proposeGeneratedConditionalSource(' '.repeat(256001),{sourcePath:entry,compilationProfile:profile}),/bounded/u);assert.throws(()=>proposeGeneratedConditionalSource('#[cfg(any())]mod child{#![cfg_attr(any(),unknown)]}',{sourcePath:entry,compilationProfile:profile}),/inner/u);assert.throws(()=>proposeGeneratedConditionalSource('#[cfg_attr(test,doc="unknown")]pub fn chosen(){}',{sourcePath:entry}),/conditional|producer/u);
});
test('the copied checked project independently emits JS and strict TS from the configured actual macro result',limits,async()=>{
 const source=fixture+'pub fn answer()->u8{after()}',result=translateConfiguredGeneratedTrackedLocalDeclarativeProject(input(source)),row=result.sourceExpansion.moduleExpansion.edits[0];assert.equal(row.passiveAttributes.sourceNormalization.history.inverse,row.expansion.source);assert.equal(result.sourceExpansion.proposals[0].history.inverse,source);assert.equal(result.sourceExpansion.originalApplicationCoverageQualified,false);await verifyTypedTargets(result,api=>{assert.equal(api.after(),7n);assert.equal(api.answer(),7n);assert.equal(Object.hasOwn(api,'hidden'),false);},{childTimeoutMs:20000});
});
test('all six generated source equations preserve complete original native render consumers and both phase inverses',limits,()=>{
 const plan=prepareGeneratedConditionalNormalizationSources();assert.equal(plan.files.length,6);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});

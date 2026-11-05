// Independent SOURCE draft. No case has been executed.
import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeLineDocumentationTrackedTextualSources,proposeLiteralDocInnerLintConfiguredTrackedTextualSources,proposeLiteralDocInnerLintModuleMacroUseTrackedLocalDeclarativeSources} from '../tracked-local-declarative-source.mjs';
import {translateLineDocConfiguredTrackedLocalDeclarativeProject} from '../line-doc-configured-tracked-local-declarative-project.mjs';
import {prepareLineDocumentationNormalizationSources} from '../prepare-line-documentation-normalization-sources.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const limits={timeout:60000},entry='rust/src/lib.rs';
const fixture="//! module α😀\n#![forbid(unsafe_code)]\n/// original \"quote\" \\ α😀\nmacro_rules! chosen {($name:ident)=>{#[doc=\"generated\"]pub fn $name()->u8{7}}}\nchosen!(after);";
function input(files){return {entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:{flags:{test:false}}};}
function propose(source){return proposeLineDocumentationTrackedTextualSources(input({[entry]:source}));}
test('actual leading inner and attached outer line docs retain exact payloads and all original file inverses',limits,()=>{
 const result=propose(fixture);assert.equal(result.refusals.length,0);assert.equal(result.selections.length,2);assert.deepEqual(result.selections.map(row=>row.style),['inner','outer']);assert.equal(result.selections[1].value," original \"quote\" \\ α😀");assert.ok(result.files[0].after.startsWith('#![doc=" module α😀"]'));assert.equal(result.files[0].history.inverse,fixture);assert.equal(result.documentationSource.sourceInputs[0].inverse,fixture);assert.equal(result.originalSourceEquivalenceQualified,false);assert.equal(result.namespaceAuthority,false);const expanded=proposeLiteralDocInnerLintModuleMacroUseTrackedLocalDeclarativeSources(input({[entry]:result.files[0].after}));assert.equal(expanded.edits.length,1);assert.equal(expanded.refusals.length,0);
});
test('outer doc attachment precedes original false-cfg item removal without leaving an orphan attribute',limits,()=>{
 const source='//! module\n/// absent\n#[cfg(any())]unknown!();\n/// selected\n#[cfg(all())]pub fn chosen()->u8{7}',normalized=propose(source),conditioned=proposeLiteralDocInnerLintConfiguredTrackedTextualSources(input({[entry]:normalized.files[0].after}));assert.equal(normalized.refusals.length,0);assert.equal(normalized.selections.length,3);assert.equal(conditioned.refusals.length,0);assert.equal(conditioned.selections.length,2);assert.ok(!conditioned.files[0].after.includes('absent'));assert.ok(conditioned.files[0].after.includes('#[doc=" selected"]'));assert.equal(normalized.files[0].history.inverse,source);assert.equal(conditioned.files[0].history.inverse,normalized.files[0].after);
});
test('inline and external module docs use their own actual leading gaps and exact complete child sources',limits,()=>{
 const files={[entry]:'//! root\npub mod external;pub mod inline{//! inline\n/// own\npub fn chosen()->u8{9}}','rust/src/external.rs':'//! external\n/// own\npub fn chosen()->u8{7}'},result=proposeLineDocumentationTrackedTextualSources(input(files));assert.equal(result.refusals.length,0);assert.equal(result.selections.length,5);assert.deepEqual(result.selections.filter(row=>row.module.length).map(row=>row.module),[['inline'],['inline']]);for(const row of result.files)assert.equal(row.history.inverse,files[row.sourcePath]);
});
test('ordinary four-slash comments, non-doc block comments and literal lookalikes remain untouched',limits,()=>{
 const source='//// ordinary\n/**/\n/*** ordinary */\nmacro_rules! chosen {($name:ident)=>{pub fn $name()->u8{7}}}\n//// ordinary before call\nchosen!(after);pub fn text()->&\'static str{"/// literal"}',result=propose(source);assert.equal(result.selections.length,0);assert.equal(result.refusals.length,0);assert.equal(result.files[0].after,source);const expanded=proposeLiteralDocInnerLintModuleMacroUseTrackedLocalDeclarativeSources(input({[entry]:source}));assert.equal(expanded.edits.length,1);assert.equal(expanded.refusals.length,0);
});
test('dangling, misplaced, block, CR, control and function-body docs retain whole-source refusals',limits,()=>{
 for(const source of ['/// dangling','pub fn before(){}\n//! late','/// outer\n//! after outer\npub fn chosen(){}','/// outer\n#![allow(dead_code)]\npub fn chosen(){}','/** block */pub fn chosen(){}','//! carriage\\r\\npub fn chosen(){}','//! tab\\tvalue\\npub fn chosen(){}','pub fn chosen(){/// body\\nlet value=1;}'].map(source=>source.replaceAll('\\r','\u000d').replaceAll('\\n','\u000a').replaceAll('\\t','\u0009'))){const result=propose(source);assert.equal(result.selections.length,0,source);assert.ok(result.refusals.length>0,source);assert.equal(result.files[0].after,source);assert.equal(result.files[0].history.inverse,source);}
});
test('unknown enclosing and target producers preserve every source doc without granting ownership',limits,()=>{
 for(const source of ['#![unknown]\n//! root\npub fn chosen(){}','#[unknown]pub mod child{//! child\npub fn chosen(){}}','/// target\n#[unknown]pub fn chosen(){}','/// conditional\n#[cfg(unknown)]pub fn chosen(){}']){const result=propose(source);assert.equal(result.selections.length,0);assert.ok(result.refusals.length>0);assert.equal(result.files[0].after,source);assert.equal(result.sourceAuthority,false);assert.equal(result.originalApplicationCoverageQualified,false);}
});
test('current full source and explicit configuration profile are rejoined after reader callbacks',limits,()=>{
 let calls=0;assert.throws(()=>proposeLineDocumentationTrackedTextualSources({entry,paths:[entry],readSource:()=>++calls===1?'//! original\npub fn chosen(){}':'//! changed\npub fn chosen(){}',compilationProfile:{flags:{test:false}}}),/source changed/u);const profile={flags:{test:false}};assert.throws(()=>proposeLineDocumentationTrackedTextualSources({entry,paths:[entry],readSource:()=>{profile.flags.test=true;return '//! original\npub fn chosen(){}';},compilationProfile:profile}),/profile changed/u);
});
test('the copied checked project retains all four physical source domains and independent JS and strict TS targets',limits,async()=>{
 const source=fixture+'pub fn answer()->u8{after()}',result=translateLineDocConfiguredTrackedLocalDeclarativeProject(input({[entry]:source})),expansion=result.sourceExpansion;assert.equal(expansion.lineDocumentation.selections.length,2);assert.equal(expansion.moduleExpansion.edits.length,1);assert.equal(expansion.proposals[0].history.inverse,source);assert.equal(expansion.proposals[0].documentationHistory.inverse,source);assert.equal(expansion.proposals[0].configurationHistory.inverse,expansion.lineDocumentation.files[0].after);assert.equal(expansion.originalSourceEquivalenceQualified,false);await verifyTypedTargets(result,api=>{assert.equal(api.after(),7n);assert.equal(api.answer(),7n);},{childTimeoutMs:20000});
});
test('all four complete attachment source equations retain both sequences and full original inverses',limits,()=>{
 const plan=prepareLineDocumentationNormalizationSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});

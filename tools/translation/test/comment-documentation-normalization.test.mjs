// Independent block/line documentation SOURCE draft. All cases remain unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createOriginalCommentDocumentationSourceScope,createOriginalLiteralDocumentationSourceScope} from '../registered-builtin-caller-attribute-source.mjs';
import {proposeCommentDocumentationTrackedTextualSources,proposeLiteralDocInnerLintModuleMacroUseTrackedLocalDeclarativeSources} from '../tracked-local-declarative-source.mjs';
import {translateCommentDocConfiguredTrackedLocalDeclarativeProject} from '../comment-doc-configured-tracked-local-declarative-project.mjs';
import {originalMacroTrees,macroTreeSource} from '../macro-token-trees.mjs';
import {rustTokens} from '../rust-structure.mjs';
import {prepareCommentDocumentationNormalizationSources} from '../prepare-comment-documentation-normalization-sources.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const limits={timeout:60000},entry='rust/src/lib.rs';
function input(source){return {entry,paths:[entry],readSource:()=>source,compilationProfile:{flags:{test:false}}};}
test('fresh native block callback and cooked payload retain nested comment bytes, LF, tab, Unicode and exact full inverse',limits,()=>{
 const source='/*! module α😀\n\tline /* nested */ tail */\n/** outer "quote" \\ α😀\n * line\tvalue */\npub fn chosen()->u8{7}',comments=rustTokens(source).filter(row=>row.type==='comment'),scope=createOriginalCommentDocumentationSourceScope(),rows=comments.map(row=>scope.comment({sourcePath:entry,source,start:row.start,end:row.end}));assert.deepEqual(rows.map(row=>row.style),['inner','outer']);assert.ok(rows.every(row=>row.commentKind==='block'&&row.lexicalOnly&&row.callerOwnerResolved===false));assert.equal(rows[0].value,' module α😀\n\tline /* nested */ tail ');assert.equal(rows[1].value,' outer "quote" \\ α😀\n * line\tvalue ');const facts=scope.finish();assert.equal(facts.sourceInputs[0].inverse,source);assert.equal(facts.nativeSources.callbacks.block.name,'block_comment');assert.equal(facts.nativeSources.wholeCompilerExecuted,false);assert.throws(()=>scope.comment({sourcePath:entry,source,start:comments[0].start,end:comments[0].end}),/closed/u);
 const old=createOriginalLiteralDocumentationSourceScope();assert.equal(old.line({sourcePath:entry,source,start:comments[0].start,end:comments[0].end}),null);old.finish();const result=proposeCommentDocumentationTrackedTextualSources(input(source));assert.equal(result.refusals.length,0);assert.equal(result.selections.length,2);assert.ok(result.files[0].after.includes("#[doc=\" outer \\\"quote\\\" \\\\ α😀\\n * line\\tvalue \"]"));assert.equal(result.files[0].history.inverse,source);
});
test('actual macro token trees preserve original whole source and line/block feature positions without interpreting ordinary blocks',limits,()=>{
 const source='/** outer\n line */pub fn chosen(){}',trees=originalMacroTrees(source),original=macroTreeSource(trees);assert.equal(original.source,source);assert.equal(trees[0].sourceFeature,'original-block-doc-comment');assert.equal(trees[0].span.start,0);assert.equal(trees[0].span.end,source.indexOf('pub'));const ordinary='/**/ /*** ordinary */ //// ordinary\npub fn chosen(){}',plain=originalMacroTrees(ordinary);assert.equal(plain[0].text,'pub');assert.throws(()=>originalMacroTrees('/** bad\r */pub fn chosen(){}'),/escape profile/u);assert.throws(()=>originalMacroTrees('/** bad\u000b */pub fn chosen(){}'),/escape profile/u);
});
test('generated block documentation flows through actual macro expansion and independent literal attribute source checking',limits,()=>{
 const source='macro_rules! chosen {($name:ident)=>{/** generated\n * value\tα😀 */pub fn $name()->u8{7}}}chosen!(after);',result=proposeLiteralDocInnerLintModuleMacroUseTrackedLocalDeclarativeSources(input(source));assert.equal(result.refusals.length,0);assert.equal(result.edits.length,1);const attribute=result.edits[0].passiveAttributes.attributes[0];assert.equal(attribute.name,'doc');assert.equal(attribute.value,' generated\n * value\tα😀 ');assert.equal(attribute.originalCallerOwnerResolved,false);assert.equal(result.files[0].history.inverse,source);
});
test('block documentation uses the same actual attachment and unresolved owner refusals as line docs',limits,()=>{
 for(const source of ['/** dangling */','pub fn before(){}/*! late */','/** outer *//*! after outer */pub fn chosen(){}','/** outer */#![allow(dead_code)]pub fn chosen(){}','#![unknown]/*! module */pub fn chosen(){}','/** target */#[unknown]pub fn chosen(){}','/** carriage\r */pub fn chosen(){}','/** control\u000b */pub fn chosen(){}']){const result=proposeCommentDocumentationTrackedTextualSources(input(source));assert.equal(result.selections.length,0,source);assert.ok(result.refusals.length>0,source);assert.equal(result.files[0].after,source);assert.equal(result.files[0].history.inverse,source);}
});
test('the copied complete project emits actual JS and strict TS from preserved multiline inner/outer doc sources',limits,async()=>{
 const source='/*! module α😀\n\tline */#![forbid(unsafe_code)]/** outer\n line */pub fn chosen()->u8{7}',result=translateCommentDocConfiguredTrackedLocalDeclarativeProject(input(source));assert.equal(result.sourceExpansion.lineDocumentation.selections.length,2);assert.equal(result.sourceExpansion.proposals[0].history.inverse,source);assert.equal(result.sourceExpansion.originalSourceEquivalenceQualified,false);await verifyTypedTargets(result,api=>assert.equal(api.chosen(),7n),{childTimeoutMs:20000});
});
test('all six source equations preserve both phases, full originals and complete native/project dependencies',limits,()=>{
 const plan=prepareCommentDocumentationNormalizationSources();assert.equal(plan.files.length,6);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});

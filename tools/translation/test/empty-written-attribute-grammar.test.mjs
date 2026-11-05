// Independent written-source cases. ALL UNRUN; no native AST/owner qualification.
import test from 'node:test';
import assert from 'node:assert/strict';
import {parseOriginalEmptyWrittenAttribute as parse,captureOriginalEmptyWrittenAttribute as capture,originalEmptyWrittenAttributeFacts as facts,originalEmptyWrittenAttributeProgramSources as program,withOriginalEmptyWrittenAttributeGrammarOperation as scope} from '../empty-written-attribute-grammar.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {captureSourceModuleViews,originalSourceModuleItems} from '../source-module-views.mjs';
import {originalNamespaceAttributeHeaderSites,captureOriginalNamespaceAttributeHeader} from '../original-namespace-parser.mjs';
import {captureOriginalNormalUngatedItemBuiltinCaller,originalNormalUngatedParsedBuiltinCallerFacts} from '../registered-builtin-caller-attribute-source.mjs';
import {captureGeneratedItemHeaderSources} from '../generated-item-header-source.mjs';
import {captureReparsedEmptyAttributeHeaderSources} from '../reparsed-item-header-grammar.mjs';
import {proposeOriginalX86ReparsedAttributeGrammarSources} from '../architecture-reparsed-attribute-grammar.mjs';
import {prepareEmptyWrittenAttributeGrammarSources} from '../prepare-empty-written-attribute-grammar-sources.mjs';
const limits={timeout:60000};
function module(source){const file='__translation_candidates__/independent/empty-attributes.rs',captured=captureSourceModuleViews({source,sourcePath:file}),view=captured.views[0],module={file,path:[],source,sourceView:view,compilationProfile:view.compilationProfile};return {module,item:originalSourceModuleItems(module)[0]};}
function pending(row){for(const key of ['nativeCallerGrammarQualified','callerOwnerResolved','sourceAuthority','namespaceAuthority','runtimeAuthority','wholeCompilerExecuted','crossInvocationCache'])assert.equal(row[key],false,key);}
test('known empty builtin and unresolved tool paths reconstruct the complete written header through both phases',limits,()=>{
 scope(()=>{for(const [source,path]of [['#[inline]',['inline']],['#[cold]',['cold']],['#[must_use]',['must_use']],[' \t# [ rustfmt :: skip ]\r\n',['rustfmt','skip']]]){
  const row=parse(source);assert.equal(row.source,source);assert.equal(row.inverse,source);assert.equal(transportConcreteSyntaxMeta(row.concreteSyntax).source,source);assert.deepEqual(row.syntax.path,{absolute:false,segments:path});assert.equal(row.syntax.kind,'NormalAttribute');assert.equal(row.syntax.style,'Outer');assert.equal(row.syntax.safety,'Default');assert.deepEqual(row.syntax.arguments,{kind:'Empty'});assert.equal(row.writtenSourceGrammarQualified,true);assert.equal(row.sourceDomain,'written-source-header-reparse');assert.equal(row.opaqueMacroInputsQualified,false);assert.equal(row.originalCallerPresenceQualified,false);assert.equal(row.typePrefixAbsenceQualified,false);assert.equal(row.attributeValueSemanticsQualified,false);pending(row);assert.deepEqual(row.ruleTrace.map(rule=>rule.phase),['language','language','repository']);
 }});
});
test('the positive profile refuses unsupported forms instead of granting their grammar from balanced brackets',limits,()=>{
 scope(()=>{for(const source of ['#[custom]','#[inline()]','#[inline(always)]','#[doc="text"]','#![inline]','#[unsafe(inline)]','#[r#inline]','#[::inline]','#[rustfmt: :skip]','#[rustfmt::unknown]','#[é]','#[inline]#[cold]','#[inline] trailing','#[inline /* comment */]','#[inline','#[inline]]'])assert.throws(()=>parse(source),TypeError,source);});
 let reads=0;const object={toString(){reads++;return '#[inline]';}};assert.throws(()=>parse(object));assert.equal(reads,0);assert.throws(()=>parse(' '.repeat(4097)));assert.throws(()=>parse(null));
});
test('all twelve complete retained parser callbacks have CST inverses without claiming execution or caller ownership',limits,()=>{
 const row=program();assert.equal(row.profile,'rust-1.89-ordinary-outer-empty-ascii');assert.equal(row.callbacks.length,12);assert.equal(new Set(row.callbacks.map(callback=>callback.name)).size,12);assert.ok(row.registeredNames.includes('inline'));assert.ok(row.sourceCells>0&&row.sourceCells<=200000);pending(row);
 for(const callback of row.callbacks){assert.equal(callback.inverse,callback.original);assert.equal(transportConcreteSyntaxMeta(callback.concreteSyntax).source,callback.original);assert.ok(callback.owner);assert.ok(callback.syntax.length>0);}
});
test('private requests rejoin the genuine source header and refuse copied identities or changed carriers',limits,()=>{
 const source='#[inline] pub fn answer()->bool{true}',input=module(source);scope(()=>{
  const site=originalNamespaceAttributeHeaderSites({module:input.module,item:input.item,memberIndex:null}).sites[0],options={module:input.module,item:input.item,memberIndex:null,attributeSpan:site.attributeSpan},header=captureOriginalNamespaceAttributeHeader(options),request=capture(header,options),row=facts(request);
  assert.equal(row.originalHeaderAssociationRechecked,true);assert.equal(row.source,'#[inline]');pending(row);assert.throws(()=>facts({...request}));assert.throws(()=>capture({...header},options));
  const old=captureOriginalNormalUngatedItemBuiltinCaller(header,options),oldFacts=originalNormalUngatedParsedBuiltinCallerFacts(old);assert.equal(oldFacts.nativeCallerGrammarQualified,false);assert.equal(oldFacts.callerOwnerResolved,false);
  input.module.source+='\n// changed actual carrier\n';try{assert.throws(()=>facts(request));}finally{input.module.source=source;}assert.equal(facts(request).source,'#[inline]');
 });
});
test('copied header collection preserves every unsupported header and leaves the original API unchanged',limits,()=>{
 const input=module('#[inline]#[rustfmt::skip]#[repr(C)]pub fn answer()->bool{true}');scope(()=>{
  const row=captureReparsedEmptyAttributeHeaderSources(input.module,input.item),old=captureGeneratedItemHeaderSources(input.module,input.item);assert.equal(row.headers.length,3);assert.equal(row.refusals.length,0);assert.equal(row.emptyWrittenGrammar.length,2);assert.equal(row.emptyWrittenGrammarRefusals.length,1);assert.equal(row.emptyWrittenGrammarRefusals[0].originalAttribute,'#[repr(C)]');assert.equal(row.emptyWrittenGrammarRefusals[0].profileOnly,true);assert.equal(row.emptyWrittenGrammarRefusals[0].sourcePreserved,true);assert.equal(row.typePrefixAbsenceQualified,false);assert.equal(row.namespaceAuthority,false);assert.equal(Object.hasOwn(old,'emptyWrittenGrammar'),false);assert.deepEqual(row.headers,old.headers);assert.ok(row.sourceRecordCount<=512);
  for(const grammar of row.emptyWrittenGrammar){pending(grammar);assert.equal(grammar.originalCallerPresenceQualified,false);}
 });
});
test('operation state closes after nested failure and refuses async or thenable escape without getters',limits,()=>{
 let calls=0;assert.throws(()=>scope(async()=>{calls++;}));assert.equal(calls,0);assert.throws(()=>scope(new Proxy(()=>null,{apply(){calls++;}})));assert.equal(calls,0);let gets=0;assert.throws(()=>scope(()=>({get then(){gets++;return ()=>null;}})));assert.equal(gets,0);
 assert.throws(()=>scope(()=>{parse('#[inline]');scope(()=>{throw new Error('independent stop');});}),/independent stop/u);assert.equal(parse('#[cold]').syntax.path.segments[0],'cold');
});
test('the actual x86 proposal retains root parser sources and pending producer, owner and export checks',limits,()=>{
 const row=proposeOriginalX86ReparsedAttributeGrammarSources({paths:['crates/core_arch/src/x86/mod.rs']});assert.equal(row.grammarProgram.callbacks.length,12);pending(row.grammarProgram);assert.equal(row.macroOwnerResolved,false);assert.equal(row.typeNamespaceComplete,false);assert.equal(row.typePrefixAbsenceQualified,false);assert.equal(row.architectureExportsComplete,false);assert.equal(row.runtimeAuthority,false);assert.ok(row.remainingProducerObligations.length>0);assert.ok(row.renderedCells<=200000);assert.ok(row.headerSourceCount+row.namespaceFrames.length<=512);
 const units=row.generatedCandidates.flatMap(candidate=>[...candidate.units,...candidate.declarationUnits]);assert.ok(units.length>0);for(const unit of units){assert.ok(Array.isArray(unit.headerSource.emptyWrittenGrammar));assert.ok(Array.isArray(unit.headerSource.emptyWrittenGrammarRefusals));for(const grammar of unit.headerSource.emptyWrittenGrammar){pending(grammar);assert.equal(grammar.originalCallerPresenceQualified,false);}}
});
test('five complete source equations preserve exact originals, current text, inverses and phase order',limits,()=>{
 const plan=prepareEmptyWrittenAttributeGrammarSources();assert.equal(plan.files.length,5);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});

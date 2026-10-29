// Independent empty/delimited source grammar cases. ALL UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {parseOriginalWrittenAttribute as parse,originalWrittenAttributeProgramSources as program,captureOriginalWrittenAttribute as capture,originalWrittenAttributeFacts as facts,withOriginalWrittenAttributeGrammarOperation as scope} from '../written-attribute-grammar.mjs';
import {parseOriginalEmptyWrittenAttribute as emptyOnly} from '../empty-written-attribute-grammar.mjs';
import {captureSourceModuleViews,originalSourceModuleItems} from '../source-module-views.mjs';
import {originalNamespaceAttributeHeaderSites,captureOriginalNamespaceAttributeHeader} from '../original-namespace-parser.mjs';
import {captureReparsedDelimitedAttributeHeaderSources} from '../reparsed-delimited-item-header-grammar.mjs';
import {captureReparsedEmptyAttributeHeaderSources} from '../reparsed-item-header-grammar.mjs';
import {proposeOriginalX86WrittenAttributeGrammarSources} from '../architecture-written-attribute-grammar.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {prepareWrittenAttributeGrammarSources} from '../prepare-written-attribute-grammar-sources.mjs';
const limits={timeout:60000};
function pending(row){for(const key of ['nativeTokenTreeLexingQualified','opaqueMacroInputsQualified','originalCallerPresenceQualified','nativeCallerGrammarQualified','callerOwnerResolved','sourceAuthority','namespaceAuthority','runtimeAuthority','wholeCompilerExecuted','crossInvocationCache'])assert.equal(row[key],false,key);}
function module(source){const file='__translation_candidates__/independent/delimited.rs',captured=captureSourceModuleViews({source,sourcePath:file}),view=captured.views[0],module={file,path:[],source,sourceView:view,compilationProfile:view.compilationProfile};return {module,item:originalSourceModuleItems(module)[0]};}
test('common original attribute forms retain their exact nested argument trees and whole written CST',limits,()=>{
 scope(()=>{for(const [source,name,delimiter]of [['#[repr(C)]','repr','('],['#[repr(align(16))]','repr','('],['#[allow(dead_code, unused_imports)]','allow','('],['#[inline(always)]','inline','('],['#[allow[dead_code]]','allow','['],['#[allow{dead_code}]','allow','{'],['#[deprecated(note = "ASCII\\ntext")]','deprecated','(']]){
  const row=parse(source);assert.equal(row.syntax.path.segments[0],name);assert.equal(row.syntax.arguments.kind,'Delimited');assert.equal(row.syntax.arguments.delimiter,delimiter);assert.equal(row.syntax.arguments.original,source.slice(row.syntax.arguments.span.start,row.syntax.arguments.span.end));assert.equal(row.syntax.arguments.tokenMeaningQualified,false);assert.equal(row.inverse,source);assert.equal(transportConcreteSyntaxMeta(row.concreteSyntax).source,source);assert.equal(row.writtenSourceGrammarQualified,true);assert.equal(row.attributeValueSemanticsQualified,false);assert.equal(row.argumentMacroOwnerResolved,false);assert.equal(row.globalExportsClosed,false);pending(row);assert.deepEqual(row.ruleTrace.map(rule=>rule.phase),['language','language','repository']);
 }});
});
test('thirteen callbacks retain the actual token-tree parser and its original complete containing owner',limits,()=>{
 const row=program(),selected=row.callbacks.filter(callback=>callback.name==='parse_token_tree');assert.equal(row.callbacks.length,13);assert.equal(selected.length,1);assert.equal(row.profile,'rust-1.89-ordinary-outer-empty-or-delimited-ascii');assert.ok(row.sourceCells<=200000);pending(row);
 const callback=selected[0],source=row.nativeSources.find(source=>source.path===callback.path&&source.sourceSha256===callback.sourceSha256);assert.ok(source);assert.equal(source.source.slice(callback.span.start,callback.span.end),callback.original);assert.equal(callback.inverse,callback.original);assert.equal(transportConcreteSyntaxMeta(callback.concreteSyntax).source,callback.original);assert.ok(callback.owner.span.start<=callback.span.start&&callback.owner.span.end>=callback.span.end);assert.match(callback.original,/self\.parse_token_tree|self\.token_cursor/u);
});
test('empty forms remain accepted without widening the previous empty-only API or caller ownership',limits,()=>{
 scope(()=>{for(const source of ['#[inline]','#[cold]','#[rustfmt::skip]']){const row=parse(source),old=emptyOnly(source);assert.equal(row.syntax.arguments.kind,'Empty');assert.deepEqual(row.syntax.path,old.syntax.path);pending(row);assert.equal(row.typePrefixAbsenceQualified,false);}assert.throws(()=>emptyOnly('#[repr(C)]'));});
});
test('unsupported lexical forms custom paths equality unsafe/raw/inner headers and malformed delimiters remain explicit refusals',limits,()=>{
 scope(()=>{for(const source of ['#[custom(x)]','#[crate::custom(x)]','#[doc="text"]','#![allow(dead_code)]','#[unsafe(allow(dead_code))]','#[r#allow(dead_code)]','#[allow(/*comment*/dead_code)]','#[allow(é)]','#[deprecated(note=r"raw")]','#[deprecated(note="bad\\q")]','#[deprecated(note="unterminated)]','#[repr(012)]','#[repr(16u8)]','#[repr(C)] trailing','#[repr(C]]','#[repr(C)]#[inline]'])assert.throws(()=>parse(source),TypeError,source);});
 let coerced=0;assert.throws(()=>parse({toString(){coerced++;return '#[repr(C)]';}}));assert.equal(coerced,0);
});
test('private delimited header requests rejoin current original carriers and refuse forged identities',limits,()=>{
 const source='#[repr(C)]pub struct Packet(pub u8);',input=module(source);scope(()=>{const site=originalNamespaceAttributeHeaderSites({module:input.module,item:input.item,memberIndex:null}).sites[0],options={module:input.module,item:input.item,memberIndex:null,attributeSpan:site.attributeSpan},header=captureOriginalNamespaceAttributeHeader(options),request=capture(header,options),row=facts(request);assert.equal(row.syntax.arguments.kind,'Delimited');assert.equal(row.originalHeaderAssociationRechecked,true);pending(row);assert.throws(()=>facts({...request}));input.module.source+='\n';try{assert.throws(()=>facts(request));}finally{input.module.source=source;}assert.equal(facts(request).source,'#[repr(C)]');});
});
test('copied header collection promotes supported delimited profiles and preserves every other original header and refusal',limits,()=>{
 const input=module('#[repr(C)]#[allow(dead_code)]#[doc="equality stays separate"]pub struct Packet;');scope(()=>{const row=captureReparsedDelimitedAttributeHeaderSources(input.module,input.item),old=captureReparsedEmptyAttributeHeaderSources(input.module,input.item);assert.equal(row.headers.length,3);assert.equal(row.writtenGrammar.length,2);assert.equal(row.writtenGrammarRefusals.length,1);assert.equal(row.writtenGrammarRefusals[0].originalAttribute,'#[doc="equality stays separate"]');assert.equal(row.writtenGrammarRefusals[0].sourcePreserved,true);assert.equal(old.emptyWrittenGrammar.length,0);assert.equal(old.emptyWrittenGrammarRefusals.length,3);assert.deepEqual(row.headers,old.headers);assert.equal(row.typePrefixAbsenceQualified,false);assert.ok(row.sourceRecordCount<=512);for(const grammar of row.writtenGrammar)pending(grammar);});
});
test('nested failures and async/thenable refusal close source operations before the next fresh call',limits,()=>{
 assert.throws(()=>scope(()=>{parse('#[repr(C)]');scope(()=>{throw new Error('independent stop');});}),/independent stop/u);let invoked=0;assert.throws(()=>scope(async()=>{invoked++;}));assert.equal(invoked,0);let gets=0;assert.throws(()=>scope(()=>({get then(){gets++;return ()=>null;}})));assert.equal(gets,0);assert.equal(parse('#[allow(dead_code)]').syntax.arguments.kind,'Delimited');
});
test('actual x86 generated headers retain common argument profiles while all owner/export/type-prefix obligations remain open',limits,()=>{
 const row=proposeOriginalX86WrittenAttributeGrammarSources({paths:['crates/core_arch/src/x86/mod.rs']});assert.equal(row.grammarProgram.callbacks.length,13);pending(row.grammarProgram);for(const key of ['macroOwnerResolved','typeNamespaceComplete','typePrefixAbsenceQualified','architectureExportsComplete','runtimeAuthority'])assert.equal(row[key],false,key);assert.ok(row.remainingProducerObligations.length>0);assert.ok(row.renderedCells<=200000);assert.ok(row.headerSourceCount+row.namespaceFrames.length<=512);const units=row.generatedCandidates.flatMap(candidate=>[...candidate.units,...candidate.declarationUnits]),grammar=units.flatMap(unit=>unit.headerSource.writtenGrammar);assert.ok(grammar.some(row=>row.syntax.arguments.kind==='Delimited'));for(const result of grammar)pending(result);
});
test('five complete equations retain immutable originals current source inverses and both fixed phases',limits,()=>{
 const plan=prepareWrittenAttributeGrammarSources();assert.equal(plan.files.length,5);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});

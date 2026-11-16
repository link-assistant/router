// Independent source-domain regression SOURCE; every case remains UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {captureSourceModuleViews,originalSourceModuleItems} from '../source-module-views.mjs';
import {itemConfiguration,PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {rustTokens} from '../rust-structure.mjs';
import {captureOriginalNamespaceDocumentationExpression,captureOriginalNamespaceAttributeExpression,originalNamespaceAttributeExpressionFacts,originalNamespaceFunctionFacts,originalNamespaceFunctionMembers} from '../original-namespace-parser.mjs';
import {createOriginalStructuredDocumentationSourceScope,createOriginalCommonBuiltinCallerAttributeScope,withOriginalExpressionDocumentationSources} from '../registered-builtin-caller-attribute-source.mjs';
import {documentationArgumentMayExportMacros} from '../documentation-argument-uncertainty.mjs';
import {resolveModuleBindings} from '../module-bindings.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {translateExpressionDocumentationTrackedLocalDeclarativeProject} from '../expression-documentation-tracked-local-declarative-project.mjs';
import {prepareExpressionDocumentationSources} from '../prepare-expression-documentation-sources.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const limits={timeout:60000};
function input(source,memberIndex=null,name='doc'){
 const file='src/lib.rs',capture=captureSourceModuleViews({source,sourcePath:file}),module={file,path:[],source,sourceView:capture.views[0],compilationProfile:PRODUCTION_PROFILE},item=originalSourceModuleItems(module).find(row=>!row.comment);
 let tokens=item.tokens;if(memberIndex!==null){const member=originalNamespaceFunctionMembers({module,item})[memberIndex];tokens=rustTokens(source).filter(token=>token.start>=member.span.start&&token.end<=member.span.end);}
 const attribute=itemConfiguration(tokens,PRODUCTION_PROFILE).attributes.find(row=>row.name===name);return {module,item,attribute,options:{module,item,memberIndex,attributeSpan:{...attribute.span}}};
}
function legacyRefusal(){const row=input('#[doc=concat!("a","b")]pub fn selected(){}'),scope=createOriginalStructuredDocumentationSourceScope();try{assert.equal(scope.attribute(row.module,row.item,row.attribute),null);}finally{scope.finish();}}
test('inner and outer expression captures retain genuine source and distinct private frame domains',limits,()=>{
 for(const source of ['#![doc=include_str!("missing-source-only.md")]\npub fn selected(){}','#[doc=concat!("a","b")]pub fn selected(){}']){
  const row=input(source),token=captureOriginalNamespaceDocumentationExpression(row.options),facts=originalNamespaceAttributeExpressionFacts(token,row.options);assert.equal(facts.source.attributeStyle,source.startsWith('#!')?'inner':'outer');assert.equal(facts.ast.kind,'OpaqueBang');assert.equal(transportConcreteSyntaxMeta(facts.concreteSyntax).source,source);assert.equal(facts.attributeValueSemanticsQualified,false);assert.equal(facts.globalExportsClosed,false);
  assert.throws(()=>originalNamespaceAttributeExpressionFacts({...token},row.options),/copied or foreign/u);assert.throws(()=>originalNamespaceFunctionFacts(token,{module:row.module,item:row.item,memberIndex:null}),/copied or foreign/u);assert.throws(()=>captureOriginalNamespaceDocumentationExpression({...row.options,item:{...row.item}}));if(source.startsWith('#!'))assert.throws(()=>captureOriginalNamespaceAttributeExpression(row.options));
 }
 const other=input('#[must_use="reason"]pub fn selected(){}',null,'must_use');assert.throws(()=>captureOriginalNamespaceDocumentationExpression(other.options),/documentation equality/u);
});
test('the explicit scope retains macro-valued inner documentation without claiming value or global closure',limits,()=>{
 legacyRefusal();withOriginalExpressionDocumentationSources(()=>{const row=input('#![doc=unknown!("value")]\npub fn selected(){}'),scope=createOriginalStructuredDocumentationSourceScope();try{const selected=scope.innerItem(row.module,row.item);assert.ok(selected);const doc=selected.attributes[0];assert.equal(doc.style,'inner');assert.equal(doc.expressionSyntaxOnly,true);assert.equal(doc.argumentMacroOwnerResolved,false);assert.equal(doc.attributeValueSemanticsQualified,false);assert.equal(doc.globalMacroEffectsPending,true);assert.equal(doc.globalExportsClosed,false);assert.equal(doc.expressionFacts.source.originalValue,'unknown!("value")');}finally{const result=scope.finish();assert.ok(result.expressionConfinement);assert.equal(result.runtimeAuthority,false);}});legacyRefusal();
});
test('impl and trait metadata select actual members under their complete original source owner',limits,()=>{
 for(const source of ['impl Record{#[inline]#[doc=concat!("member"," docs")]fn selected(){}}','trait Record{#[inline]#[doc=concat!("member"," docs")]fn selected(){}}'])withOriginalExpressionDocumentationSources(()=>{
  const doc=input(source,0),inline=input(source,0,'inline'),docs=createOriginalStructuredDocumentationSourceScope(),builtins=createOriginalCommonBuiltinCallerAttributeScope();try{const selected=docs.attribute(doc.module,doc.item,doc.attribute),builtin=builtins.at(inline.module,inline.item,inline.attribute);assert.ok(selected);assert.ok(builtin);assert.equal(selected.memberIndex,0);assert.equal(builtin.memberIndex,0);assert.ok(selected.expressionFacts.source.originalItem.startsWith(source.startsWith('impl')?'impl':'trait'));assert.ok(selected.selectedSpan.start>selected.expressionFacts.source.itemSpan.start);assert.equal(builtin.nativeLayoutQualified,false);}finally{docs.finish();builtins.finish();}
 });
});
test('full cfg token forms preserve inner and outer macro effects while literal metadata remains closed',limits,()=>{
 for(const prefix of ['#[','#!['])for(const [expression,expected]of [['"literal"',false],['unknown!("value")',true]]){const source=prefix+'doc='+expression+']\npub fn selected(){}',row=input(source);assert.equal(documentationArgumentMayExportMacros(row.attribute),expected);const result=resolveModuleBindings({modules:[{file:'src/lib.rs',path:[],source}],compilationProfile:PRODUCTION_PROFILE}),root=result.scopes.find(row=>row.path.length===0);for(const key of ['unresolvedMacroScope','unresolvedBangMacroScope','unresolvedAttributeMacroScope'])assert.equal(root[key],expected,key);}
});
test('the restoring operation rejects asynchronous and accessor results without evaluating getters',limits,()=>{
 legacyRefusal();const error=new Error('restore');assert.throws(()=>withOriginalExpressionDocumentationSources(()=>{throw error;}),value=>value===error);legacyRefusal();assert.throws(()=>withOriginalExpressionDocumentationSources(async()=>1),/synchronous/u);legacyRefusal();let touched=false;assert.throws(()=>withOriginalExpressionDocumentationSources(()=>Object.defineProperty({},'then',{get(){touched=true;throw Error('getter');}})),/thenable\/accessor/u);assert.equal(touched,false);legacyRefusal();
});
test('the complete copied project retains independent JS and strict TypeScript cases and open source equivalence',limits,async()=>{
 const source='#[doc=concat!("root"," docs")]pub fn selected(value:bool)->bool{value}',result=translateExpressionDocumentationTrackedLocalDeclarativeProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,compilationProfile:PRODUCTION_PROFILE});assert.ok(result.meta.executable.some(row=>row.name==='selected'),JSON.stringify(result.meta.refused));await verifyTypedTargets(result,api=>{assert.equal(api.selected(false),false);assert.equal(api.selected(true),true);},{childTimeoutMs:20000});assert.equal(result.sourceExpansion.originalSourceEquivalenceQualified,false);assert.equal(result.sourceExpansion.originalApplicationCoverageQualified,false);assert.equal(result.meta.runtimeParity,false);
});
test('all eight complete equations retain native owners both substitution sequences and whole source inverses',limits,()=>{
 const plan=prepareExpressionDocumentationSources();assert.equal(plan.files.length,8);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});

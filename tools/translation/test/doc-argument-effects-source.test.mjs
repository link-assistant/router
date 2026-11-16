// Independent namespace/effect repair SOURCE; all cases remain unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {documentationArgumentMayExportMacros,captureOriginalDocExpressionSourceEffects} from '../original-doc-expression-effects.mjs';
import {resolveModuleBindings} from '../module-bindings.mjs';
import {captureSourceModuleViews,originalSourceModuleItems} from '../source-module-views.mjs';
import {itemConfiguration,PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {prepareDocArgumentEffectsSources} from '../prepare-doc-argument-effects-sources.mjs';
const limits={timeout:60000},module=(source,path=[])=>({file:path.length?'src/'+path.join('/')+'.rs':'src/lib.rs',path,source});
function bound(source){const file='src/lib.rs',capture=captureSourceModuleViews({source,sourcePath:file}),module={file,path:[],source,sourceView:capture.views[0],compilationProfile:PRODUCTION_PROFILE},item=originalSourceModuleItems(module).find(row=>!row.comment),attribute=itemConfiguration(item.tokens,PRODUCTION_PROFILE).attributes[0];return {module,item,memberIndex:null,attributeSpan:{...attribute.span}};}
function bindings(modules){return resolveModuleBindings({modules,compilationProfile:PRODUCTION_PROFILE});}
test('literal and delimited doc metadata stay distinct from nonliteral equality expression uncertainty',limits,()=>{
 for(const tokens of [['doc'],['doc','(','hidden',')'],['doc','(','alias','=','"name"',')'],['doc','=','"text unknown!(macro_export)"']])assert.equal(documentationArgumentMayExportMacros({name:'doc',tokens}),false);
 for(const tokens of [['doc','=','include_str!','(','"file"',')'],['doc','=','unknown!','(',')'],['doc','=','(','"literal"',')'],['doc','::','attribute'],['doc','=']])assert.equal(documentationArgumentMayExportMacros({name:'doc',tokens}),true);
 assert.equal(documentationArgumentMayExportMacros({name:'repr',tokens:['repr','(','C',')']}),false);let touched=false;assert.equal(documentationArgumentMayExportMacros({name:'doc',get tokens(){touched=true;return ['doc'];}}),true);assert.equal(touched,false);
});
test('an outer doc expression preserves possible bang and attribute exports on local and crate-root scopes',limits,()=>{
 const result=bindings([module('mod child;'),module('#[doc=unknown!("doc")]pub fn selected(){}',['child'])]);for(const path of [[],['child']]){const scope=result.scopes.find(scope=>JSON.stringify(scope.path)===JSON.stringify(path));assert.equal(scope.unresolvedMacroScope,true);assert.equal(scope.unresolvedBangMacroScope,true);assert.equal(scope.unresolvedAttributeMacroScope,true);}assert.ok(result.diagnostics.some(row=>row.globalMacroKindUnresolved===true));
});
test('a nested doc expression retains crate-root macro effects without depending on an importing glob',limits,()=>{
 const result=bindings([module('mod child;'),module('pub fn outer(){#[doc=unknown!("doc")]fn nested(){}}',['child'])]),root=result.scopes.find(scope=>scope.path.length===0);assert.equal(root.unresolvedMacroScope,true);assert.equal(root.unresolvedBangMacroScope,true);assert.equal(root.unresolvedAttributeMacroScope,true);assert.ok(result.diagnostics.some(row=>row.message.includes('nested source attribute')));
});
test('ordinary literal/list docs remain closed while qualified builtin spellings keep type uncertainty',limits,()=>{
 for(const source of ['#[doc="unknown!(macro_export)"]pub fn selected(){}','#[doc(alias="name")]pub fn selected(){}']){const root=bindings([module(source)]).scopes[0];assert.equal(root.unresolvedMacroScope,false);assert.equal(root.unresolvedBangMacroScope,false);assert.equal(root.unresolvedAttributeMacroScope,false);}
 for(const source of ['#[doc::transform]struct Record;','#[repr::transform]struct Record;']){const root=bindings([module(source)]).scopes[0];assert.equal(root.unresolvedTypeScope,true);assert.equal(root.unresolvedAttributeMacroScope,true);}
});
test('genuine expression AST frontiers retain opaque inputs and nested producers without a global closure verdict',limits,()=>{
 const result=captureOriginalDocExpressionSourceEffects(bound('#[doc={#[macro_export]macro_rules! pending{()=>{"doc"}}unknown!("value")}]pub fn selected(){}'));assert.ok(result.frontiers.some(row=>row.kind==='OpaqueBang'));assert.ok(result.frontiers.some(row=>row.kind==='MacroDefinition'));assert.ok(result.frontiers.some(row=>row.kind==='Attribute'));assert.equal(result.completePositiveSyntaxTraversed,true);assert.equal(result.syntacticMacroFrontierFound,true);assert.equal(result.globalExportsClosed,false);assert.equal(result.nativeVisitorConfinementQualified,false);assert.equal(result.namespaceAuthority,false);assert.equal(result.runtimeAuthority,false);
 const literal=captureOriginalDocExpressionSourceEffects(bound('#[doc="literal"]pub fn selected(){}'));assert.deepEqual(literal.frontiers,[]);assert.equal(literal.globalExportsClosed,false);assert.equal(literal.macroOwnerResolved,false);
});
test('all three complete compiler equations retain original native owners both ordered phases and full inverses',limits,()=>{
 const plan=prepareDocArgumentEffectsSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});

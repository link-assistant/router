// Independent complete asynchronous source-origin join SOURCE; all cases UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {originalFreshPrimitiveNamespaceSourcesWithDocumentation} from '../extensions/primitive-namespace-sources.mjs';
import {captureSourceModuleViews,originalSourceModuleItems} from '../source-module-views.mjs';
import {itemConfiguration} from '../cfg-profile.mjs';
import {captureOriginalNamespaceDocumentationExpression,originalNamespaceAttributeExpressionInvocationPositions,captureOriginalNamespaceAttributeInvocationInput} from '../original-namespace-parser.mjs';
import {proposeOriginalArchitectureDocIncludeWithFileTokenSource} from '../derive-clap-concat.mjs';
import {originalMacroFileTokenContextFacts} from '../original-file-context-source.mjs';
import {prepareArchitectureDocFileTokenSources} from '../prepare-architecture-doc-file-token-sources.mjs';
const limits={timeout:60000},path='crates/core_arch/src/mod.rs';
function request(){
 const originals=originalFreshPrimitiveNamespaceSourcesWithDocumentation(),source=originals.get(path).source,capture=captureSourceModuleViews({source,sourcePath:path}),module={file:path,path:[],source,sourceView:capture.views[0],compilationProfile:null},item=originalSourceModuleItems(module).find(item=>itemConfiguration(item.tokens,null).attributes.some(row=>row.name==='doc'&&source.slice(row.span.start,row.span.end).includes('include_str!'))),attribute=itemConfiguration(item.tokens,null).attributes.find(row=>row.name==='doc'),options={module,item,memberIndex:null,attributeSpan:{...attribute.span}},token=captureOriginalNamespaceDocumentationExpression(options),position=originalNamespaceAttributeExpressionInvocationPositions(token,options)[0].proof,input=captureOriginalNamespaceAttributeInvocationInput(position,token,options);return {input:{token,position,input,options},document:originals.get('crates/core_arch/src/core_arch_docs.md').source};
}
test('the actual document proposal retains its independent complete ordinary macro token equation',limits,async()=>{
 const {input,document}=request(),result=await proposeOriginalArchitectureDocIncludeWithFileTokenSource(input),context=result.fileTokenContext;assert.equal(result.schema,'original-architecture-document-file-token-source-proposal-v1');assert.equal(result.expansion.value,document);assert.equal(result.history.inverse,input.options.module.source);assert.equal(context.facts.source,result.before);assert.equal(context.facts.sourceView,input.options.module.sourceView);assert.equal(context.facts.token,'include_str');assert.equal(context.facts.span.start,result.invocationSpan.start);assert.equal(context.facts.span.end,result.invocationSpan.start+'include_str'.length);assert.equal(context.facts.positiveOrdinaryMacroIdentifierTokenEquation,true);assert.equal(context.facts.sourceProfile.sources.length,15);assert.equal(context.facts.sourceProfile.constructorCsts.length,15);assert.equal(context.facts.constructorPrograms.length,102);assert.equal(context.facts.rustcContextObject,null);assert.equal(context.facts.eligibleOwnerScope,null);assert.deepEqual(result.ruleTrace.map(row=>row.phase),['language','repository']);for(const key of ['sourceFileContextQualified','nativeSpanSourceCallsiteQualified','macroOwnerResolved','namespaceAuthority','runtimeAuthority'])assert.equal(context[key],false,key);for(const key of ['sourceFileContextQualified','nativePathQualified','argumentMacroOwnerResolved','nativeVisitorConfinementQualified','globalExportsClosed','runtimeParity'])assert.equal(result[key],false,key);await assert.rejects(()=>originalMacroFileTokenContextFacts({...context.token}));
});
test('an original attribute source change during asynchronous constructor work cannot produce a proposal',limits,async()=>{
 const {input}=request(),source=input.options.module.source,pending=proposeOriginalArchitectureDocIncludeWithFileTokenSource(input);input.options.module.source+='\n';try{await assert.rejects(()=>pending);}finally{input.options.module.source=source;}
});
test('copied original frames and accessor requests cannot reach source-context or document admission',limits,async()=>{
 const {input}=request();for(const field of ['input','position','token'])await assert.rejects(()=>proposeOriginalArchitectureDocIncludeWithFileTokenSource({...input,[field]:{...input[field]}}));let touched=false;await assert.rejects(()=>proposeOriginalArchitectureDocIncludeWithFileTokenSource({...input,get options(){touched=true;return input.options;}}));assert.equal(touched,false);
});
test('all three complete source equations retain the original full synchronous implementation and both phases',limits,()=>{
 const plan=prepareArchitectureDocFileTokenSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});

// Independent original attribute/literal substitution SOURCE. All cases UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {captureSourceModuleViews,originalSourceModuleItems} from '../source-module-views.mjs';
import {itemConfiguration} from '../cfg-profile.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {captureOriginalNamespaceDocumentationExpression,originalNamespaceAttributeExpressionInvocationPositions,captureOriginalNamespaceAttributeInvocationInput} from '../original-namespace-parser.mjs';
import {proposeOriginalAttributeConcatLiteralSource} from '../derive-clap-concat.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {prepareAttributeConcatSources} from '../prepare-attribute-concat-sources.mjs';
const limits={timeout:60000},dependencies=loadDeriveDependencyProof({manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')});
function request(expression,inner=false){
 const source=(inner?'#![':'#[')+'doc='+expression+']\nfn selected(){}',file='src/lib.rs',capture=captureSourceModuleViews({source,sourcePath:file}),module={file,path:[],source,sourceView:capture.views[0],compilationProfile:null},item=originalSourceModuleItems(module).find(row=>!row.comment),attribute=itemConfiguration(item.tokens,null).attributes.find(row=>row.name==='doc'),options={module,item,memberIndex:null,attributeSpan:{...attribute.span}},token=captureOriginalNamespaceDocumentationExpression(options),position=originalNamespaceAttributeExpressionInvocationPositions(token,options)[0].proof,input=captureOriginalNamespaceAttributeInvocationInput(position,token,options);return {dependencies,token,position,input,options};
}
test('actual root and inner concat arguments produce a complete conditional literal substitution and physical inverse',limits,()=>{
 for(const [expression,expected,inner]of [['concat!("A ","doc.")','A doc.',false],['concat!()','',true],['concat!("trailing",)','trailing',false]]){const input=request(expression,inner),result=proposeOriginalAttributeConcatLiteralSource(input);assert.equal(result.expansion.value,expected);assert.equal(result.expansion.outputToken,JSON.stringify(expected));assert.equal(result.before,input.options.module.source);assert.equal(result.after,input.options.module.source.replace(expression,JSON.stringify(expected)));assert.equal(result.history.inverse,result.before);assert.equal(transportConcreteSyntaxMeta(result.outputConcreteSyntax).source,JSON.stringify(expected));assert.deepEqual(result.ruleTrace.map(row=>row.phase),['language','repository']);assert.equal(result.expansion.currentSourceInputsChecked,true);assert.equal(result.expansion.crossInvocationCache,false);for(const key of ['callerOwnerResolved','attributeOwnerResolved','argumentMacroOwnerResolved','nativeVisitorConfinementQualified','globalExportsClosed','originalSourceEquivalenceQualified','originalApplicationCoverageQualified','sourceAuthority','semanticAuthority','typeAuthority','namespaceAuthority','runtimeAuthority','runtimeParity','receivingExecuted'])assert.equal(result[key],false,key);}
});
test('every full original native file license and selected callback is current and retained in the source proposal',limits,()=>{
 const result=proposeOriginalAttributeConcatLiteralSource(request('concat!("whole ","source")')),plan=result.expansion.plan;assert.equal(plan.sources.length,16);assert.ok(plan.sources.some(row=>row.path==='LICENSE-MIT'));assert.ok(plan.sources.some(row=>row.path==='LICENSE-APACHE'));assert.ok(plan.definitions.length>=25);assert.ok(plan.retainedSourceBytes<=8388608);for(const row of plan.sources){assert.equal(row.inverse,row.source);if(row.path.endsWith('.rs'))assert.equal(transportConcreteSyntaxMeta(row.concreteSyntax).source,row.source);}for(const callback of plan.definitions){const original=plan.sources.find(row=>row.path===callback.source);assert.equal(original.source.slice(callback.span.start,callback.span.end),callback.original);assert.ok(callback.original.startsWith('fn '));}assert.equal(plan.namespaceAuthority,false);assert.equal(plan.generatedImplBehavior,false);
});
test('nonliteral other-kind escaped Unicode qualified and oversized candidate inputs retain exact refusal boundaries',limits,()=>{
 for(const expression of ['concat!(unknown!())','concat!(1)','concat!(true)','concat!("a\\n")','concat!("π")','other::concat!("value")','unknown!("value")','concat!('+Array(129).fill('""').join(',')+')','concat!("'+'a'.repeat(4097)+'")'])assert.throws(()=>proposeOriginalAttributeConcatLiteralSource(request(expression)),/Concat|concat/u);
});
test('foreign receipts unsealed dependencies and request accessors cannot become original input authority',limits,()=>{
 const original=request('concat!("value")');for(const field of ['input','position','token'])assert.throws(()=>proposeOriginalAttributeConcatLiteralSource({...original,[field]:{...original[field]}}));assert.throws(()=>proposeOriginalAttributeConcatLiteralSource({...original,dependencies:{...dependencies}}));let touched=false;assert.throws(()=>proposeOriginalAttributeConcatLiteralSource({...original,get options(){touched=true;return original.options;}}));assert.equal(touched,false);const foreign=request('concat!("value")');assert.throws(()=>proposeOriginalAttributeConcatLiteralSource({...original,input:foreign.input}));
});
test('all three source equations retain whole original functions native owners and both substitution sequences',limits,()=>{
 const plan=prepareAttributeConcatSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});

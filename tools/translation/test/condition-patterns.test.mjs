// Independent positive grammar regression SOURCE. Every new case is UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {captureSourceModuleViews,originalSourceModuleItems} from '../source-module-views.mjs';
import {captureOriginalNamespaceFunction,originalNamespaceFunctionFacts} from '../original-namespace-parser.mjs';
import {rootHeaderValue} from './header-value-inputs.mjs';
import {proposeOriginalHeaderExpressionBlockScopes} from '../expression-block-scope-model.mjs';
import {prepareConditionPatternSources} from '../prepare-condition-pattern-sources.mjs';
const limits={timeout:60000};
function original(source){const file='src/lib.rs',capture=captureSourceModuleViews({source,sourcePath:file}),module={file,path:[],source,sourceView:capture.views[0],compilationProfile:null},item=originalSourceModuleItems(module).find(row=>!row.comment),options={module,item,memberIndex:null},token=captureOriginalNamespaceFunction(options);return {source,token,options,facts:originalNamespaceFunctionFacts(token,options)};}
const expression=row=>row.facts.ast.fields.body.fields.statements[0].fields.value;
test('if and while let preserve patterns, scrutinees and exact spans as distinct condition syntax',limits,()=>{
 for(const [keyword,kind]of [['if','If'],['while','While']]){const row=original(`fn selected(){${keyword} let Some(value)=get!(){use_value!(value);}}`),node=expression(row),condition=node.fields.condition;assert.equal(node.kind,kind);assert.equal(condition.kind,'LetCondition');assert.equal(row.source.slice(condition.span.start,condition.span.end),'let Some(value)=get!()');assert.equal(condition.fields.pattern.fields.variant,'tuple-constructor');assert.equal(condition.fields.value.kind,'OpaqueBang');for(const key of ['bindingsResolved','editionResolved','featureAvailabilityResolved'])assert.equal(condition.fields[key],false,key);assert.deepEqual(row.facts.opaqueInvocations.map(node=>node.fields.position),['Expr','Stmts']);assert.equal(row.facts.namespaceAuthority,false);assert.equal(row.facts.runtimeAuthority,false);}
});
test('boolean-headed and let-headed conjunctions preserve all clauses without changing comparison precedence',limits,()=>{
 for(const condition of ['ready && let Some(value)=input && value>0','let Some(value)=input && value>0 && let Some(other)=next(value)','(ready || fallback) && let Some(value)=input && (value>0 || allowed(value))']){const row=original(`fn selected(){if ${condition}{accept!();}}`),node=expression(row);assert.equal(node.fields.condition.kind,'Binary');assert.equal(node.fields.condition.fields.operation,'&&');assert.equal(row.source.slice(node.fields.condition.span.start,node.fields.condition.span.end),condition);assert.equal(row.facts.completeOriginalFunctionParsed,true);}
 const node=expression(original('fn selected(){if ready && let Some(value)=input && value==other{}}')).fields.condition;assert.equal(node.fields.right.fields.operation,'==');assert.equal(node.fields.left.fields.right.kind,'LetCondition');
});
test('ordinary lazy boolean conditions and grouped scrutinees retain their existing complete grammar',limits,()=>{
 const ordinary=expression(original('fn selected(){if ready || fallback && checked{}}')).fields.condition;assert.equal(ordinary.fields.operation,'||');assert.equal(ordinary.fields.right.fields.operation,'&&');
 const grouped=expression(original('fn selected(){if let Some(value)=lookup((ready || fallback),[a&&b]){}}')).fields.condition;assert.equal(grouped.fields.value.kind,'Call');assert.equal(grouped.fields.value.fields.args[0].kind,'Tuple');assert.equal(grouped.fields.value.fields.args[0].fields.values[0].fields.operation,'||');assert.equal(grouped.fields.value.fields.args[1].fields.values[0].fields.operation,'&&');
 const blockHead=expression(original('fn selected(){if {let ready=true;ready} && let Some(value)=probe!(){}}')).fields.condition;assert.equal(blockHead.fields.left.kind,'Block');assert.equal(blockHead.fields.left.fields.statements[0].kind,'Let');
});
test('else if conditions, ordinary let statements and opaque macro let tokens remain separate',limits,()=>{
 const row=original('fn selected(){let plain=1;if let Some(value)=get!(){accept!();}else if ready && let None=other{reject!();}else{retain!(let Some(hidden)=opaque);}}'),statements=row.facts.ast.fields.body.fields.statements;assert.equal(statements[0].kind,'Let');assert.equal(statements[1].fields.value.fields.otherwise.kind,'If');assert.equal(statements[1].fields.value.fields.otherwise.fields.condition.fields.right.kind,'LetCondition');assert.equal(row.facts.opaqueInvocations.at(-1).fields.tree.original,'(let Some(hidden)=opaque)');
});
test('condition blocks retain local namespace and invocation obligations without qualifying binders or effects',limits,()=>{
 const input=rootHeaderValue('#[doc={if let Some(value)=probe!() && valid!(value){struct Marker;keep!();}else{drop!();}while let Some(value)=next!(){use crate::Marker;touch!();}"docs"}]fn selected(){}'),result=proposeOriginalHeaderExpressionBlockScopes(input.token,input.options);assert.equal(result.model.blocks.length,4);assert.deepEqual(result.model.localItems.map(row=>row.kind),['DataItem','Use']);assert.deepEqual(result.model.opaqueInvocations.map(row=>row.position),['Expr','Expr','Stmts','Stmts','Expr','Stmts']);assert.equal(result.model.parentModuleRestoredInModel,true);for(const key of ['nativeVisitorDispatchQualified','nativeTypeNamespaceIsolationQualified','attributeEffectsClosed','globalBangExportsClosed','namespaceAuthority','runtimeAuthority'])assert.equal(result.model[key],false,key);
});
test('let is refused outside direct condition conjunctions and malformed condition syntax stays refused',limits,()=>{
 for(const body of ['let value=let Some(x)=input;','call(let Some(x)=input);','if (let Some(x)=input){}','if !let Some(x)=input{}','if ready==let Some(x)=input{}','if ready||let Some(x)=input{}','if ready||other&&let Some(x)=input{}','if let Some(x)=input||ready{}','if let Some(x)=input&&ready||other{}','if let Some(x)==input{}','if let Some(x)= {}','while let Some(x) input{}','match input{Some(x) if let Some(y)=x=>y,_=>0}'])assert.throws(()=>original(`fn selected(){${body}}`),undefined,body);
 const row=original('fn selected(){if let Some(value)=input{}}');assert.throws(()=>originalNamespaceFunctionFacts({...row.token},row.options),/copied or foreign/u);
});
test('two complete source equations retain original owners, ordered phases and whole-file inverses',limits,()=>{
 const plan=prepareConditionPatternSources();assert.equal(plan.files.length,2);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});

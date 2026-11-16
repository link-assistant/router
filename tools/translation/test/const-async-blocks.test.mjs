// Independent positive source grammar regression SOURCE. All cases are UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {captureSourceModuleViews,originalSourceModuleItems} from '../source-module-views.mjs';
import {captureOriginalNamespaceFunction,originalNamespaceFunctionFacts} from '../original-namespace-parser.mjs';
import {rootHeaderValue} from './header-value-inputs.mjs';
import {proposeOriginalHeaderExpressionBlockScopes} from '../expression-block-scope-model.mjs';
import {prepareConstAsyncBlockSources} from '../prepare-const-async-block-sources.mjs';
const limits={timeout:60000};
function original(source){const file='src/lib.rs',capture=captureSourceModuleViews({source,sourcePath:file}),module={file,path:[],source,sourceView:capture.views[0],compilationProfile:null},item=originalSourceModuleItems(module).find(row=>!row.comment),options={module,item,memberIndex:null},token=captureOriginalNamespaceFunction(options);return {token,options,facts:originalNamespaceFunctionFacts(token,options)};}
test('const items and qualified expression blocks retain distinct complete positive syntax and opaque macro roles',limits,()=>{
 const source='fn selected(){const N:usize=1;let value=const {count!()};let future=async {work!();true};let moved=async move {other!()};}',row=original(source),statements=row.facts.ast.fields.body.fields.statements;
 assert.deepEqual(statements.map(node=>node.kind),['ConstItem','Let','Let','Let']);assert.equal(statements[0].fields.name,'N');assert.equal(statements[1].fields.value.fields.operation,'const-block');assert.equal(statements[2].fields.value.fields.operation,'async-block');assert.equal(statements[2].fields.value.fields.moved,false);assert.equal(statements[3].fields.value.fields.moved,true);assert.deepEqual(row.facts.opaqueInvocations.map(node=>node.fields.position),['Expr','Stmts','Expr']);assert.equal(row.facts.completeOriginalFunctionParsed,true);assert.equal(row.facts.namespaceAuthority,false);assert.equal(row.facts.runtimeAuthority,false);
});
test('array lengths and function tails keep qualified block source rather than treating const as an item name',limits,()=>{
 const row=original('fn selected()->[u8;const {count!()}]{const {array!()}}');assert.equal(row.facts.ast.fields.result.kind,'ArrayType');assert.equal(row.facts.ast.fields.result.fields.length.fields.operation,'const-block');assert.equal(row.facts.ast.fields.body.fields.statements[0].kind,'Statement');assert.equal(row.facts.ast.fields.body.fields.statements[0].fields.value.fields.operation,'const-block');assert.deepEqual(row.facts.opaqueInvocations.map(node=>node.fields.position),['Expr','Expr']);
});
test('qualified blocks recursively retain local scope obligations without qualifying evaluation or global effects',limits,()=>{
 const source='#[doc={const N:usize=1;const {struct Local;value!()};async move {use crate::Marker;work!()};"docs"}]fn selected(){}',input=rootHeaderValue(source),result=proposeOriginalHeaderExpressionBlockScopes(input.token,input.options);assert.equal(result.model.blocks.length,3);assert.equal(result.model.blocks[0].anonymousModuleModel,true);assert.deepEqual(result.model.blocks[0].nativeStatementKinds,['Item','Other','Other','Other']);assert.equal(result.model.blocks[1].anonymousModuleModel,true);assert.equal(result.model.blocks[2].anonymousModuleModel,true);assert.deepEqual(result.model.localItems.map(row=>row.kind),['ConstItem','DataItem','Use']);assert.equal(result.model.parentModuleRestoredInModel,true);for(const key of ['nativeVisitorDispatchQualified','nativeTypeNamespaceIsolationQualified','attributeEffectsClosed','globalBangExportsClosed','namespaceAuthority','runtimeAuthority'])assert.equal(result.model[key],false,key);
});
test('qualified block forms still require their complete braces and leave foreign receipts refused',limits,()=>{
 for(const source of ['fn selected(){let value=const 1;}','fn selected(){let value=async true;}','fn selected(){let value=async move;}','fn selected(){const N:usize;}'])assert.throws(()=>original(source),undefined,source);const row=original('fn selected(){let value=const {true};}');assert.throws(()=>originalNamespaceFunctionFacts({...row.token},row.options),/copied or foreign/u);
});
test('two complete source equations retain original class/function owners both phases and complete inverses',limits,()=>{
 const plan=prepareConstAsyncBlockSources();assert.equal(plan.files.length,2);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});

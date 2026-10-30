// Independent current native namespace source scope SOURCE draft; all unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {withOriginalNamespaceParserSourceOperation,originalNamespaceParserSourcePlan,requireOriginalNamespaceParserSourcePlan} from '../namespace-parser-source.mjs';
import {originalAncestorAttributeSourceInputsCurrent} from '../derive-ancestor-attribute-scope.mjs';
import {prepareNamespaceSourceOperationSources} from '../prepare-namespace-source-operation-sources.mjs';
const limits={timeout:60000};
test('one synchronous native source operation shares only a genuine current complete plan and clears it afterward',limits,()=>{
 let captured;const sentinel={original:true},result=withOriginalNamespaceParserSourceOperation(function(){assert.equal(arguments.length,0);captured=originalNamespaceParserSourcePlan();assert.strictEqual(originalNamespaceParserSourcePlan(),captured);assert.strictEqual(requireOriginalNamespaceParserSourcePlan(captured),captured);assert.equal(captured.namespaceAuthority,false);assert.equal(captured.runtimeAuthority,false);const current=originalAncestorAttributeSourceInputsCurrent();assert.ok(current.retainedSourceBytes>0&&current.retainedSourceBytes<=8388608);assert.equal(current.crossInvocationCache,false);return sentinel;});assert.strictEqual(result,sentinel);assert.notStrictEqual(originalNamespaceParserSourcePlan(),captured);
});
test('nested native source operations issue separate whole plans and restore their original parent',limits,()=>{
 withOriginalNamespaceParserSourceOperation(()=>{const parent=originalNamespaceParserSourcePlan(),child=withOriginalNamespaceParserSourceOperation(()=>originalNamespaceParserSourcePlan());assert.notStrictEqual(child,parent);assert.strictEqual(originalNamespaceParserSourcePlan(),parent);});
});
test('current source checks run for already issued receipts and final guard failures clear the whole private scope',limits,()=>{
 const plan=originalNamespaceParserSourcePlan(),field=Object.getOwnPropertyDescriptor(Object,'freeze');try{Object.defineProperty(Object,'freeze',{...field,value:value=>value});assert.throws(()=>requireOriginalNamespaceParserSourcePlan(plan),/original|changed/u);}finally{Object.defineProperty(Object,'freeze',field);}assert.strictEqual(requireOriginalNamespaceParserSourcePlan(plan),plan);let captured;try{assert.throws(()=>withOriginalNamespaceParserSourceOperation(()=>{captured=originalNamespaceParserSourcePlan();Object.defineProperty(Object,'freeze',{...field,value:value=>value});return {}; }),/original|changed/u);}finally{Object.defineProperty(Object,'freeze',field);}assert.notStrictEqual(withOriginalNamespaceParserSourceOperation(()=>originalNamespaceParserSourcePlan()),captured);
});
test('forged plans async callbacks and own thenables cannot manufacture a native source receipt or carry its scope',limits,()=>{
 const plan=originalNamespaceParserSourcePlan();for(const fake of [{},structuredClone(plan),{...plan,namespaceAuthority:true}])assert.throws(()=>requireOriginalNamespaceParserSourcePlan(fake),/copied|foreign/u);let calls=0;assert.throws(()=>withOriginalNamespaceParserSourceOperation(async()=>{calls++;}),/synchronous/u);assert.equal(calls,0);const thenable={};Object.defineProperty(thenable,'then',{get(){calls++;return ()=>{};}});assert.throws(()=>withOriginalNamespaceParserSourceOperation(()=>thenable),/thenable/u);assert.equal(calls,0);const failure=new Error('independent source callback failure');assert.throws(()=>withOriginalNamespaceParserSourceOperation(()=>{originalNamespaceParserSourcePlan();throw failure;}),error=>error===failure);
});
test('all four complete native source equations retain original builders current guards and both source phase inverses',limits,()=>{
 const plan=prepareNamespaceSourceOperationSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});

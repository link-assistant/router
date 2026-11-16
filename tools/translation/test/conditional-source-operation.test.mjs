// Independent synchronous native-source scope SOURCE draft. All cases unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {withOriginalConditionalSourceOperation,originalActiveTextualConfigurationSourcePlan,originalTextualConfigurationSourcePlan,originalFreshConditionalAttributeSourceInputs} from '../conditional-source-operation.mjs';
import {withConfiguredLiteralDocMacroAttributeValidation} from '../passive-macro-attribute-source.mjs';
import {prepareConditionalSourceOperationSources} from '../prepare-conditional-source-operation-sources.mjs';
const limits={timeout:60000};
test('one ordinary synchronous operation shares complete actual native inputs without exposing its private frame',limits,()=>{
 const sentinel={original:true};let active,configured,inputs;const result=withOriginalConditionalSourceOperation(function(){assert.equal(arguments.length,0);active=originalActiveTextualConfigurationSourcePlan();configured=originalTextualConfigurationSourcePlan();inputs=originalFreshConditionalAttributeSourceInputs();assert.strictEqual(originalActiveTextualConfigurationSourcePlan(),active);assert.strictEqual(originalTextualConfigurationSourcePlan(),configured);assert.strictEqual(originalFreshConditionalAttributeSourceInputs(),inputs);assert.equal(active.namespaceAuthority,false);assert.equal(configured.runtimeAuthority,false);assert.equal(inputs.crossInvocationCache,false);return sentinel;});assert.strictEqual(result,sentinel);assert.notStrictEqual(originalActiveTextualConfigurationSourcePlan(),active);assert.notStrictEqual(originalTextualConfigurationSourcePlan(),configured);assert.notStrictEqual(originalFreshConditionalAttributeSourceInputs(),inputs);
});
test('nested source operations create separate actual input families and restore the original parent frame',limits,()=>{
 withOriginalConditionalSourceOperation(()=>{const parent=originalActiveTextualConfigurationSourcePlan(),inner=withOriginalConditionalSourceOperation(()=>originalActiveTextualConfigurationSourcePlan());assert.notStrictEqual(inner,parent);assert.strictEqual(originalActiveTextualConfigurationSourcePlan(),parent);});
});
test('callback errors preserve identity and clear all selected inputs before later independent operations',limits,()=>{
 const failure=new Error('independent source callback failure');let captured;assert.throws(()=>withOriginalConditionalSourceOperation(()=>{captured=originalActiveTextualConfigurationSourcePlan();throw failure;}),error=>error===failure);const next=withOriginalConditionalSourceOperation(()=>originalActiveTextualConfigurationSourcePlan());assert.notStrictEqual(next,captured);
});
test('async callbacks, proxies and own thenables refuse without calling an accessor or assimilating inherited fields',limits,()=>{
 let calls=0;assert.throws(()=>withOriginalConditionalSourceOperation(async()=>{calls++;}),/synchronous/u);assert.equal(calls,0);const thenable={};Object.defineProperty(thenable,'then',{get(){calls++;return ()=>{};}});assert.throws(()=>withOriginalConditionalSourceOperation(()=>thenable),/thenable/u);assert.equal(calls,0);assert.throws(()=>withOriginalConditionalSourceOperation(()=>new Proxy(function(){},{})),/ordinary result/u);const inherited=Object.create({then(){calls++;}});assert.strictEqual(withOriginalConditionalSourceOperation(()=>inherited),inherited);assert.equal(calls,0);
});
test('a final native-guard failure closes and restores the operation rather than retaining a previously selected native plan',limits,()=>{
 const field=Object.getOwnPropertyDescriptor(Object,'freeze');let captured;try{assert.throws(()=>withOriginalConditionalSourceOperation(()=>{captured=originalActiveTextualConfigurationSourcePlan();Object.defineProperty(Object,'freeze',{...field,value:value=>value});return {}; }),/original|changed/u);}finally{Object.defineProperty(Object,'freeze',field);}const next=withOriginalConditionalSourceOperation(()=>originalActiveTextualConfigurationSourcePlan());assert.notStrictEqual(next,captured);
});
test('multiple actual generated calls share only their current native inputs while retaining independent original source histories',limits,()=>{
 let saved;const result=withConfiguredLiteralDocMacroAttributeValidation(validator=>{saved=validator;const options={sourcePath:'rust/src/lib.rs',compilationProfile:{flags:{test:false}}},first=validator.generated('#[cfg_attr(not(test),doc="first")]pub fn first()->u8{7}',options),second=validator.generated('#[cfg_attr(not(test),doc="second")]pub fn second()->u8{9}',options);assert.strictEqual(first.sourceNormalization.active.originalCompilerSource,second.sourceNormalization.active.originalCompilerSource);assert.strictEqual(first.sourceNormalization.configured.conditionalAttributeSource,second.sourceNormalization.configured.conditionalAttributeSource);assert.notEqual(first.sourceNormalization.history.inverse,second.sourceNormalization.history.inverse);return [first,second];});assert.equal(result.length,2);assert.throws(()=>saved.generated('pub fn stale(){}',{sourcePath:'rust/src/lib.rs'}),/closed/u);
});
test('five complete source equations retain exact native import spans both phases and all whole source inverses',limits,()=>{
 const plan=prepareConditionalSourceOperationSources();assert.equal(plan.files.length,5);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});

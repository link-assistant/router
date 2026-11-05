// Whole-module migration proposal cases. ALL UNRUN; source changes are explicit.
import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeOwnedWideSliceInputBoundaries as propose} from '../owned-wide-slice-input-proposals.mjs';
import {ownedStateReceivingData} from './owned-state-receiving-data.mjs';
import {ownedCancellationReceivingData} from './owned-cancellation-receiving-data.mjs';
import {createOwnedOutcomeContext,ownedOutcomeRuntimeSources,translateOwnedOutcomeJavaScript} from '../owned-outcome.mjs';
import {ownedCancellationRuntimeSources} from '../owned-cancellation.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from '../../concrete-syntax-meta.mjs';
import {prepareWideSliceInputProposalsSources} from '../../prepare-wide-slice-input-proposals-sources.mjs';
const limits={timeout:60000};
const domains=[['u8','RustU8'],['i8','RustI8'],['u16','RustU16'],['i16','RustI16'],['u32','RustU32'],['i32','RustI32'],['u128','RustU128'],['i128','RustI128']];
const header="import {json_macro_null as nil,json_macro_array as array} from './runtime/json-macro-runtime.mjs';\n";
const functions=domains.map(([name,alias])=>`/** @param {readonly import('./runtime/primitive-operator-runtime.mjs').${alias}[]} values */
export function check${name}(values){for(const item of values){if(item!==0n){return nil();}}return array([]);}`).join('\n');
function data(source,family='outcome',path='caller.mjs'){
 const input=(family==='outcome'?ownedStateReceivingData:ownedCancellationReceivingData)([{path,source}]);input.primitiveOperators=true;input.files=input.files.filter(row=>!row.path.startsWith('runtime/')).concat((family==='outcome'?ownedOutcomeRuntimeSources:ownedCancellationRuntimeSources)());return input;
}
for(const family of ['outcome','cancellation'])test(family+' bulk proposal adds every new fixed-width input guard and freshly reissues the complete module',limits,()=>{
 const source=header+functions,input=data(source,family),before=structuredClone(input),row=propose(input,{sourcePath:'caller.mjs',family});assert.deepEqual(input,before);assert.equal(row.addedGuards,8);assert.equal(row.existingGuards,0);assert.equal(row.functions.length,8);assert.equal(row.program.length,8);assert.equal(row.files.length,1);assert.equal(row.files[0].before,source);assert.equal(row.files[0].inverse,source);assert.equal(row.files[0].history.inverse,source);assert.equal(row.inputEnvelopeChanged,true);assert.equal(row.originalInputContractEquivalent,false);
 for(const key of ['sourceInstalled','nativeInstalled','nativeFreshnessQualified','productionSelected','runtimeParity','wholeRouterSynchronization','sourceAuthority','semanticAuthority','receivingQualified','runtimeExecuted','rustExecuted','crossInvocationCache'])assert.equal(row[key],false,key);
 for(const [name]of domains)assert.ok(row.files[0].after.includes('values = __ro_primitiveSliceInput(values, "'+name+'");'));assert.deepEqual(row.ruleTrace.map(rule=>rule.phase),['language','language','language','repository']);assert.deepEqual(row.substitutionTrace.map(rule=>rule.phase),['language','repository']);
 const stage=transportConcreteSyntaxSource(row.files[0].after,{language:'JavaScript'});assert.equal(transportConcreteSyntaxMeta(stage.meta).source,row.files[0].after);
 const again=propose({...input,files:input.files.map(file=>file.path==='caller.mjs'?{...file,source:row.files[0].after}:file)},{sourcePath:'caller.mjs',family});assert.equal(again.addedGuards,0);assert.equal(again.existingGuards,8);assert.equal(again.inputEnvelopeChanged,false);assert.equal(again.originalInputContractEquivalent,true);assert.equal(again.files[0].after,row.files[0].after);
});
test('an unguarded original remains refused until the explicit migration proposal is selected',limits,()=>{
 const source=header+functions,input=data(source);assert.throws(()=>translateOwnedOutcomeJavaScript(source,{context:createOwnedOutcomeContext(input),sourcePath:'caller.mjs'}),/written immutable slice input contract/u);const proposal=propose(input,{sourcePath:'caller.mjs',family:'outcome'});assert.equal(proposal.sourceInstalled,false);assert.equal(input.files.find(row=>row.path==='caller.mjs').source,source);
});
test('typed modules named imports aliases and multiple parameters use one complete source migration',limits,()=>{
 const source=`import {json_macro_null as nil} from './runtime/json-macro-runtime.mjs';
import type {RustU8 as Small,RustI128 as Large} from './runtime/primitive-operator-runtime.mjs';
export function values(left:readonly Small[],right:readonly Large[]){for(const item of left){if(item!==0n){return nil();}}for(const item of right){if(item!==0n){return nil();}}return nil();}`;
 const row=propose(data(source,'outcome','caller.mts'),{sourcePath:'caller.mts',family:'outcome'});assert.equal(row.addedGuards,2);assert.ok(row.files[0].after.includes('left = __ro_primitiveSliceInput(left, "u8");'));assert.ok(row.files[0].after.includes('right = __ro_primitiveSliceInput(right, "i128");'));assert.equal(row.files[0].inverse,source);assert.equal(row.program.length,1);
});
test('an existing runtime import name is never captured by the new helper import',limits,()=>{
 const source=header+"import {primitiveSliceInput as __ro_primitiveSliceInput} from './runtime/primitive-operator-runtime.mjs';\n"+functions,row=propose(data(source),{sourcePath:'caller.mjs',family:'outcome'});assert.ok(row.files[0].after.includes('primitiveSliceInput as __ro_primitiveSliceInput_0'));assert.equal(row.addedGuards,8);
});
test('foreign type hints missing contracts mixed prefixes unsupported effects and malformed options never issue a checked proposal',limits,()=>{
 for(const source of [header+functions.replaceAll('./runtime/primitive-operator-runtime.mjs','./foreign.mjs'),header+functions.replaceAll("readonly import('./runtime/primitive-operator-runtime.mjs').RustU8[]",'readonly bigint[]').replaceAll('return nil();','throw new Error("unsupported");'),header+functions.replace('for(const item of values)','values=input(values,"i8");for(const item of values)')])assert.throws(()=>propose(data(source),{sourcePath:'caller.mjs',family:'outcome'}));
 const input=data(header+functions);for(const request of [{sourcePath:'caller.mjs',family:'unknown'},{sourcePath:'missing.mjs',family:'outcome'},{sourcePath:'caller.mjs',family:'outcome',sourceAuthority:true},{sourcePath:'../caller.mjs',family:'outcome'}])assert.throws(()=>propose(input,request));assert.throws(()=>propose({...input,primitiveOperators:false},{sourcePath:'caller.mjs',family:'outcome'}));
});
test('three complete compiler equations retain original source owners inverses and declared rule phases',limits,()=>{
 const plan=prepareWideSliceInputProposalsSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});

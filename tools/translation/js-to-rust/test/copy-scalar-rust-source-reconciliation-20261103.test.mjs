// Original-span reconciliation receiving SOURCE. No execution while drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {ownedStateReceivingData} from './owned-state-receiving-data.mjs';
import {translateOwnedCopyScalarHelperSource20261103} from '../owned-copy-scalar-helper-profile-20261103.mjs';
import {reconcileOwnedCopyScalarRustSource20261103} from '../copy-scalar-rust-source-reconciliation-20261103.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {transportConcreteSyntaxMeta} from '../../concrete-syntax-meta.mjs';
const type='import("./runtime/primitive-operator-runtime.mjs").RustU8';
const params='/** @param {'+type+'} left @param {'+type+'} right @returns {boolean} */\n';
const one='/** @param {'+type+'} value @returns {'+type+'} */\n';
const unchanged=one+'export function untouched(value){ /* retain this body */ return id(value); }';
const caller='import {less,id} from "./helpers.mjs";\n// Keep original imports and comments.\n'+params+'export function changed(left,right){return less(left,right);}\n\n'+unchanged+'\n';
const helper=params+'export function less(left,right){return left < right;}\n'+one+'export function id(value){return value;}';
async function fixture(variant,paired=false){
 const syntax=await import('../owned-'+(variant==='core'?'core':'vector-candidate')+'-source.mjs');
 const typed=caller.replace('function changed(left,right)','function changed(left:'+type+',right:'+type+'):boolean').replace('function untouched(value)','function untouched(value:'+type+'):'+type);
 const sourceFiles=[{path:'caller.mjs',source:caller},{path:'helpers.mjs',source:helper},...(paired?[{path:'caller.mts',source:typed}]:[])];
 const original=ownedStateReceivingData(sourceFiles),assets=new Map([...syntax.ownedCoreRuntimeSources(),...syntax.ownedPrimitiveOperatorRuntimeSources()].map(row=>[row.path,row]));
 const input={...original,files:original.files.filter(row=>!row.path.startsWith('runtime/')).concat([...assets.values()]),primitiveOperators:true,...(variant==='vector'?{vectorBindings:[]}: {})};
 const forward=translateOwnedCopyScalarHelperSource20261103(caller,{variant,sourcePath:'caller.mjs',input});
 return {typed,input,forward,options:{variant,sourcePath:'sync/caller.rs',javascriptPath:'caller.mjs',input:{...input,files:input.files.concat([{path:'sync/caller.rs',source:forward.rust}])}}};
}
function withRust(options,rust){return {...options,input:{...options.input,files:options.input.files.map(row=>row.path==='sync/caller.rs'?{...row,source:rust}:row)}};}
for(const variant of ['core','vector']){
 test(variant+' one edited Rust body preserves the other helper call and original source trivia',{timeout:60000},async()=>{
  const {forward,options}=await fixture(variant),rust=forward.rust.replace('(left < right)','(left >= right)');assert.notEqual(rust,forward.rust);
  const result=reconcileOwnedCopyScalarRustSource20261103(rust,withRust(options,rust));
  assert.deepEqual(result.changedFunctions,['changed']);assert.deepEqual(result.retainedFunctions,['untouched']);
  assert.ok(result.javascript.startsWith('import {less,id} from "./helpers.mjs";\n// Keep original imports and comments.\n'));
  assert.ok(result.javascript.includes(unchanged));assert.equal(result.program.find(fn=>fn.javascript==='untouched').copyHelperCalls[0].name,'id');
  assert.equal(sameRustSourceSyntax(rust,result.rust),true);assert.equal(result.minimalSourcePlan.files.length,1);
  const file=result.minimalSourcePlan.files[0];assert.equal(file.before,caller);assert.equal(file.after,result.javascript);assert.equal(file.history.inverse,caller);
  assert.equal(transportConcreteSyntaxMeta(file.history.beforeMeta).source,caller);assert.equal(transportConcreteSyntaxMeta(file.history.afterMeta).source,result.javascript);
  assert.equal(result.ownedRustRuleHistory.sourceEquation.inverse,caller);assert.equal(result.sourceConflicts[0].requiresReconciliation,true);
  const operations=await import('../owned-vector-candidate-operations.mjs'),token=await operations.prepareOwnedCoreRuntime(result.program);
  assert.equal(operations.evaluateOwnedCoreProgram(result.program,'changed',[0n,255n],token),false);assert.equal(operations.evaluateOwnedCoreProgram(result.program,'changed',[255n,0n],token),true);assert.equal(operations.evaluateOwnedCoreProgram(result.program,'untouched',[255n],token),255n);
 });
 test(variant+' paired TypeScript keeps the same original signatures and receives only the body edit',{timeout:60000},async()=>{
  const {forward,options,typed}=await fixture(variant,true),rust=forward.rust.replace('(left < right)','(left >= right)');
  const result=reconcileOwnedCopyScalarRustSource20261103(rust,withRust(options,rust));
  assert.deepEqual(new Set(result.minimalSourcePlan.files.map(row=>row.path)),new Set(['caller.mjs','caller.mts']));
  const pair=result.minimalSourcePlan.files.find(row=>row.path==='caller.mts');assert.equal(pair.before,typed);assert.ok(pair.after.includes('function untouched(value:'+type+'):'+type+'{ /* retain this body */ return id(value); }'));
  assert.equal(result.program.find(fn=>fn.javascript==='changed').pairedSource.source,pair.after);assert.equal(sameRustSourceSyntax(rust,result.rust),true);
 });
 test(variant+' unchanged input restores the full network and interface edits stay explicit',{timeout:60000},async()=>{
  const {forward,options}=await fixture(variant),same=reconcileOwnedCopyScalarRustSource20261103(forward.rust,options);
  assert.equal(same.unchangedSourceRestored,true);assert.equal(same.javascript,caller);assert.equal(same.minimalSourcePlan,null);
  const rust=forward.rust.replace('pub fn changed(','fn changed(');assert.notEqual(rust,forward.rust);
  const changed=reconcileOwnedCopyScalarRustSource20261103(rust,withRust(options,rust));assert.equal(changed.minimalSourcePlan,null);assert.match(changed.reconciliationRefusal.reason,/visibility/);assert.equal(sameRustSourceSyntax(rust,changed.rust),true);
 });
}

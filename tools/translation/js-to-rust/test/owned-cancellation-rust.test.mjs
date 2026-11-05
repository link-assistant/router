// Independent canonical resource source inverse regression SOURCE. All unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {ownedCancellationReceivingData} from './owned-cancellation-receiving-data.mjs';
import {createOwnedCancellationContext,translateOwnedCancellationJavaScript,translateOwnedCancellationTypeScript,prepareOwnedCancellationRuntime,evaluateOwnedCancellation} from '../owned-cancellation.mjs';
import {translateOwnedCancellationRust} from '../owned-cancellation-rust.mjs';
import {prepareOwnedCancellationInverseSources} from '../../prepare-owned-cancellation-inverse-sources.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
const limits={timeout:60000},source=`import {router_cancel_new as created,router_cancel_clone as cloned,router_cancel_set as signal,router_cancel_is_set as isSet} from './runtime/async-control-runtime.mjs';
export function produced(){const value=created();return value;}
export function shared(){const original=created();const copy=cloned(original);const changed=signal(copy);return changed&&isSet(original);}
export function moved(){const original=created();const next=original;const changed=signal(next);return changed&&isSet(next);}
/** @param {Parameters<typeof isSet>[0]} value */ export function borrowed(value){return isSet(value);}
`;
function checked(){const data=ownedCancellationReceivingData([{path:'caller.mjs',source}]),context=createOwnedCancellationContext(data),result=translateOwnedCancellationJavaScript(source,{context,sourcePath:'caller.mjs'});return {data,result};}
function inverse(rust,data){const actual={...data,files:data.files.concat([{path:'caller.rs',source:rust}])};return translateOwnedCancellationRust(rust,{context:createOwnedCancellationContext(actual),sourcePath:'caller.rs',javascriptPath:'caller.mjs'});}
test('canonical owned and borrowed Cancellation callers reproduce through Rust CST JS checked meta and strict typed source proposals',limits,async()=>{
 const {data,result}=checked(),restored=inverse(result.rust,data);assert.ok(sameRustSourceSyntax(restored.rust,result.rust));assert.equal(restored.ownedRustSourceHistory.equation.inverse,result.rust);assert.equal(restored.ownedRustSourceHistory.projection.semanticAuthority,false);assert.ok(restored.javascript.includes('router_cancel_clone'));assert.ok(restored.javascript.includes('Parameters<typeof original_router_cancel_is_set>[0]'));assert.ok(restored.javascript.includes('ReturnType<typeof original_router_cancel_new>'));const token=await prepareOwnedCancellationRuntime(restored.program);assert.equal(evaluateOwnedCancellation(restored.program,'shared',[],token),true);assert.equal(evaluateOwnedCancellation(restored.program,'moved',[],token),true);const resource=evaluateOwnedCancellation(restored.program,'produced',[],token);assert.equal(evaluateOwnedCancellation(restored.program,'borrowed',[resource],token),false);
 const typedData=ownedCancellationReceivingData([{path:'caller.mts',source:restored.typescript}]),typed=translateOwnedCancellationTypeScript(restored.typescript,{context:createOwnedCancellationContext(typedData),sourcePath:'caller.mts'});assert.ok(sameRustSourceSyntax(typed.rust,result.rust));
});
test('canonical inverse reissues moves and native borrowing instead of accepting method spellings or public source observations',limits,()=>{
 const {data,result}=checked(),moved=result.rust.replace('let next = original;','let next = original;\nlet illegal = crate::translation_async_control_core::cancel_is_set(&original);');assert.notEqual(moved,result.rust);assert.throws(()=>inverse(moved,data));
 const borrowed=result.rust.replace('cancel_is_set(&next)','cancel_is_set(next)');assert.notEqual(borrowed,result.rust);assert.throws(()=>inverse(borrowed,data),/reproduce|borrow|source/u);
 const path=result.rust.replace('crate::translation_async_control_core::cancel_clone','crate::unregistered_resource::cancel_clone');assert.notEqual(path,result.rust);assert.throws(()=>inverse(path,data));
 const support=result.rust.replace('fn __ro_copy','fn changed_support');assert.notEqual(support,result.rust);assert.throws(()=>inverse(support,data),/support|source/u);
});
test('authoritative caller source must match its current complete source and native libraries cannot be rewritten',limits,()=>{
 const {data,result}=checked(),actual={...data,files:data.files.concat([{path:'caller.rs',source:result.rust}])},context=createOwnedCancellationContext(actual);assert.throws(()=>translateOwnedCancellationRust(result.rust+'\n// different\n',{context,sourcePath:'caller.rs',javascriptPath:'caller.mjs'}),/source/u);assert.throws(()=>translateOwnedCancellationRust(result.rust,{context,sourcePath:'src/translation_async_control_core.rs',javascriptPath:'caller.mjs'}),/native library/u);
});
test('complete original canonical inverse and projection sources retain both rule sequences and physical immutable originals',limits,()=>{
 const plan=prepareOwnedCancellationInverseSources();assert.equal(plan.files.length,4);assert.equal(plan.receivingExecuted,false);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}const inverse=plan.files.find(row=>row.path.endsWith('/owned-cancellation-rust.mjs'));assert.ok(inverse.originalPath.endsWith('/originals/owned-outcome-rust.mjs.txt'));
});

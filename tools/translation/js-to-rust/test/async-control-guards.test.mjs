// Independent original guard/source/resource regression SOURCE. UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateAsyncControlCallerJavaScript,translateAsyncControlCallerTypeScript,readAsyncControlCallerMeta} from '../async-control-callers.mjs';
import {translateAsyncControlCallerRust} from '../async-control-rust.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareAsyncControlGuardSources} from '../../prepare-async-control-guard-sources.mjs';
import {asyncControlReceivingInput,verifyAsyncControlTargets} from './async-control-receiving-fixture.mjs';
const limits={timeout:60000},prelude=`import {router_cancel_is_set as isSet,router_async_sleep as sleep,router_async_channel as channel,router_async_dispose as dispose} from './runtime/async-control-runtime.mjs';
import {deferFilesystemFlow as defer} from './runtime/extensions/filesystem-effects-runtime.mjs';
`,guard=name=>'if(typeof '+name+'!=="bigint"||'+name+'<0n||'+name+'>18446744073709551615n){throw new RangeError("Control u64 input outside native range");}',source=prelude+`
/** @param {boolean} first @param {boolean} second */
export function guards(first,second){if(first){return true;}if(second)return false;return true;}
/** @param {boolean} first @param {boolean} second */
export function chained(first,second){if(first)return true;else if(second)return false;else return true;}
/** @param {bigint} amount @param {Parameters<typeof sleep>[1]} token */
export function selected(amount,token){return defer(async()=>{${guard('amount')}if(amount===0n){return await sleep(0n,token);}if(amount>86400000n)return await sleep(18446744073709551615n,token);return await sleep(0n,token);});}
/** @param {boolean} first @param {boolean} second @param {Parameters<typeof sleep>[1]} token */
export function cleanup(first,second,token){return defer(async()=>{const pair=channel(1n);if(pair.$==='Err'){return pair;}const [sender,receiver]=pair.field0;const outcome=await sleep(0n,token);if(outcome.$==='Err'){dispose(receiver);return outcome;}if(first){dispose(receiver);return outcome;}if(second){dispose(receiver);return outcome;}dispose(receiver);return outcome;});}
/** @param {Parameters<typeof isSet>[0]} token */
export function cancelBranch(token){if(isSet(token))return true;return false;}
`;
const translated=code=>translateAsyncControlCallerJavaScript(code,asyncControlReceivingInput().options);
test('early return guards and else-if chains retain every source path complete continuations and original Boolean results under JS and strict TS',limits,async()=>{
 const result=translated(source),rows=JSON.parse(result.meta).functions;assert.equal(rows.length,5);const first=rows.find(row=>row.name==='guards').flow;assert.equal(first.tail.sourceContinuation.kind,'complete-remaining-tail');assert.equal(first.tail.sourceContinuation.statementCount,2);assert.equal(first.tail.no.tail.sourceContinuation.statementCount,1);assert.ok(result.rust.includes('if first'));await verifyAsyncControlTargets(result,async(api,runtime)=>{for(const [a,b,wanted]of [[false,false,true],[false,true,false],[true,false,true],[true,true,true]]){assert.equal(api.guards(a,b),wanted);assert.equal(api.chained(a,b),wanted);}const token=runtime.router_cancel_new();for(const [a,b]of [[false,false],[false,true],[true,false],[true,true]])assert.deepEqual(await api.cleanup(a,b,token),{$:'Ok',field0:null});assert.equal(api.cancelBranch(token),false);runtime.router_cancel_set(token);assert.equal(api.cancelBranch(token),true);});
});
test('cold numeric guard returns preserve polling-time range and cancellation checks without long waits',limits,async()=>{
 await verifyAsyncControlTargets(translated(source),async(api,runtime)=>{const token=runtime.router_cancel_new();assert.deepEqual(await api.selected(0n,token),{$:'Ok',field0:null});assert.deepEqual(await api.selected(1n,token),{$:'Ok',field0:null});assert.deepEqual(await api.selected(86400001n,token),{$:'Err',field0:{$:'InvalidInput'}});const cold=api.selected(0n,token);runtime.router_cancel_set(token);assert.deepEqual(await cold,{$:'Err',field0:{$:'Cancelled'}});const invalid=api.selected(-1n,token);assert.equal(typeof invalid.then,'function');await assert.rejects(()=>Promise.resolve(invalid),RangeError);});
});
test('guard continuations retain all actual receiver disposal requirements before any resource-bearing return',limits,()=>{
 for(const changed of [source.replace('if(first){dispose(receiver);return outcome;}','if(first){return outcome;}'),source.replace('if(second){dispose(receiver);return outcome;}','if(second){return outcome;}'),source.replace('dispose(receiver);return outcome;});}\n/**','return outcome;});}\n/**')]){assert.notEqual(changed,source);assert.throws(()=>translated(changed));}const result=translated(source),changed=JSON.parse(result.meta);changed.functions.find(row=>row.name==='guards').flow.tail.sourceContinuation.statementCount=0;assert.throws(()=>readAsyncControlCallerMeta(JSON.stringify(changed),source,asyncControlReceivingInput().options),/differ/u);
});
test('complete typed and canonical Rust reproduction retain branch semantics whole original source and both target CST inverses',limits,()=>{
 const {options}=asyncControlReceivingInput(),first=translated(source),typed=translateAsyncControlCallerTypeScript(first.typescript,asyncControlReceivingInput('caller.mts').options),restored=translateAsyncControlCallerRust(first.rust,{sourcePath:'rust/src/caller.rs',javascriptPath:options.sourcePath,runtimePath:options.runtimePath,runtimeSource:options.runtimeSource,nativeRootSource:options.nativeRootSource,nativeSource:options.nativeSource});assert.equal(sameRustSourceSyntax(first.rust,typed.rust),true);assert.equal(sameRustSourceSyntax(first.rust,restored.rust),true);assert.equal(restored.asyncControlRustSourceHistory.equation.inverse,first.rust);for(const equation of first.targetSourceEquations)assert.equal(equation.inverse,source);assert.equal(restored.runtimeParity,false);assert.equal(restored.rustExecuted,false);
});
test('fall-through guard bodies missing tails incompatible return domains and statements after complete branches remain explicit source refusals',limits,()=>{
 for(const body of ['/** @param {boolean} choose */export function bad(choose){if(choose){const ignored=true;}return false;}','/** @param {boolean} choose */export function bad(choose){if(choose)return true;}','/** @param {boolean} choose */export function bad(choose){if(choose)return true;return null;}','/** @param {boolean} choose */export function bad(choose){if(choose)return true;else return false;return true;}','/** @param {boolean} choose */export function bad(choose){if(choose){return true;}else if(choose){return false;}}'])assert.throws(()=>translated(prelude+body));
});
test('two whole source equations retain original complete flow checker both phases and every full inverse',limits,()=>{
 const plan=prepareAsyncControlGuardSources();assert.equal(plan.files.length,2);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});

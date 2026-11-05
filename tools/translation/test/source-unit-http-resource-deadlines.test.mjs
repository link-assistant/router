// Independent physical JS/TS/Rust deadline synchronization SOURCE. All unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {join} from 'node:path';
import {httpResourceOptionCallbackUnitFixture as fixture} from './http-resource-option-callback-unit-data.mjs';
const limits={timeout:60000};
const source=`import {router_async_with_deadline as deadline,router_async_sleep as sleep,router_cancel_is_set as isSet} from '../runtime/async-control-runtime.mjs';
import {deferFilesystemFlow as defer} from '../runtime/extensions/filesystem-effects-runtime.mjs';
/** @param {Parameters<typeof isSet>[0]} cancellation */
export function waited(cancellation){return defer(async()=>{return await deadline(1000n,cancellation,async child=>await sleep(0n,child));});}
`;
test('physical deadline source units synchronize actual native JS and TS authority edits through checked meta',limits,async t=>{
 const api=fixture(t);api.write(api.unit.paths.JavaScript,source);const first=api.plan();assert.equal(first.units[0].authority,'JavaScript');api.apply(first);api.commit();assert.match(api.read(api.unit.paths.Rust),/async move/u);
 api.write(api.unit.paths.Rust,api.read(api.unit.paths.Rust).replace('0_u64','1_u64'));const native=api.plan();assert.equal(native.units[0].authority,'Rust');api.apply(native);api.commit();assert.match(api.read(api.unit.paths.JavaScript),/1n/u);
 api.write(api.unit.paths.JavaScript,api.read(api.unit.paths.JavaScript).replace('1n','2n'));const javascript=api.plan();assert.equal(javascript.units[0].authority,'JavaScript');api.apply(javascript);api.commit();api.write(api.unit.paths.TypeScript,api.read(api.unit.paths.TypeScript).replace('2n','3n'));const typescript=api.plan();assert.equal(typescript.units[0].authority,'TypeScript');api.apply(typescript);
 const caller=await import(pathToFileURL(join(api.root,api.unit.paths.JavaScript))),control=await import(pathToFileURL(join(api.root,'js/runtime/async-control-runtime.mjs')));assert.deepEqual(await caller.waited(control.router_cancel_new()),{$:'Ok',field0:{$:'Ok',field0:null}});assert.equal(typescript.rustExecuted,false);assert.equal(typescript.runtimeParity,false);assert.ok(typescript.inputs.some(row=>row.path==='rust/src/translation_async_control_core.rs'));
});
test('forged native output stale control sources and concurrent authority edits retain transaction refusals',limits,t=>{
 const api=fixture(t);api.write(api.unit.paths.JavaScript,source);api.apply(api.plan());api.commit();api.write(api.unit.paths.JavaScript,api.read(api.unit.paths.JavaScript).replace('0n','1n'));const plan=api.plan(),forged=structuredClone(plan);forged.outputs.find(row=>row.path===api.unit.paths.Rust).after+='\n// forged\n';assert.throws(()=>api.apply(forged),/fresh source translation/u);const original=api.read(api.unit.paths.Rust);api.write(api.unit.paths.Rust,original+'\n// concurrent\n');assert.throws(()=>api.plan(),/concurrent source edits/u);api.write(api.unit.paths.Rust,original);const path='rust/src/translation_async_control_core.rs';api.write(path,api.read(path)+'\n// changed\n');assert.throws(()=>api.plan());
});

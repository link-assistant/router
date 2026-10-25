// Independent strict Boolean value SOURCE. Every case remains unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceBooleanValueSources} from '../../prepare-http-resource-boolean-value-sources.mjs';
const limits={timeout:60000},imports="import {router_owned_result_bool_err as err,router_owned_result_bool_unwrap as unwrap} from './runtime/owned-result-runtime.mjs';\n";
const source=imports+`export function negated(flag:boolean){return !flag;}
export function combined(left:boolean,right:boolean){const selected=left&&right;return selected||!left;}
export function equal(left:boolean,right:boolean){return (!left)===(!right);}
export function lazyAnd(flag:boolean){return flag&&unwrap(err('selected right side'));}
export function lazyOr(flag:boolean){return flag||unwrap(err('selected right side'));}
export function argument(flag:boolean){return negated(flag&&true);}
export function argumentNot(flag:boolean){return negated(!flag);}
`;
function input(value,sourcePath='caller.mts'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])};}
test('strict Boolean locals arguments and returns retain original short-circuit selection',limits,async()=>{
 const result=translateHttpResourceCallerTypeScript(source,input(source)),javascript=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs'));assert.ok(sameRustSourceSyntax(result.rust,javascript.rust));await verifyHttpResourceTargets(result,async api=>{for(const left of [false,true])for(const right of [false,true]){assert.equal(api.negated(left),!left);assert.equal(api.combined(left,right),(left&&right)||!left);assert.equal(api.equal(left,right),left===right);assert.equal(api.argument(left),!left);assert.equal(api.argumentNot(left),left);}assert.equal(api.lazyAnd(false),false);assert.equal(api.lazyOr(true),true);assert.throws(()=>api.lazyAnd(true),/selected right side/u);assert.throws(()=>api.lazyOr(false),/selected right side/u);});assert.equal(result.rustExecuted,false);
 const inverse=translateHttpResourceCallerRust(result.rust,{...input(result.rust,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(result.rust,inverse.rust));
});
test('logical values cannot admit JavaScript truthiness or hide incompatible skipped-arm state',limits,()=>{
 for(const body of ['export function bad(){return !1n;}','export function bad(flag:boolean){return flag&&7n;}','export function bad(flag:boolean){return flag||\'yes\';}']){const value=imports+body;assert.throws(()=>translateHttpResourceCallerTypeScript(value,input(value)),body);}
 const result=translateHttpResourceCallerTypeScript(source,input(source)),meta=JSON.parse(result.meta);meta.functions.find(row=>row.name==='negated').flow.tail.value.type='u64';assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),source,input(source),{language:'TypeScript'}));
});
test('complete original Boolean source substitutions retain both inverse phases',limits,()=>{
 const plan=prepareHttpResourceBooleanValueSources();assert.equal(plan.files.length,2);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});

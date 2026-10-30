// Independent terminal-loop SOURCE. Every case remains unrun during drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceShadowCallerRust} from '../http-resource-shadow-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceReturningLoopSources} from '../../prepare-http-resource-returning-loops-sources.mjs';
const limits={timeout:60000};
function input(source,sourcePath='caller.mjs'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source}])};}
test('terminal actual infinite loops retain all checked return domains through JS TS meta and Rust',limits,async()=>{
 const source='/** @param {boolean} flag */ export function selected(flag){for(;;){if(flag){return true;}else{return false;}}}\nexport function literal(){for(;;){return true;}}\n',result=translateHttpResourceCallerJavaScript(source,input(source)),typed=translateHttpResourceCallerTypeScript(result.typescript,input(result.typescript,'caller.mts'));assert.ok(sameRustSourceSyntax(result.rust,typed.rust));for(const row of JSON.parse(result.meta).functions){assert.equal(row.flow.tail.kind,'loop-return');assert.equal(row.returns,'bool');assert.ok(row.flow.functionReturns.length>0);}assert.match(result.rust,/loop\s*\{/u);await verifyHttpResourceTargets(result,api=>{assert.equal(api.selected(true),true);assert.equal(api.selected(false),false);assert.equal(api.literal(),true);});assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
});
test('original native loops reconstruct real final branch returns without a fabricated fallback',limits,async()=>{
 const source='pub fn selected(flag: bool) -> bool { loop { if flag { return true; } else { return false; } } }',result=translateHttpResourceShadowCallerRust(source,{...input(source,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(result.rust,result.httpResourceRustSourceHistory.normalizedSource));assert.equal(result.httpResourceRustSourceHistory.equation.inverse,source);assert.equal(JSON.parse(result.meta).functions[0].flow.tail.kind,'loop-return');await verifyHttpResourceTargets(result,api=>{assert.equal(api.selected(true),true);assert.equal(api.selected(false),false);});
});
test('loop-local no-else Option rules now connect to a complete whole-function source proposal',limits,async()=>{
 const source='pub fn selected(value: Option<bool>) -> Option<bool> { loop { if let Some(payload) = value { return Some(!payload); } return None; } }',result=translateHttpResourceShadowCallerRust(source,{...input(source,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.equal(result.httpResourceRustSourceHistory.equation.inverse,source);assert.match(result.httpResourceRustSourceHistory.normalizedSource,/return Some\(\(!payload\)\);/u);assert.ok(sameRustSourceSyntax(result.rust,result.httpResourceRustSourceHistory.normalizedSource));await verifyHttpResourceTargets(result,api=>{assert.deepEqual(api.selected({$:'None'}),{$:'None'});assert.deepEqual(api.selected({$:'Some',field0:false}),{$:'Some',field0:true});assert.deepEqual(api.selected({$:'Some',field0:true}),{$:'Some',field0:false});});
});
test('terminal loops preserve actual returned immutable input roots',limits,async()=>{
 const source='/** @param {string} value */ export function selected(value){for(;;){return value;}}',result=translateHttpResourceCallerJavaScript(source,input(source)),row=JSON.parse(result.meta).functions[0];assert.deepEqual(row.flow.returnRoots,['value']);assert.match(result.rust,/fn selected<'a>\(value: &'a str\) -> &'a str/u);await verifyHttpResourceTargets(result,api=>{assert.equal(api.selected('é😀'),'é😀');});
});
test('break continue fallthrough mixed returns finite loops and forged terminal records remain refused',limits,()=>{
 for(const body of ['for(;;){break;}','for(;;){continue;}','for(;;){}','for(;;){if(flag){return true;}else{continue;}}','for(;;){if(flag){return true;}else{return 1n;}}','while(flag){return true;}']){const source='/** @param {boolean} flag */ export function bad(flag){'+body+'}';assert.throws(()=>translateHttpResourceCallerJavaScript(source,input(source)),body);}
 const source='export function selected(){for(;;){return true;}}',result=translateHttpResourceCallerJavaScript(source,input(source)),meta=JSON.parse(result.meta);meta.functions[0].flow.tail.kind='fallthrough';assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),source,input(source)));const changed=input(source);changed.files=changed.files.map(row=>row.path==='caller.mjs'?{...row,source:source+'\n'}:row);assert.throws(()=>translateHttpResourceCallerJavaScript(source,changed));
});
test('three complete returning-loop source equations preserve native owners two phases and full inverses',limits,()=>{
 const plan=prepareHttpResourceReturningLoopSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});

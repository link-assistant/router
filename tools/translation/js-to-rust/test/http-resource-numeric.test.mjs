// Independent fixed-width algorithm regression SOURCE. All cases are unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceNumericSources} from '../../prepare-http-resource-numeric-sources.mjs';
const limits={timeout:60000},imports=`import {router_integer_u64_wrapping_mul as multiply,router_integer_u64_saturating_sub as subtract,router_integer_u64_checked_add as add} from './runtime/integer-runtime.mjs';
import {router_option_u64_unwrap_or as fallback,router_option_str_unwrap_or as textOr} from './runtime/primitive-option-runtime.mjs';
import {router_text_strip_prefix as prefix} from './runtime/text-runtime.mjs';
`;
const guard=name=>'if(typeof '+name+'!=="bigint"||'+name+'<0n||'+name+'>18446744073709551615n){throw new RangeError("Control u64 input outside native range");}';
const source=imports+`/** @param {bigint} amount @returns {bigint} */ export function factorial(amount){${guard('amount')}if(amount===0n){return 1n;}else{return multiply(amount,factorial(subtract(amount,1n)));}}
/** @param {bigint} left @param {bigint} right */ export function ordered(left,right){${guard('left')}${guard('right')}return left<=right;}
/** @param {boolean} flag */ export function differs(flag){return flag!==false;}
export function overflow(){return fallback(add(18446744073709551615n,1n),7n);}
/** @param {string} input */ export function stripped(input){return textOr(prefix(input,'x'),'fallback');}
`;
function input(source,sourcePath='caller.mjs'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source}])};}
test('recursive wrapping arithmetic checked Options and numeric comparisons agree under JS and strict TS',limits,async()=>{
 const result=translateHttpResourceCallerJavaScript(source,input(source)),typed=translateHttpResourceCallerTypeScript(result.typescript,input(result.typescript,'caller.mts'));assert.ok(sameRustSourceSyntax(result.rust,typed.rust));assert.match(result.rust,/u64_wrapping_mul/u);assert.match(result.rust,/amount == 0_u64/u);assert.match(result.rust,/left <= right/u);
 await verifyHttpResourceTargets(result,async api=>{for(const [amount,expected]of [[0n,1n],[1n,1n],[5n,120n],[20n,2432902008176640000n],[21n,14197454024290336768n]])assert.equal(api.factorial(amount),expected);for(const [left,right,expected]of [[0n,0n,true],[0n,18446744073709551615n,true],[18446744073709551615n,0n,false]])assert.equal(api.ordered(left,right),expected);assert.equal(api.differs(true),true);assert.equal(api.differs(false),false);assert.equal(api.overflow(),7n);assert.equal(api.stripped('xé'),'é');assert.equal(api.stripped('é'),'fallback');assert.throws(()=>api.factorial(-1n),RangeError);assert.throws(()=>api.factorial(18446744073709551616n),RangeError);});assert.equal(result.rustExecuted,false);
});
test('range-less signed mixed-domain and unregistered comparisons retain complete refusals',limits,()=>{
 for(const body of [
  '/** @param {bigint} value */ export function bad(value){return multiply(value,1n);}',
  '/** @param {boolean} value */ export function bad(value){return value<false;}',
  '/** @param {string} left @param {string} right */ export function bad(left,right){return left<right;}',
  'export function bad(){return 0n===false;}',
  'export function bad(){return 0n==0n;}',
 ]){const candidate=imports+body;assert.throws(()=>translateHttpResourceCallerJavaScript(candidate,input(candidate)));}
 for(const path of ['src/translation_integer_core.rs','src/translation_primitive_option_core.rs','runtime/integer-runtime.mjs','runtime/primitive-option-runtime.d.mts']){const data=input(source);data.files.find(row=>row.path===path).source+='\n// changed\n';assert.throws(()=>translateHttpResourceCallerJavaScript(source,data));}
});
test('canonical native comparison and fixed-width Option composition reproduce complete source',limits,()=>{
 const native='pub fn ordered(left: u64, right: u64) -> bool { (left <= right) }\npub fn overflow() -> u64 { crate::translation_primitive_option_core::u64_unwrap_or(crate::translation_integer_core::u64_checked_add(18446744073709551615_u64, 1_u64), 7_u64) }\n',result=translateHttpResourceCallerRust(native,{...input(native,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(native,result.rust));
});
test('complete original source joins and physical numeric mapping substitutions retain inverses',limits,()=>{
 const plan=prepareHttpResourceNumericSources();assert.equal(plan.files.length,7);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});

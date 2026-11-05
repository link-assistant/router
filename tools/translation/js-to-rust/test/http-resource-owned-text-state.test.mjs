// Independent owned text state regression SOURCE. All cases remain unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceOwnedTextStateSources} from '../../prepare-http-resource-owned-text-state-sources.mjs';
const limits={timeout:60000},imports=`import {router_text_repeat as repeat,router_text_trim as trim,router_text_replace as replace} from './runtime/text-runtime.mjs';
import {router_integer_u64_saturating_add as increment} from './runtime/integer-runtime.mjs';
`;
const guard='if(typeof limit!=="bigint"||limit<0n||limit>18446744073709551615n){throw new RangeError("Control u64 input outside native range");}';
const body=`/** @param {string} input @param {bigint} limit */ export function doubled(input,limit){${guard}let current=repeat(input,1n);let count=0n;while(count<limit){current=repeat(current,2n);count=increment(count,1n);}return current;}
export function reinitialized(){let current=repeat('a',1n);const previous=current;current=repeat(previous,2n);return current;}
export function inlineView(){let current=repeat(' x ',1n);current=replace(trim(current),'x','é');return current;}
`;
function input(source,sourcePath='caller.mjs'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source}])};}
test('owned String replacement moved-slot reinitialization and loop state agree under JS and strict TS',limits,async()=>{
 const source=imports+body,result=translateHttpResourceCallerJavaScript(source,input(source)),typed=translateHttpResourceCallerTypeScript(result.typescript,input(result.typescript,'caller.mts'));assert.ok(sameRustSourceSyntax(result.rust,typed.rust));assert.match(result.rust,/let mut current/u);assert.match(result.rust,/current = crate::translation_text_core::repeat\(&current, 2_u64\)/u);
 await verifyHttpResourceTargets(result,async api=>{for(const [limit,expected]of [[0n,'é😀'],[1n,'é😀é😀'],[2n,'é😀é😀é😀é😀']])assert.equal(api.doubled('é😀',limit),expected);assert.equal(api.reinitialized(),'aa');assert.equal(api.inlineView(),'é');});assert.equal(result.rustExecuted,false);
});
test('borrowed initialization live first or second roots and borrowed returns cannot waive ownership',limits,()=>{
 const either='/** @param {string} left @param {string} right @param {boolean} choice */ function either(left,right,choice){if(choice){return left;}else{return right;}}';
 for(const body of [
  '/** @param {string} input */ export function bad(input){let current=input;return current;}',
  "export function bad(){let current=repeat(' x ',1n);const view=trim(current);current=repeat('y',1n);return repeat(view,1n);}",
  "/** @param {string} input @param {boolean} choice */ export function bad(input,choice){let current=repeat('x',1n);const view=either(input,current,choice);current=repeat('y',1n);return repeat(view,1n);}",
  "export function bad(){let current=repeat(' x ',1n);current=replace(current,'x','y');return trim(current);}",
 ]){const source=imports+either+body;assert.throws(()=>translateHttpResourceCallerJavaScript(source,input(source)));}
});
test('whole handwritten canonical owned native state and moves reproduce every token',limits,()=>{
 const native='pub fn reinitialized() -> String { let mut current = crate::translation_text_core::repeat("a", 1_u64); let previous = current; current = crate::translation_text_core::repeat(&previous, 2_u64); current }\n',result=translateHttpResourceCallerRust(native,{...input(native,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(native,result.rust));
});
test('complete original flow and native projection substitutions retain both source sequences',limits,()=>{
 const plan=prepareHttpResourceOwnedTextStateSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});

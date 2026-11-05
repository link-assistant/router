// Independent complete borrowed-root join SOURCE. All cases are unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceRootSetSources} from '../../prepare-http-resource-root-set-sources.mjs';
const limits={timeout:60000},imports=`import {router_text_trim as trim,router_text_repeat as repeat} from './runtime/text-runtime.mjs';
import {router_owned_result_str_ok as borrowed,router_owned_result_str_ok_option as optional,router_owned_result_text_ok as owned} from './runtime/owned-result-runtime.mjs';
`;
const body=`/** @param {string} left @param {string} right @param {boolean} choice */ export function selected(left,right,choice){return either(left,right,choice);}
/** @param {string} left @param {string} right @param {boolean} choice */ export function wrapped(left,right,choice){return optional(borrowed(either(left,right,choice)));}
/** @param {string} left @param {string} right @param {boolean} choice */ function either(left,right,choice){if(choice){return trim(left);}else{return trim(right);}}
/** @param {string} input @param {boolean} choice */ export function copied(input,choice){const local=repeat(input,2n);const view=either(local,input,choice);return repeat(view,1n);}
`;
function input(source,sourcePath='caller.mjs'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source}])};}
test('every actual helper argument root joins through local values Result Option and native lifetimes',limits,async()=>{
 const source=imports+body,result=translateHttpResourceCallerJavaScript(source,input(source)),typed=translateHttpResourceCallerTypeScript(result.typescript,input(result.typescript,'caller.mts'));assert.ok(sameRustSourceSyntax(result.rust,typed.rust));const rows=JSON.parse(result.meta).functions;assert.deepEqual(rows.find(row=>row.name==='selected').flow.returnRoots,['left','right']);assert.deepEqual(rows.find(row=>row.name==='wrapped').flow.returnRoots,['left','right']);assert.deepEqual(rows.find(row=>row.name==='copied').flow.returnRoots,[]);assert.match(result.rust,/left: &'a str, right: &'a str/u);
 await verifyHttpResourceTargets(result,async api=>{for(const choice of [true,false]){const expected=choice?'é':'😀';assert.equal(api.selected(' é ',' 😀 ',choice),expected);assert.deepEqual(api.wrapped(' é ',' 😀 ',choice),{$:'Some',field0:expected});assert.equal(api.copied('x',choice),choice?'xx':'x');}});assert.equal(result.rustExecuted,false);
});
test('a possible local owner cannot escape or move even when it is not the first returned root',limits,()=>{
 for(const body of [
  '/** @param {string} input @param {boolean} choice */ export function bad(input,choice){const local=repeat(input,2n);return either(input,local,choice);}',
  '/** @param {string} input @param {boolean} choice */ export function bad(input,choice){const local=repeat(input,2n);const view=either(input,local,choice);return owned(local);}',
 ]){const source=imports+'/** @param {string} left @param {string} right @param {boolean} choice */ function either(left,right,choice){if(choice){return left;}else{return right;}}'+body;assert.throws(()=>translateHttpResourceCallerJavaScript(source,input(source)));}
 const source=imports+body,result=translateHttpResourceCallerJavaScript(source,input(source)),changed=JSON.parse(result.meta);changed.functions[0].flow.tail.value.roots=['left'];assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(changed),source,input(source)));
});
test('complete handwritten native shared lifetime helper calls reproduce every source token',limits,()=>{
 const native="pub fn selected<'a>(left: &'a str, right: &'a str, choice: bool) -> &'a str { either(left, right, choice) }\nfn either<'a>(left: &'a str, right: &'a str, choice: bool) -> &'a str { if choice { left } else { right } }\n",result=translateHttpResourceCallerRust(native,{...input(native,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(native,result.rust));
});
test('complete original root-flow and helper substitutions keep ordered native selection and inverses',limits,()=>{
 const plan=prepareHttpResourceRootSetSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});

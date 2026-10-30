// Independent borrowed JSON regression SOURCE. Every case remains unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceJsonViewSources} from '../../prepare-http-resource-json-view-sources.mjs';
import {json_macro_null as nil,json_macro_string as text,json_macro_object as object,json_macro_array as array} from '../../json-macro-runtime.mjs';
import {router_http_response} from '../../http-protocol-runtime.mjs';
const limits={timeout:60000},imports=`import {router_core_json_copy as copy,router_core_json_index_str as index,router_core_json_with_field as field} from './runtime/json-update-runtime.mjs';
import {router_state_json_object_has as has} from './runtime/json-state-runtime.mjs';
import {json_macro_null as nil} from './runtime/json-macro-runtime.mjs';
import {router_http_body_base64 as encoded} from './runtime/http-protocol-runtime.mjs';
import {router_text_repeat as repeat} from './runtime/text-runtime.mjs';
import {router_owned_result_text_ok as ownedOk} from './runtime/owned-result-runtime.mjs';
`;
const source=imports+`/** @param {Parameters<typeof index>[0]} value */ export function projected(value){const alias=value;return index(alias,'child');}
/** @param {Parameters<typeof index>[0]} value */ export function copied(value){const owner=copy(value);const view=index(owner,'child');return copy(view);}
/** @param {Parameters<typeof index>[0]} left @param {Parameters<typeof index>[0]} right @param {boolean} choice */ export function selected(left,right,choice){return either(left,right,choice);}
/** @param {Parameters<typeof index>[0]} left @param {Parameters<typeof index>[0]} right @param {boolean} choice */ function either(left,right,choice){if(choice){return index(left,'child');}else{return index(right,'child');}}
/** @param {Parameters<typeof index>[0]} input @param {boolean} choice */ export function secondRoot(input,choice){const owner=copy(input);const view=either(input,owner,choice);return copy(view);}
/** @param {Parameters<typeof index>[0]} input @param {boolean} choice */ export function scoped(input,choice){let owner=copy(input);let seen=false;if(choice){const view=index(owner,'child');seen=has(view,'value');}owner=field(owner,'after',nil());if(seen){return owner;}else{return owner;}}
/** @param {Parameters<typeof encoded>[0]} input */ export function copiedBody(input){const owner=copy(input);const view=encoded(owner);if(view.$==='Err'){return view;}return ownedOk(repeat(view.field0,1n));}
`;
function input(value,sourcePath='caller.mjs'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])};}
test('public immutable roots local JSON views multi-root helpers and scoped replacement retain JS and strict TS behavior',limits,async()=>{
 const result=translateHttpResourceCallerJavaScript(source,input(source)),typed=translateHttpResourceCallerTypeScript(result.typescript,input(result.typescript,'caller.mts'));assert.ok(sameRustSourceSyntax(result.rust,typed.rust));assert.match(result.rust,/projected<'a>\(value: &'a crate::translation_core::Json\) -> &'a crate::translation_core::Json/u);assert.deepEqual(JSON.parse(result.meta).functions.find(row=>row.name==='selected').flow.returnRoots,['left','right']);assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
 const left=object([['child',object([['value',text('é😀')]])]]),right=object([['child',text('λ')]]),leftChild=left.field0.entries[0].value,rightChild=right.field0.entries[0].value,response=router_http_response(200n,array([]),'aGk=');assert.equal(response.$,'Ok');
 await verifyHttpResourceTargets(result,async api=>{assert.strictEqual(api.projected(left),leftChild);assert.deepEqual(api.projected(nil()),nil());assert.deepEqual(api.copied(left),leftChild);assert.notStrictEqual(api.copied(left),leftChild);for(const choice of [false,true]){assert.strictEqual(api.selected(left,right,choice),choice?leftChild:rightChild);assert.deepEqual(api.secondRoot(left,choice),leftChild);assert.deepEqual(api.scoped(left,choice),object([['child',leftChild],['after',nil()]]));}assert.deepEqual(api.copiedBody(response.field0),{$:'Ok',field0:'aGk='});});
});
test('local loans cannot escape protect every possible JSON owner and cannot borrow a temporary',limits,()=>{
 const helper='/** @param {Parameters<typeof index>[0]} left @param {Parameters<typeof index>[0]} right @param {boolean} choice */ function either(left,right,choice){if(choice){return index(left,\'child\');}else{return index(right,\'child\');}}';
 for(const body of [
  '/** @param {Parameters<typeof index>[0]} input */ export function bad(input){const owner=copy(input);return index(owner,\'child\');}',
  '/** @param {Parameters<typeof index>[0]} input */ export function bad(input){let owner=copy(input);const view=index(owner,\'child\');owner=field(owner,\'after\',nil());return copy(view);}',
  '/** @param {Parameters<typeof index>[0]} input @param {boolean} choice */ export function bad(input,choice){let owner=copy(input);const view=either(input,owner,choice);owner=field(owner,\'after\',nil());return copy(view);}',
  '/** @param {Parameters<typeof index>[0]} input */ export function bad(input){const owner=copy(input);const view=index(owner,\'child\');const moved=owner;return copy(view);}',
  '/** @param {Parameters<typeof index>[0]} input */ export function bad(input){return copy(index(copy(input),\'child\'));}',
 ]){const value=imports+helper+body;assert.throws(()=>translateHttpResourceCallerJavaScript(value,input(value)),body);}
 const result=translateHttpResourceCallerJavaScript(source,input(source)),meta=JSON.parse(result.meta);meta.functions.find(row=>row.name==='selected').flow.returnRoots=['left'];assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),source,input(source)));
});
test('whole handwritten canonical native JSON reference lifetimes reproduce every original token',limits,()=>{
 const native="pub fn projected<'a>(value: &'a crate::translation_core::Json) -> &'a crate::translation_core::Json { crate::translation_core::json_index_str(value, \"child\") }\n",result=translateHttpResourceCallerRust(native,{...input(native,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(native,result.rust));
 const shorter=native.replace("value: &'a crate::translation_core::Json",'value: &crate::translation_core::Json');assert.throws(()=>translateHttpResourceCallerRust(shorter,{...input(shorter,'src/caller.rs'),javascriptPath:'caller.mjs'}));
});
test('complete original contracts caller flow lifetime emission and source histories retain both inverses',limits,()=>{
 const plan=prepareHttpResourceJsonViewSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});

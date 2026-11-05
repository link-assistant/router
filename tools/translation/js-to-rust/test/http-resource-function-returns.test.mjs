// Independent typed function/JS annotation regression SOURCE. All cases unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceFunctionReturnSources} from '../../prepare-http-resource-function-return-sources.mjs';
import {json_macro_null as nil,json_macro_string as text,json_macro_object as object} from '../../json-macro-runtime.mjs';
const limits={timeout:60000},imports=`import {router_text_trim as trim,router_text_repeat as repeat,router_text_len_utf8 as length} from './runtime/text-runtime.mjs';
import {router_core_json_copy as copy,router_core_json_index_str as index} from './runtime/json-update-runtime.mjs';
import {router_state_json_values_copy as copyValues,router_state_json_object_has as has} from './runtime/json-state-runtime.mjs';
`;
const source=imports+`export function trimmed(input:string):string{return trim(input);}
export function owned(input:string):string{return repeat(input,1n);}
export function size(input:string):bigint{return length(input);}
export function exists(input:Parameters<typeof copy>[0]):boolean{return has(input,'child');}
export function copied(input:Parameters<typeof copy>[0]):ReturnType<typeof copy>{return copy(input);}
export function borrowed(input:Parameters<typeof index>[0]):ReturnType<typeof index>{return index(input,'child');}
export function listed(values:Parameters<typeof copyValues>[0]):ReturnType<typeof copyValues>{return copyValues(values);}
export function nothing():null{return null;}
export function flip(flag:boolean):boolean{if(flag){return flip(false);}else{return false;}}
`;
function input(value,sourcePath='caller.mts'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])};}
test('actual inferred body domains govern explicit returns and JS keeps reusable native input docs',limits,async()=>{
 const result=translateHttpResourceCallerTypeScript(source,input(source)),javascript=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs'));assert.equal(result.typescript,source);assert.ok(result.targetSourceEquations.every(row=>row.inverse===source));assert.ok(sameRustSourceSyntax(result.rust,javascript.rust));assert.match(result.javascript,/@param \{Parameters<typeof copy>\[0\]\} input/u);assert.match(result.javascript,/@returns \{string\}/u);assert.match(result.rust,/trimmed<'a>\(input: &'a str\) -> &'a str/u);assert.match(result.rust,/owned\(input: &str\) -> String/u);assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
 const value=object([['child',text('é😀')]]),child=value.field0.entries[0].value,values=Object.freeze([nil(),child]);await verifyHttpResourceTargets(result,async api=>{assert.equal(api.trimmed(' é😀 '),'é😀');assert.equal(api.owned('é😀'),'é😀');assert.equal(api.size('é😀'),6n);assert.equal(api.exists(value),true);assert.deepEqual(api.copied(value),value);assert.notStrictEqual(api.copied(value),value);assert.strictEqual(api.borrowed(value),child);assert.deepEqual(api.listed(values),values);assert.equal(api.nothing(),null);assert.equal(api.flip(false),false);assert.equal(api.flip(true),false);});
});
test('source-owned JSDoc corrections canonical comments and repeat round trips stay usable',limits,()=>{
 for(const body of [
  '/** @param {boolean} input @returns {boolean} */ export function documented(input:string):string{return trim(input);}',
  'export function comments(input:Parameters</* doc */ typeof copy>[0]):ReturnType</* doc */ typeof copy>{return copy(input);}',
 ]){const typed=imports+body,first=translateHttpResourceCallerTypeScript(typed,input(typed)),js=translateHttpResourceCallerJavaScript(first.javascript,input(first.javascript,'caller.mjs')),again=translateHttpResourceCallerTypeScript(js.typescript,input(js.typescript));assert.ok(sameRustSourceSyntax(first.rust,js.rust));assert.ok(sameRustSourceSyntax(first.rust,again.rust));assert.equal(first.javascript,again.javascript);assert.ok(!first.javascript.includes('/* doc */'));if(body.includes('documented')){assert.match(first.javascript,/@param \{string\} input/u);assert.match(first.javascript,/@returns \{string\}/u);}}
});
test('annotations cannot grant owning JSON/list results or override wrong body domains',limits,()=>{
 for(const body of [
  'export function bad(input:string):boolean{return trim(input);}',
  'export function bad(input:Parameters<typeof copy>[0]):ReturnType<typeof copy>{return input;}',
  'export function bad(values:Parameters<typeof copyValues>[0]):ReturnType<typeof copyValues>{return values;}',
  'export function bad(input:Parameters<typeof copy>[0]):JsonValue{return copy(input);}',
  'export function bad(input:Parameters<typeof copy>[0]):Promise<ReturnType<typeof copy>>{return copy(input);}',
 ]){const typed=imports+body;assert.throws(()=>translateHttpResourceCallerTypeScript(typed,input(typed)),body);}
 const result=translateHttpResourceCallerTypeScript(source,input(source)),meta=JSON.parse(result.meta);meta.functions.find(row=>row.name==='copied').returns='json-ref';assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),source,input(source),{language:'TypeScript'}));
});
test('full original annotation-reader/source copies and native spans keep ordered complete inverses',limits,()=>{
 const plan=prepareHttpResourceFunctionReturnSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});

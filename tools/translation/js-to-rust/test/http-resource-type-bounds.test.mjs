// Independent original generic bound/default SOURCE. Every case remains unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceTypeBoundSources} from '../../prepare-http-resource-type-bound-sources.mjs';
import {json_macro_null as nil,json_macro_string as text} from '../../json-macro-runtime.mjs';
const limits={timeout:60000},imports="import {router_core_json_copy as copy} from './runtime/json-update-runtime.mjs';\nimport {router_state_json_values_copy as valuesCopy} from './runtime/json-state-runtime.mjs';\nimport {router_text_len_utf8 as length} from './runtime/text-runtime.mjs';\n";
const declarations=`export type Identity<Value = boolean> = Value;
type Earlier<First = boolean, Second = First> = Second;
type Bound<Value extends boolean = boolean> = Value;
type Input<Fn extends typeof copy = typeof copy> = Parameters<Fn>[0];
type Output<Fn extends typeof copy = typeof copy> = ReturnType<Fn>;
type Element<Values extends ReturnType<typeof valuesCopy>> = Values[number];
`;
const source=imports+declarations+`export function chosen(flag:Earlier):Identity{return flag;}
export function bounded(flag:Bound):Bound{return flag;}
export function copied(input:Input):Output{return copy(input);}
export function element(input:Element<ReturnType<typeof valuesCopy>>){return copy(input);}
`;
function input(value,sourcePath='caller.mts'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])};}
test('original defaults callable constraints indexed domains and earlier slots compose actual source obligations',limits,async()=>{
 const result=translateHttpResourceCallerTypeScript(source,input(source)),javascript=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs'));assert.ok(sameRustSourceSyntax(result.rust,javascript.rust));assert.equal(result.typescript,source);assert.doesNotMatch(result.javascript,/\btype (?:Identity|Earlier|Bound|Input|Output|Element)\b/u);for(const equation of result.targetSourceEquations)assert.equal(equation.inverse,source);await verifyHttpResourceTargets(result,async api=>{for(const flag of [true,false]){assert.equal(api.chosen(flag),flag);assert.equal(api.bounded(flag),flag);}assert.deepEqual(api.copied(nil()),nil());assert.deepEqual(api.element(text('é😀')),text('é😀'));});assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
});
test('the previously unsupported valid primitive constraint and default now retain their complete original source cases',limits,()=>{
 for(const declaration of ['type A<T extends boolean>=T;','type A<T=boolean>=T;']){const value=declaration+'export function chosen(){return null;}',result=translateHttpResourceCallerTypeScript(value,input(value));assert.equal(result.typescript,value);assert.equal(result.javascript.includes(declaration),false);}
});
test('wrong actual constraints unused defaults forward/self slots constructor shape and declaration cycles refuse',limits,()=>{
 for(const declaration of [
  'type A<T extends boolean=string>=T;',
  'type A<T=T>=T;',
  'type A<T=U,U=boolean>=T;',
  'type A<T extends U,U extends boolean>=T;',
  'type A<T=boolean,U>=T;',
  'type A<T extends unknown>=T;',
  'type A<T extends A<T>>=T;',
  'type A<T>=Parameters<T>[0];',
 ]){const value=imports+declaration+'export function chosen(){return null;}';assert.throws(()=>translateHttpResourceCallerTypeScript(value,input(value)),declaration);}
 for(const body of [
  'export function bad(flag:Bound<string>){return flag;}',
  'export function bad(input:Input<typeof length>){return input;}',
  'export function bad(input:Input<typeof copy,typeof copy>){return input;}',
  'export function bad(input:Element<Parameters<typeof valuesCopy>[0]>){return input;}',
  'type Ignored<Value,Other>=Value;export function bad(input:Ignored<string,Missing>){return input;}',
 ]){const value=imports+declarations+body;assert.throws(()=>translateHttpResourceCallerTypeScript(value,input(value)),body);}
 const result=translateHttpResourceCallerTypeScript(source,input(source)),meta=JSON.parse(result.meta);meta.functions.find(row=>row.name==='copied').parameters[0].type='json';assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),source,input(source),{language:'TypeScript'}));
});
test('complete original type bound caller annotation and retention copies retain every inverse phase',limits,()=>{
 const plan=prepareHttpResourceTypeBoundSources();assert.equal(plan.files.length,6);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});

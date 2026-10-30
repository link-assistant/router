// Independent native template substitution SOURCE. Every case remains unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {httpResourceOptionCallbackReceivingData} from './http-resource-option-callback-receiving-data.mjs';
import {verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceTypeTemplateSources} from '../../prepare-http-resource-type-template-sources.mjs';
const limits={timeout:60000},imports=`import {router_core_json_copy as copy,router_core_json_with_field as withField} from './runtime/json-update-runtime.mjs';
import {json_macro_null as nil} from './runtime/json-macro-runtime.mjs';
import {router_owned_result_bool_ok as okay} from './runtime/owned-result-runtime.mjs';
import {router_option_callback_bool_to_u64_map as map} from './runtime/primitive-option-callback-runtime.mjs';
import {router_async_receive as receive} from './runtime/async-control-runtime.mjs';
`;
const templates=`export type Identity<Value>=Value;type Again<T>=Identity<Identity<T>>;
export type Settled<Value>=Awaited<Value>;type Success<Value>=Extract<Value,{$:'Ok'}>;
type Flag=Again<boolean>;type Received=Settled<ReturnType<typeof receive>>;
`;
const source=imports+templates+`export function owned(input:Again<ReturnType<typeof copy>>):Again<ReturnType<typeof copy>>{return withField(input,'new',nil());}
export function recursive(flag:Flag):Again<boolean>{if(flag){return recursive(false);}else{return true;}}
export function selected(input:Success<ReturnType<typeof okay>>['field0']):boolean{return input;}
export function received(input:Received):Received{return input;}
export function mapped(input:Again<Parameters<typeof map>[0]>){return map(input,(value:Again<boolean>):Again<bigint>=>{if(value){return 7n;}else{return 4n;}});}
`;
function input(value,sourcePath='caller.mts'){return {sourcePath,...httpResourceOptionCallbackReceivingData([{path:sourcePath,source:value}])};}
test('original generic slots retain lexical arguments through inputs callbacks returns and recursion',limits,async()=>{
 const result=translateHttpResourceCallerTypeScript(source,input(source)),restored=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs'));assert.ok(sameRustSourceSyntax(result.rust,restored.rust));assert.equal(result.typescript,source);assert.doesNotMatch(result.javascript,/\btype (?:Identity|Again|Settled|Success|Flag|Received)\b/u);for(const equation of result.targetSourceEquations)assert.equal(equation.inverse,source);
 await verifyHttpResourceTargets(result,async api=>{assert.equal(api.recursive(true),true);assert.equal(api.recursive(false),true);assert.equal(api.selected(true),true);assert.equal(api.selected(false),false);const value={$:'Ok',field0:{$:'Some',field0:'é😀'}};assert.deepEqual(api.received(value),value);assert.deepEqual(api.mapped({$:'Some',field0:true}),{$:'Some',field0:7n});assert.deepEqual(api.mapped({$:'None'}),{$:'None'});});assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
});
test('type parameter substitutions cannot capture a different alias declaration environment',limits,()=>{
 const value='type Value=boolean;type Forward<Value>=Nested<Value>;type Nested<Other>=Identity<Other>;type Identity<T>=T;export function chosen(flag:Forward<Value>):Forward<Value>{return flag;}';const result=translateHttpResourceCallerTypeScript(value,input(value)),restored=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs'));assert.ok(sameRustSourceSyntax(result.rust,restored.rust));assert.match(result.rust,/flag: bool\) -> bool/u);
 const repeated='type Identity<T>=T;export function chosen(flag:Identity<Identity<boolean>>):Identity<boolean>{return flag;}';assert.match(translateHttpResourceCallerTypeScript(repeated,input(repeated)).rust,/flag: bool/u);
});
test('complete template declarations arity cycles range and ownership stay independent obligations',limits,()=>{
 for(const declarations of [
  'type A<T>=B<T>;type B<T>=A<T>;',
  'type A<T>=T;type A<T>=T;',
  'type A<T>=number;',
  'type A<T,T>=T;',
  'type A<T extends A<T>>=T;',
  'type A<T extends boolean=string>=T;',
  'type A<T>=Parameters<T>[0];',
  'type A<T>=T[number];',
  'type A<T>=B<T>;type B<U>=T;',
 ]){const value=declarations+'export function chosen(){return null;}';assert.throws(()=>translateHttpResourceCallerTypeScript(value,input(value)),declarations);}
 for(const type of ['Again','Again<boolean,string>','Again<bigint>']){const value=imports+templates+'export function chosen(flag:'+type+'){return flag;}';assert.throws(()=>translateHttpResourceCallerTypeScript(value,input(value)),type);}
 const borrowed=imports+templates+"export function chosen(value:Again<Parameters<typeof copy>[0]>){return withField(value,'new',nil());}";assert.throws(()=>translateHttpResourceCallerTypeScript(borrowed,input(borrowed)));
 const result=translateHttpResourceCallerTypeScript(source,input(source)),meta=JSON.parse(result.meta);meta.functions.find(row=>row.name==='owned').parameters[0].type='json-ref';assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),source,input(source),{language:'TypeScript'}));
});
test('complete original template source substitutions retain all inverses and fixed phase names',limits,()=>{
 const plan=prepareHttpResourceTypeTemplateSources();assert.equal(plan.files.length,6);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});

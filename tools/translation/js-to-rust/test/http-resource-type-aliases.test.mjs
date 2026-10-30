// Independent alias and erasure regression SOURCE. Every case remains unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {httpResourceOptionCallbackReceivingData} from './http-resource-option-callback-receiving-data.mjs';
import {verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceTypeAliasSources} from '../../prepare-http-resource-type-alias-sources.mjs';
const limits={timeout:60000},imports=`import {router_text_repeat as repeat,router_text_len_utf8 as length} from './runtime/text-runtime.mjs';
import {router_core_json_copy as copy,router_core_json_with_field as withField} from './runtime/json-update-runtime.mjs';
import {json_macro_null as nil} from './runtime/json-macro-runtime.mjs';
import {router_option_callback_bool_to_u64_map as map} from './runtime/primitive-option-callback-runtime.mjs';
`;
const aliases=`export type Flag=boolean;type NextFlag=Flag;type Text=string;
export type Owned=ReturnType<typeof copy>;type OwnedAgain=Owned;
type Choice=Parameters<typeof map>[0];type Count=bigint;
`;
const source=imports+aliases+`export function recursive(flag:NextFlag):Flag{if(flag){return recursive(false);}else{return true;}}
export function owned(input:OwnedAgain):Owned{return withField(input,'x',nil());}
export function measured(input:Text):Count{return length(input);}
export function mapped(input:Choice){return map(input,(value:Flag):Count=>{if(value){return 5n;}else{return 2n;}});}
export function expanded(input:Text):ReturnType<typeof repeat>{return repeat(input,2n);}
`;
function input(value,sourcePath='caller.mts'){return {sourcePath,...httpResourceOptionCallbackReceivingData([{path:sourcePath,source:value}])};}
test('original aliases expand into independently checked JS docs while complete TS and target inverses remain',limits,async()=>{
 const result=translateHttpResourceCallerTypeScript(source,input(source));assert.equal(result.typescript,source);assert.doesNotMatch(result.javascript,/\btype (?:Flag|NextFlag|Owned|Text|Choice|Count)\b/u);assert.doesNotMatch(result.javascript,/@(?:param|returns)\s*\{(?:Flag|NextFlag|Owned|OwnedAgain|Text|Choice|Count)\}/u);
 const restored=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs'));assert.ok(sameRustSourceSyntax(result.rust,restored.rust));for(const equation of result.targetSourceEquations)assert.equal(equation.inverse,source);
 await verifyHttpResourceTargets(result,async api=>{assert.equal(api.recursive(true),true);assert.equal(api.recursive(false),true);assert.equal(api.measured('é😀'),6n);assert.equal(api.expanded('é',2n),'éé');assert.deepEqual(api.mapped({$:'Some',field0:true}),{$:'Some',field0:5n});assert.deepEqual(api.mapped({$:'None'}),{$:'None'});});assert.equal(result.receivingExecuted,false);assert.equal(result.rustExecuted,false);
});
test('forward aliases and adjacent native erasure boundaries preserve complete functions and owned returns',limits,()=>{
 for(const declaration of ['type First=Later;type Later=string;','type First=(string);']){const value=imports+declaration+'export function shared(input:First):First{return input;}';const result=translateHttpResourceCallerTypeScript(value,input(value)),restored=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs'));assert.ok(sameRustSourceSyntax(result.rust,restored.rust));assert.match(result.rust,/input: &\x27a str/u);assert.equal(result.typescript,value);}
 const value=imports+'type Text=string;export function owned(input:ReturnType<typeof repeat>):Text{return input;}';assert.match(translateHttpResourceCallerTypeScript(value,input(value)).rust,/input: String\) -> String/u);
});
test('aliases cannot hide recursive generic unused unsupported ownership or numeric obligations',limits,()=>{
 for(const body of [
  'type T=T;export function bad(){return null;}',
  'type A=B;type B=A;export function bad(){return null;}',
  'type T<X extends unknown>=X;export function bad(){return null;}',
  'type T=number;export function bad(){return null;}',
  'type T=boolean;type T=string;export function bad(){return null;}',
  'type Awaited=boolean;export function bad(){return null;}',
  'type T=bigint;export function bad(value:T){return value;}',
  'type T=Parameters<typeof copy>[0];export function bad(value:T){return withField(value,\'x\',nil());}',
  'type T=ReturnType<typeof copy>;export function bad(value:T){const first=withField(value,\'x\',nil());return withField(value,\'y\',nil());}',
  'type T=boolean;export function bad():T{return 0n;}',
 ]){const value=imports+body;assert.throws(()=>translateHttpResourceCallerTypeScript(value,input(value)),body);}
 const value=imports+'type T=bigint;export function guarded(value:T):T{if(typeof value!=="bigint"||value<0n||value>18446744073709551615n){throw new RangeError("Control u64 input outside native range");}return value;}';assert.match(translateHttpResourceCallerTypeScript(value,input(value)).rust,/value: u64/u);
 const result=translateHttpResourceCallerTypeScript(source,input(source)),meta=JSON.parse(result.meta);meta.functions.find(row=>row.name==='owned').parameters[0].type='json-ref';assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),source,input(source),{language:'TypeScript'}));
});
test('complete alias source copies retain both rule sequences and every original inverse',limits,()=>{
 const plan=prepareHttpResourceTypeAliasSources();assert.equal(plan.files.length,8);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.sourceAuthority,false);assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});

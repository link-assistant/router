// Independent primitive display reverse/source synchronization SOURCE. UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceOptionCallbackReceivingData} from './http-resource-option-callback-receiving-data.mjs';
import {verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareReversePrimitiveDisplaySources} from '../../prepare-reverse-primitive-display-sources.mjs';
const limits={timeout:60000},unsigned=name=>'if(typeof '+name+'!=="bigint"||'+name+'<0n||'+name+'>18446744073709551615n){throw new RangeError("Control u64 input outside native range");}',signed=name=>'if(typeof '+name+'!=="bigint"||'+name+'< -9223372036854775808n||'+name+'>9223372036854775807n){throw new RangeError("Resource i64 input outside native range");}';
const imports=`import {router_integer_u64_saturating_add as add,router_integer_i64_saturating_add as signedAdd} from './runtime/integer-runtime.mjs';
import {router_text_to_owned as copy} from './runtime/text-runtime.mjs';
import {router_option_callback_u64_to_text_owned_map as map} from './runtime/primitive-option-callback-runtime.mjs';
`;
const source=imports+`export function unsigned(value:bigint){${unsigned('value')}return String(value);}
export function method(value:bigint){${unsigned('value')}return value.toString();}
export function signed(value:ReturnType<typeof signedAdd>){${signed('value')}return String(value);}
export function boolean(value:boolean){return String(value);}
export function borrowed(value:string){return value.toString();}
export function owning(value:ReturnType<typeof copy>){const shown=String(value);return value;}
export function observeTwice(value:ReturnType<typeof copy>){const first=String(value);return String(value);}
export function computed(value:bigint){${unsigned('value')}return String(add(value,2n));}
export function mapped(value:Parameters<typeof map>[0]){return map(value,item=>String(item));}
`;
function input(value=source,sourcePath='caller.mts'){return {sourcePath,...httpResourceOptionCallbackReceivingData([{path:sourcePath,source:value}])};}
test('actual primitive global/method display calls receive JS strict TS and fresh canonical native inverses',limits,async()=>{
 const result=translateHttpResourceCallerTypeScript(source,input()),javascript=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs'));assert.ok(sameRustSourceSyntax(result.rust,javascript.rust));assert.ok(result.rust.includes('crate::translation_core::format!("{}", value)'));assert.equal(result.typescript,source);const rows=JSON.parse(result.meta).functions;assert.equal(rows.find(row=>row.name==='unsigned').flow.tail.value.kind,'primitive-display');assert.equal(rows.find(row=>row.name==='owning').flow.steps[0].value.type,'text-owned');assert.equal(rows.find(row=>row.name==='owning').returns,'text-owned');for(const equation of result.targetSourceEquations)assert.equal(equation.inverse,source);
 await verifyHttpResourceTargets(result,async api=>{assert.equal(api.unsigned(0n),'0');assert.equal(api.unsigned(18446744073709551615n),'18446744073709551615');assert.equal(api.method(3n),'3');assert.equal(api.signed(-9223372036854775808n),'-9223372036854775808');assert.equal(api.signed(9223372036854775807n),'9223372036854775807');assert.equal(api.boolean(false),'false');assert.equal(api.boolean(true),'true');assert.equal(api.borrowed('é😀'),'é😀');assert.equal(api.owning('é😀'),'é😀');assert.equal(api.observeTwice('é😀'),'é😀');assert.equal(api.computed(18446744073709551615n),'18446744073709551615');assert.deepEqual(api.mapped({$:'Some',field0:0n}),{$:'Some',field0:'0'});assert.deepEqual(api.mapped({$:'None'}),{$:'None'});for(const value of [-1n,18446744073709551616n,0])assert.throws(()=>api.unsigned(value),/Control u64 input outside native range/u);});
 const inverse=translateHttpResourceCallerRust(result.rust,{...input(result.rust,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(inverse.rust,result.rust));assert.equal(inverse.httpResourceRustSourceHistory.equation.inverse,result.rust);assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
});
test('complete native primitive formatting source reproduces typed positive/negative literal and borrowed values',limits,()=>{
 for(const native of ['pub fn unsigned(value: u64) -> String { crate::translation_core::format!("{}", value) }
','pub fn signed(value: i64) -> String { crate::translation_core::format!("{}", value) }
','pub fn positive() -> String { crate::translation_core::format!("{}", 1_i64) }
','pub fn negative() -> String { crate::translation_core::format!("{}", -9223372036854775808_i64) }
','pub fn text(value: &str) -> String { crate::translation_core::format!("{}", value) }
','pub fn boolean(value: bool) -> String { crate::translation_core::format!("{}", value) }
']){const result=translateHttpResourceCallerRust(native,{...input(native,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(native,result.rust),native);assert.ok(result.javascript.includes('String('));}
});
test('object coercion hooks wrong arity optional calls radix methods and shadowed global bindings retain refusals',limits,()=>{
 for(const body of ['export function bad(){return String({valueOf(){throw Error("hook");}});}','export function bad(){return String();}','export function bad(value:string){return String(value,value);}','export function bad(value:string){return value.toString(16);}','export function bad(value:string){return value?.toString();}','export function bad(value:string){return String?.(value);}','export function bad(String:string){return String("value");}','export function String(value:string){return value;}','export function bad(value:string){return globalThis.String(value);}','export function bad(){return String(null);}']){const value=imports+body;assert.throws(()=>translateHttpResourceCallerTypeScript(value,input(value)),body);}
 for(const native of ['pub fn bad(value: u64) -> String { crate::translation_core::format!("{:x}", value) }','pub fn bad(value: u64) -> String { crate::translation_core::format!("{} {}", value, value) }'])assert.throws(()=>translateHttpResourceCallerRust(native,{...input(native,'src/caller.rs'),javascriptPath:'caller.mjs'}));
});
test('source-bound display metadata cannot be replayed with changed source or a forged argument type',limits,()=>{
 const result=translateHttpResourceCallerTypeScript(source,input()),meta=JSON.parse(result.meta);meta.functions.find(row=>row.name==='unsigned').flow.tail.value.value.type='str';assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),source,input(),{language:'TypeScript'}));assert.throws(()=>readHttpResourceCallerMeta(result.meta,source.replace('String(value)','String(add(value,2n))'),input(),{language:'TypeScript'}));const changed=input();changed.files=changed.files.map(row=>row.path==='src/translation_core.rs'?{...row,source:row.source+'//changed'}:row);assert.throws(()=>translateHttpResourceCallerTypeScript(source,changed));
});
test('five complete source equations retain original source functions both phases exact inverses and no receiving claim',limits,()=>{
 const plan=prepareReversePrimitiveDisplaySources();assert.equal(plan.files.length,5);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});

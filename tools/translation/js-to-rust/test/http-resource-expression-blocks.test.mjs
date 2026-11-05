// Independent actual source expression/IIFE rules SOURCE. All cases UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerTypeScript,translateHttpResourceCallerJavaScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareSourceExpressionBlockSources} from '../../prepare-source-expression-block-sources.mjs';
const limits={timeout:60000},guard='if(typeof value!=="bigint"||value<0n||value>18446744073709551615n){throw new RangeError("Control u64 input outside native range");}',imports=`import {router_integer_u64_saturating_add as add,router_integer_i8_saturating_add as narrow} from './runtime/integer-runtime.mjs';
`;
const source=imports+`export function numeric(value:bigint){${guard}const result=(()=>{const selected=value;return String(selected);})();return result;}
export function textual(value:string){const result=(()=>{const selected=value;return String(selected);})();return result;}
export function early(value:bigint,flag:boolean){${guard}return (()=>{if(flag){return String(value);}else{return String(add(value,2n));}})();}
export function localMutation(value:bigint){${guard}return (()=>{let current=add(value,1n);current=add(current,2n);return String(current);})();}
export function nested(value:bigint){${guard}return (()=>{const selected=(()=>String(value))();return String(selected);})();}
export function narrowLiteral(){return (():ReturnType<typeof narrow>=>{return -1n;})();}
export function annotated(value:string){return (():string=>{return String(value);})();}
export function directOwned(value:string){return (()=>String(value))();}
`;
const input=(value=source,sourcePath='caller.mts')=>({sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])});
test('eight actual source block callers receive JS strict TS read-only capture checks and complete native closure inverses',limits,async()=>{
 const result=translateHttpResourceCallerTypeScript(source,input()),javascript=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs'));assert.ok(sameRustSourceSyntax(result.rust,javascript.rust));assert.equal(result.typescript,source);assert.ok(result.rust.includes('(|| -> String {'));assert.ok(result.rust.includes('(|| -> i8 {'));const row=JSON.parse(result.meta).functions.find(row=>row.name==='numeric');assert.equal(row.flow.steps[0].value.kind,'source-expression-block');assert.equal(row.flow.steps[0].value.flow.captures[0].name,'value');assert.equal(row.flow.steps[0].value.type,'text-owned');
 await verifyHttpResourceTargets(result,api=>{assert.equal(api.numeric(0n),'0');assert.equal(api.numeric(18446744073709551615n),'18446744073709551615');assert.equal(api.textual('é😀'),'é😀');assert.equal(api.early(3n,true),'3');assert.equal(api.early(3n,false),'5');assert.equal(api.localMutation(0n),'3');assert.equal(api.localMutation(18446744073709551615n),'18446744073709551615');assert.equal(api.nested(3n),'3');assert.equal(api.narrowLiteral(),-1n);assert.equal(api.annotated('é😀'),'é😀');assert.equal(api.directOwned('é😀'),'é😀');});
 const inverse=translateHttpResourceCallerRust(result.rust,{...input(result.rust,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(inverse.rust,result.rust));assert.equal(inverse.httpResourceRustSourceHistory.equation.inverse,result.rust);assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
});
test('canonical original source closures keep explicit return domains and their complete fresh native inverse',limits,()=>{
 for(const native of ['pub fn numeric(value: u64) -> String { (|| -> String { let selected = value; crate::translation_core::format!("{}", selected) })() }
','pub fn textual(value: &str) -> String { (|| -> String { let selected = value; crate::translation_core::format!("{}", selected) })() }
','pub fn narrow() -> i8 { (|| -> i8 { -1_i8 })() }
']){const result=translateHttpResourceCallerRust(native,{...input(native,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(native,result.rust),native);}
});
test('async argument-taking optional or mutable-capture invocations and escaping loans retain refusals',limits,()=>{
 for(const body of ['export function bad(value:string){return (async()=>{return String(value);})();}','export function bad(value:string){return ((argument:string)=>{return String(argument);})(value);}','export function bad(value:string){return (()=>{return String(value);})?.();}','export function bad(value:bigint){'+guard+'let current=value;return (()=>{current=add(current,1n);return String(current);})();}','export function bad(value:string){return (()=>{return value;})();}','export function bad(value:string){return (()=>{const hidden=value;})();}','export function bad(value:string){return (():boolean=>{return String(value);})();}']){const value=imports+body;assert.throws(()=>translateHttpResourceCallerTypeScript(value,input(value)),body);}
});
test('nested source block metadata is not an authority token for a changed return or original caller',limits,()=>{
 const result=translateHttpResourceCallerTypeScript(source,input()),meta=JSON.parse(result.meta);meta.functions.find(row=>row.name==='numeric').flow.steps[0].value.flow.type='u64';assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),source,input(),{language:'TypeScript'}));const changed=source.replace('const selected=value;','const selected=add(value,1n);');assert.throws(()=>readHttpResourceCallerMeta(result.meta,changed,input(),{language:'TypeScript'}));
});
test('seven complete source equations retain all original compiler classes functions ordered rules and full source inverses',limits,()=>{
 const plan=prepareSourceExpressionBlockSources();assert.equal(plan.files.length,7);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});

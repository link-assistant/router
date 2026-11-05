// Independent actual text concatenation source rules SOURCE. All cases UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerTypeScript,translateHttpResourceCallerJavaScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareSourceTextConcatSources} from '../../prepare-source-text-concat-sources.mjs';
const limits={timeout:60000},guard='if(typeof value!=="bigint"||value<0n||value>18446744073709551615n){throw new RangeError("Control u64 input outside native range");}',imports=`import {router_text_to_owned as copy} from './runtime/text-runtime.mjs';
import {router_integer_i8_saturating_add as narrow} from './runtime/integer-runtime.mjs';
`;
const source=imports+`export function joined(left:string,right:string){return left+right;}
export function primitive(value:bigint,flag:boolean){${guard}return String(value)+String(flag);}
export function chained(value:bigint,label:string){${guard}return "prefix:"+String(value)+":"+label;}
export function scoped(left:string,right:string){const result=(()=>{const selected=left+right;return selected;})();return result;}
export function reuse(value:ReturnType<typeof copy>,suffix:string){const result=value+suffix;return value;}
export function copied(value:ReturnType<typeof copy>,suffix:string){return value+suffix;}
export function conditional(flag:boolean){return (flag?"é":"Ω")+"😀";}
export function empty(){return ""+"";}
`;
const input=(value=source,sourcePath='caller.mts')=>({sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])});
test('eight actual text concatenation callers preserve owned results scalar conversions and paired native inverses',limits,async()=>{
 const result=translateHttpResourceCallerTypeScript(source,input()),javascript=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs'));assert.equal(result.typescript,source);assert.ok(sameRustSourceSyntax(result.rust,javascript.rust));const rows=JSON.parse(result.meta).functions;assert.equal(rows.find(row=>row.name==='joined').flow.tail.value.kind,'source-text-concat');assert.equal(rows.find(row=>row.name==='joined').returns,'text-owned');assert.ok(result.rust.includes('crate::translation_core::format!("{}{}", value, flag)'));
 await verifyHttpResourceTargets(result,api=>{assert.equal(api.joined('é','😀'),'é😀');assert.equal(api.primitive(18446744073709551615n,false),'18446744073709551615false');assert.equal(api.chained(0n,'Ω😀'),'prefix:0:Ω😀');assert.equal(api.scoped('é','😀'),'é😀');assert.equal(api.reuse('é😀','tail'),'é😀');assert.equal(api.copied('é😀','tail'),'é😀tail');assert.equal(api.conditional(true),'é😀');assert.equal(api.conditional(false),'Ω😀');assert.equal(api.empty(),'');});
 const inverse=translateHttpResourceCallerRust(result.rust,{...input(result.rust,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(inverse.rust,result.rust));assert.equal(inverse.httpResourceRustSourceHistory.equation.inverse,result.rust);assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
});
test('canonical two-slot native formatting retains actual primitive and signed literal domains through complete source reproduction',limits,()=>{
 for(const native of ['pub fn joined(left: &str, right: &str) -> String { crate::translation_core::format!("{}{}", left, right) }
','pub fn primitive(value: u64, flag: bool) -> String { crate::translation_core::format!("{}{}", value, flag) }
','pub fn narrow() -> String { crate::translation_core::format!("{}{}", -128_i8, "é😀") }
']){const result=translateHttpResourceCallerRust(native,{...input(native,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(native,result.rust),native);assert.ok(result.javascript.includes('String('));}
});
test('mixed coercions numeric addition object hooks arbitrary templates and wrong native slot counts retain refusals',limits,()=>{
 for(const body of ['export function bad(){return "value"+1n;}','export function bad(){return 1n+2n;}','export function bad(value:string){return value+{toString(){throw Error("hook");}};}','export function bad(value:string){return value+null;}']){const value=imports+body;assert.throws(()=>translateHttpResourceCallerTypeScript(value,input(value)),body);}
 for(const native of ['pub fn bad(value: u64) -> String { crate::translation_core::format!("{}{}", value) }','pub fn bad(value: u64) -> String { crate::translation_core::format!("{:x}{}", value, value) }'])assert.throws(()=>translateHttpResourceCallerRust(native,{...input(native,'src/caller.rs'),javascriptPath:'caller.mjs'}));
});
test('actual source concatenation cannot be authorized by a forged semantic node or changed caller',limits,()=>{
 const result=translateHttpResourceCallerTypeScript(source,input()),meta=JSON.parse(result.meta);meta.functions.find(row=>row.name==='joined').flow.tail.value.right.type='u64';assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),source,input(),{language:'TypeScript'}));const changed=source.replace('return left+right;','return right+left;');assert.throws(()=>readHttpResourceCallerMeta(result.meta,changed,input(),{language:'TypeScript'}));
});
test('five complete source equations retain whole original compiler sources actual owners two phases and exact inverses',limits,()=>{
 const plan=prepareSourceTextConcatSources();assert.equal(plan.files.length,5);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});

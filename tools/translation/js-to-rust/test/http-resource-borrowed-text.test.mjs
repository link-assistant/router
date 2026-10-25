// Independent original-root lifetime regression SOURCE. All cases are unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData as httpDeadlineReceivingData} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceBorrowedSources} from '../../prepare-http-resource-borrowed-sources.mjs';
const limits={timeout:60000},imports="import {router_http_body_base64 as encoded} from './runtime/http-protocol-runtime.mjs';\nimport {router_core_json_copy as copy} from './runtime/json-update-runtime.mjs';\n";
function input(source,sourcePath='caller.mjs'){return {sourcePath,...httpDeadlineReceivingData([{path:sourcePath,source}])};}
const source=imports+`/** @param {Parameters<typeof encoded>[0]} value */
export function complete(value){return encoded(value);}
/** @param {Parameters<typeof encoded>[0]} value */
export function payload(value){const result=encoded(value);if(result.$==='Err'){return result;}return result;}
/** @param {Parameters<typeof encoded>[0]} left @param {Parameters<typeof encoded>[0]} right @param {boolean} choice */
export function selected(left,right,choice){if(choice){return encoded(left);}else{return encoded(right);}}
`;
test('actual immutable input roots survive checked meta and both target languages',limits,()=>{
 const result=translateHttpResourceCallerJavaScript(source,input(source)),meta=readHttpResourceCallerMeta(result.meta,source,input(source));assert.deepEqual(meta.functions.map(row=>row.flow.returnRoots),[['value'],['value'],['left','right']]);assert.match(result.rust,/complete<'a>\(value: &'a crate::translation_core::Json\)/u);assert.match(result.rust,/Result<&'a str, String>/u);assert.match(result.rust,/left: &'a crate::translation_core::Json, right: &'a crate::translation_core::Json/u);
 const typed=translateHttpResourceCallerTypeScript(result.typescript,input(result.typescript,'caller.mts'));assert.ok(sameRustSourceSyntax(result.rust,typed.rust));const changed=JSON.parse(result.meta);changed.functions[0].flow.returnRoots=['unrelated'];assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(changed),source,input(source)));assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
});
test('a local owned copy or mismatched borrowed source cannot supply an escaping input root',limits,()=>{
 for(const body of [
  "/** @param {Parameters<typeof encoded>[0]} value */ export function bad(value){const local=copy(value);return encoded(local);}",
  "/** @param {Parameters<typeof encoded>[0]} value */ export function bad(value){const alias=value;return encoded(alias);}",
  "/** @param {Parameters<typeof encoded>[0]} value */ export function bad(value){const result=encoded(value);return result.field0;}",
 ]){const candidate=imports+body;assert.throws(()=>translateHttpResourceCallerJavaScript(candidate,input(candidate)),body);}
});
test('handwritten rooted native result reproduces the complete original lifetime syntax',limits,()=>{
 const native="pub fn encoded<'a>(value: &'a crate::translation_core::Json) -> Result<&'a str, String> { crate::translation_http_protocol_core::http_body_base64(value) }\n",data=input(native,'src/caller.rs'),result=translateHttpResourceCallerRust(native,{...data,javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(native,result.rust));assert.deepEqual(JSON.parse(result.meta).functions[0].flow.returnRoots,['value']);
 for(const next of [native.replace("&'a crate::translation_core::Json","&crate::translation_core::Json"),native.replace("Result<&'a str","Result<&'static str")])assert.throws(()=>translateHttpResourceCallerRust(next,{...input(next,'src/caller.rs'),javascriptPath:'caller.mjs'}));
});
test('full source history retains originals and both ordered source rules',limits,()=>{
 const plan=prepareHttpResourceBorrowedSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});

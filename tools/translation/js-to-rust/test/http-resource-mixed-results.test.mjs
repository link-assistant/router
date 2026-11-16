// Independent complete mixed-error caller SOURCE. All cases unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
const limits={timeout:60000},imports=`import {router_http_deadline_send as send,router_http_deadline_open as open} from './runtime/http-deadline-runtime.mjs';
import {router_http_deadline_flatten_send as flattened,router_http_deadline_flatten_open as flattenedOpen} from './runtime/http-deadline-result-runtime.mjs';
import {router_http_transport_close as close} from './runtime/http-transport-runtime.mjs';
import {router_http_body_text as text} from './runtime/http-protocol-runtime.mjs';
import {deferFilesystemFlow as defer} from './runtime/extensions/filesystem-effects-runtime.mjs';
`;
const body=`/** @param {Parameters<typeof send>[1]} client @param {Parameters<typeof send>[2]} value @param {Parameters<typeof send>[3]} token */
export function decoded(client,value,token){return defer(async()=>{const result=flattened(await send(0n,client,value,token));if(result.$==='Err'){return result;}const response=result.field0;return text(response);});}
/** @param {Parameters<typeof send>[1]} client @param {Parameters<typeof send>[2]} value @param {Parameters<typeof send>[3]} token */
export function moved(client,value,token){return defer(async()=>{const nested=await send(0n,client,value,token);return flattened(nested);});}
/** @param {Parameters<typeof open>[1]} client @param {Parameters<typeof open>[2]} value @param {Parameters<typeof open>[3]} token */
export function stream(client,value,token){return defer(async()=>{const nested=await open(0n,client,value,token);return flattenedOpen(nested);});}
`;
function input(source,sourcePath='caller.mjs'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source}])};}
test('explicit by-value adapter joins transport errors without flattening the original deadline API',limits,async()=>{
 const source=imports+body,result=translateHttpResourceCallerJavaScript(source,input(source));assert.match(result.rust,/flatten_send\(crate::translation_http_deadline_core::send/u);assert.match(result.rust,/Result<crate::translation_core::Json, String>/u);assert.ok(JSON.parse(result.meta).functions.every(row=>row.returns.startsWith('http-result:')));const typed=translateHttpResourceCallerTypeScript(result.typescript,input(result.typescript,'caller.mts'));assert.ok(sameRustSourceSyntax(result.rust,typed.rust));assert.equal(result.runtimeParity,false);assert.equal(result.rustExecuted,false);
 await verifyHttpResourceTargets(result,async(api,{transport,control})=>{const created=transport.router_http_transport_client_new(0n,0n,0n,'');assert.equal(created.$,'Ok');try{const token=control.router_cancel_new();for(const operation of [api.decoded,api.moved,api.stream])assert.deepEqual(await operation(created.field0,{$:'Null'},token),{$:'Err',field0:'HTTP operation timed out'});}finally{transport.router_http_transport_client_dispose(created.field0);}});
});
test('complete native adapter composition reproduces the original nested call and by-value result',limits,()=>{
 const native='pub async fn sent(client: &crate::translation_http_transport_core::Client, value: &crate::translation_core::Json, token: &crate::translation_async_control_core::Cancellation) -> Result<crate::translation_core::Json, String> { crate::translation_http_deadline_results_core::flatten_send(crate::translation_http_deadline_core::send(0_u64, client, value, token).await) }\n',result=translateHttpResourceCallerRust(native,{...input(native,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(native,result.rust));
});
test('duplicate nested Result moves missing stream release and absent actual adapter sources refuse',limits,()=>{
 for(const replacement of [
  'const nested=await open(0n,client,value,token);const first=flattenedOpen(nested);return flattenedOpen(nested);',
  "const nested=await open(0n,client,value,token);const first=flattenedOpen(nested);if(first.$==='Err'){return first;}const stream=first.field0;return text(value);",
 ]){const source=imports+'/** @param {Parameters<typeof open>[1]} client @param {Parameters<typeof open>[2]} value @param {Parameters<typeof open>[3]} token */ export function bad(client,value,token){return defer(async()=>{'+replacement+'});}';assert.throws(()=>translateHttpResourceCallerJavaScript(source,input(source)));}
 const source=imports+body,data=input(source);data.files=data.files.filter(row=>row.path!=='src/translation_http_deadline_results_core.rs');assert.throws(()=>translateHttpResourceCallerJavaScript(source,data));
});

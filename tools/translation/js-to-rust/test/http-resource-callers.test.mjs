// Independent complete caller regression SOURCE. Unrun during bulk drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,translateHttpResourceCallerConcreteSyntaxMeta,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpDeadlineReceivingData} from './http-deadline-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareReverseConcreteSource} from '../concrete-source.mjs';
import {prepareHttpResourceCallerSources} from '../../prepare-http-resource-caller-sources.mjs';
import {prepareHttpResourceInverseSources} from '../../prepare-http-resource-inverse-sources.mjs';
const limits={timeout:60000},root=fileURLToPath(new URL('../../../../',import.meta.url));
const imports=`import {router_http_transport_client_new as create,router_http_transport_client_clone as clone,router_http_transport_client_dispose as dispose,router_http_transport_open as open,router_http_transport_head as head,router_http_transport_read as read,router_http_transport_close as close,router_http_transport_send as send} from './runtime/http-transport-runtime.mjs';
import {router_http_request as request,router_http_body_text as text,router_http_body_base64 as encoded} from './runtime/http-protocol-runtime.mjs';
import {router_http_deadline_send as timedSend} from './runtime/http-deadline-runtime.mjs';
import {router_cancel_new as cancel,router_async_sleep as sleep} from './runtime/async-control-runtime.mjs';
import {json_macro_array as array} from './runtime/json-macro-runtime.mjs';
import {deferFilesystemFlow as defer} from './runtime/extensions/filesystem-effects-runtime.mjs';
`;
const body=`/** @param {string} url */
export function response(url){return defer(async()=>{
 const headers=array([]);const query=request('GET',url,headers,'');if(query.$==='Err'){return query;}
 const value=query.field0;const created=create(1000n,0n,1000n,'loopback');if(created.$==='Err'){return created;}
 const client=created.field0;const token=cancel();const result=await send(client,value,token);if(result.$==='Err'){dispose(client);return result;}
 dispose(client);return result;
});}
/** @param {Parameters<typeof open>[0]} client @param {Parameters<typeof open>[1]} value @param {Parameters<typeof open>[2]} token */
export function opened(client,value,token){return open(client,value,token);}
/** @param {Parameters<typeof read>[0]} stream @param {Parameters<typeof read>[1]} token */
export function next(stream,token){return read(stream,token);}
/** @param {Parameters<typeof timedSend>[1]} client @param {Parameters<typeof timedSend>[2]} value @param {Parameters<typeof timedSend>[3]} token */
export function timed(client,value,token){return timedSend(0n,client,value,token);}
/** @param {Parameters<typeof text>[0]} value */
export function decoded(value){return text(value);}
`;
const source=imports+body;
function input(caller=source,sourcePath='caller.mjs'){
 const data=httpDeadlineReceivingData([{path:sourcePath,source:caller}]);return {sourcePath,...data};
}
const translate=caller=>translateHttpResourceCallerJavaScript(caller,input(caller));
test('actual HTTP caller performs a loopback request under JS and independent strict TypeScript',limits,async t=>{
 const server=createServer((_request,response)=>response.end('é😀'));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));const url='http://127.0.0.1:'+server.address().port;
 const result=translate(source),directory=mkdtempSync(join(tmpdir(),'router-http-callers-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const data=input();
 const write=(path,text)=>{mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),text);};for(const row of data.files.filter(row=>/\.(mjs|mts|ts)$/u.test(row.path)))write(row.path,row.source);write('caller.mjs',result.javascript);write('typed.mts',result.typescript);
 execFileSync(process.execPath,[join(root,'js/node_modules/typescript/bin/tsc'),'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(directory,'out'),join(directory,'typed.mts')],{cwd:root,stdio:'pipe',timeout:20000});for(const row of data.files.filter(row=>row.path.startsWith('runtime/')))write('out/'+row.path,row.source);
 for(const path of ['caller.mjs','out/typed.mjs']){
  const api=await import(pathToFileURL(join(directory,path))),returned=await api.response(url);assert.equal(returned.$,'Ok');assert.deepEqual(api.decoded(returned.field0),{$:'Ok',field0:'é😀'});assert.equal((await api.response('invalid URL')).$,'Err');
 }
 assert.match(result.rust,/let mut client/u);assert.match(result.rust,/translation_http_transport_core::client_dispose\(&mut client\)/u);assert.match(result.rust,/Err\(__ro_http_error\)/u);assert.equal(result.rustExecuted,false);assert.equal(result.nativeRustGrammarChecked,false);assert.equal(result.receivingExecuted,false);assert.equal(result.crossInvocationCache,false);
});
test('full current JS TS CST and semantic source joins remain mandatory',limits,()=>{
 const result=translate(source),typed=translateHttpResourceCallerTypeScript(result.typescript,input(result.typescript,'caller.mts'));assert.ok(sameRustSourceSyntax(result.rust,typed.rust));assert.equal(readHttpResourceCallerMeta(result.meta,source,input()).functions.length,5);
 const concrete=prepareReverseConcreteSource(source);assert.equal(translateHttpResourceCallerConcreteSyntaxMeta(concrete.concreteSyntax.meta,input()).rust,result.rust);assert.throws(()=>readHttpResourceCallerMeta(result.meta,source+'\n',input()));assert.throws(()=>translateHttpResourceCallerJavaScript(source,{...input(),proof:{}}));
 for(const path of ['src/lib.rs','src/translation_http_deadline_core.rs','src/translation_http_transport_core.rs','src/translation_http_protocol_core.rs','runtime/http-deadline-runtime.mjs','runtime/http-transport-runtime.d.mts']){const data=input();data.files.find(row=>row.path===path).source+='\n// changed\n';assert.throws(()=>translateHttpResourceCallerJavaScript(source,data),path);}
 const changed=source.replace("'./runtime/http-transport-runtime.mjs'","'./runtime/http-deadline-runtime.mjs'");assert.throws(()=>translate(changed));
});
test('leaks moves missing cleanup mixed errors borrowed escapes and pending futures refuse',limits,()=>{
 for(const body of [
  "export function bad(){const result=create(0n,0n,0n,'');if(result.$==='Err'){return result;}const client=result.field0;return cancel();}",
  "export function bad(){const result=create(0n,0n,0n,'');if(result.$==='Err'){return result;}const client=result.field0;const first=client;dispose(first);return clone(client);}",
  "export function bad(){const result=create(0n,0n,0n,'');if(result.$==='Err'){return result;}const client=result.field0;const next=clone(client);if(next.$==='Err'){return next;}dispose(client);return next;}",
  "/** @param {Parameters<typeof encoded>[0]} value */ export function bad(value){return encoded(value);}",
  "/** @param {Parameters<typeof open>[0]} client @param {Parameters<typeof open>[1]} value @param {Parameters<typeof open>[2]} token */ export function bad(client,value,token){return defer(async()=>{const pending=open(client,value,token);return pending;});}",
  "/** @param {Parameters<typeof open>[0]} client @param {Parameters<typeof open>[1]} value @param {Parameters<typeof open>[2]} token */ export function bad(client,value,token){return defer(async()=>{const ready=await sleep(0n,token);if(ready.$==='Err'){return ready;}return await send(client,value,token);});}",
  "/** @param {Parameters<typeof read>[0]} stream */ export function bad(stream){close(stream);return head(stream);}",
  "/** @param {Parameters<typeof open>[0]} client */ export function bad(client){return client;}",
  "export function bad(){const result=create(0n,0n,0n,'');const client=result.field0;dispose(client);return null;}",
 ])assert.throws(()=>translate(imports+body),body);
});
test('handwritten canonical native source rechecks complete caller flow and reproduces every token',limits,()=>{
 const native=`pub fn made() -> Result<crate::translation_http_transport_core::Client, String> { crate::translation_http_transport_core::client_new(0_u64, 0_u64, 0_u64, "") }
pub async fn sent(client: &crate::translation_http_transport_core::Client, value: &crate::translation_core::Json, token: &crate::translation_async_control_core::Cancellation) -> Result<crate::translation_core::Json, String> { crate::translation_http_transport_core::send(client, value, token).await }
pub fn empty() -> crate::translation_core::Json { crate::translation_core::json!([]) }
pub fn copied(value: &crate::translation_core::Json) -> crate::translation_core::Json { crate::translation_core::json_copy(value) }
`;
 const data=input(native,'src/caller.rs'),result=translateHttpResourceCallerRust(native,{...data,javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(result.rust,native));assert.equal(result.httpResourceRustSourceHistory.source,native);assert.equal(result.httpResourceRustSourceHistory.equation.inverse,native);
 for(const next of [native.replace('client, value, token','value, client, token'),native.replace('translation_http_transport_core::send','translation_http_transport_core::unregistered'),native.replace('pub fn empty()', '#[unknown] pub fn empty()')])assert.throws(()=>translateHttpResourceCallerRust(next,{...input(next,'src/caller.rs'),javascriptPath:'caller.mjs'}));
});
test('full original adapter and reader substitutions preserve complete inverses and both sequences',limits,()=>{
 for(const [prepare,count]of [[prepareHttpResourceCallerSources,4],[prepareHttpResourceInverseSources,4]]){const plan=prepare();assert.equal(plan.files.length,count);assert.equal(plan.receivingExecuted,false);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}}
});

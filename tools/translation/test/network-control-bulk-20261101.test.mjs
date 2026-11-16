// Independent whole HTTP/barrel/cancellation/stream cleanup case SOURCE. UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {translateNetworkControlBulkJavaScript,translateNetworkControlBulkTypeScript} from '../network-control-bulk-20261101.mjs';
import {translateHttpResourceCallerJavaScript} from '../js-to-rust/http-resource-callers.mjs';
import {networkControlReceivingInput,verifyNetworkControlTargets,requireNetworkControlCompilerVersion} from './network-control-bulk-20261101-fixture.mjs';
import {withSourceFailureOperation} from '../source-failure-operations.mjs';
import {accountPrimitiveVectorIteratorBulkData as accountCompleteData} from '../primitive-vector-iterator-bulk-20261101-accounting.mjs';
const limits={timeout:60000};
const barrels=[
 {path:'api/transport.mjs',source:`export {router_http_transport_client_new as makeClient,router_http_transport_client_dispose as disposeClient,router_http_transport_send as sendRequest,router_http_transport_open as openRequest,router_http_transport_read as nextChunk,router_http_transport_close as closeStream} from '../runtime/http-transport-runtime.mjs';\n`},
 {path:'network.mjs',source:`export {makeClient,disposeClient,sendRequest,openRequest,nextChunk,closeStream} from './api/transport.mjs';
export {router_http_request as makeRequest,router_http_body_text as bodyText} from './runtime/http-protocol-runtime.mjs';
export {router_cancel_new as newToken} from './runtime/async-control-runtime.mjs';
export {json_macro_array as emptyArray} from './runtime/json-macro-runtime.mjs';
export {deferFilesystemFlow as cold} from './runtime/extensions/filesystem-effects-runtime.mjs';
export {router_http_deadline_send as deadlineSend} from './runtime/http-deadline-runtime.mjs';\n`},
];
const imports=`import {makeClient as create,disposeClient as dispose,sendRequest as send,openRequest as open,nextChunk as read,closeStream as close,makeRequest as request,bodyText as text,newToken as cancel,emptyArray as array,cold as defer,deadlineSend as timedSend} from './network.mjs';\n`;
const source=imports+`/** @param {string} url */
export function response(url){return defer(async()=>{
 const headers=array([]);const query=request('GET',url,headers,'');if(query.$==='Err'){return query;}
 const value=query.field0;const created=create(1000n,0n,1000n,'loopback');if(created.$==='Err'){return created;}
 const client=created.field0;const token=cancel();const result=await send(client,value,token);if(result.$==='Err'){dispose(client);return result;}
 dispose(client);return result;
});}
/** @param {Parameters<typeof open>[0]} client @param {Parameters<typeof open>[1]} value @param {Parameters<typeof open>[2]} token */
export function firstChunk(client,value,token){return defer(async()=>{
 const opened=await open(client,value,token);if(opened.$==='Err'){return opened;}
 const stream=opened.field0;const chunk=await read(stream,token);if(chunk.$==='Err'){close(stream);return chunk;}
 close(stream);return chunk;
});}
/** @param {Parameters<typeof text>[0]} value */
export function decoded(value){return text(value);}
/** @param {Parameters<typeof timedSend>[1]} client @param {Parameters<typeof timedSend>[2]} value @param {Parameters<typeof timedSend>[3]} token */
export function timed(client,value,token){return timedSend(0n,client,value,token);}
`;
function input(caller=source,sourcePath='caller.mjs',extra=barrels){const {data}=networkControlReceivingInput(sourcePath,caller);return {sourcePath,rustPath:'caller.rs',...data,files:data.files.concat(extra)};}
const translate=(caller=source,extra=barrels)=>translateNetworkControlBulkJavaScript(caller,input(caller,'caller.mjs',extra));
test('real formerly refused multi-hop imported caller enters original whole private HTTP checker',limits,()=>{
 const original=input();const {rustPath,...oldInput}=original;assert.throws(()=>translateHttpResourceCallerJavaScript(source,oldInput));
 const result=translate();assert.equal(result.projection.modules.length,2);assert.equal(result.equation.inverse,source);assert.equal(result.sources.original,source);
 assert.equal(result.reverse.httpResourceRustSourceHistory.equation.inverse,result.sources.Rust);
 assert.ok(result.projection.edits.every(row=>row.before.startsWith('import')));
 assert.deepEqual([...new Set(result.trace.map(row=>row.phase))],['language','repository']);
 for(const key of ['sourceAuthority','semanticAuthority','namespaceAuthority','runtimeParity','receivingExecuted','rustExecuted','crossInvocationCache','wholeRouterSynchronization'])assert.equal(result[key],false);
 // Typed original forwarding is independently checked with its own full source.
 const typed=result.sources.TypeScript.replace(result.projection.edits[0].after,imports.trimEnd());
 assert.notEqual(typed,result.sources.TypeScript);const paired=translateNetworkControlBulkTypeScript(typed,input(typed,'caller.mts'));assert.equal(paired.equation.inverse,typed);
});
test('paired and native-inverse targets preserve actual loopback buffered/streamed errors cancellation and deadlines',limits,async t=>{
 const server=createServer((_request,response)=>{response.writeHead(200,{'Content-Type':'text/plain'});response.end('é😀');});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));
 const url='http://127.0.0.1:'+server.address().port,result=translate(),receipts=[];
 for(const targets of [{javascript:source,typescript:result.sources.TypeScript},{javascript:result.sources.JavaScript,typescript:result.sources.TypeScript},result.reverse])await verifyNetworkControlTargets(targets,async(api,runtime)=>{
  const returned=await api.response(url);assert.equal(returned.$,'Ok');assert.deepEqual(api.decoded(returned.field0),{$:'Ok',field0:'é😀'});
  assert.equal((await api.response('invalid URL')).$,'Err');
  // Access the exact same materialized runtime namespace as the helper's token;
  // its additional HTTP modules are imported below by the receiving fixture.
  const client=runtime.transport.router_http_transport_client_new(1000n,0n,1000n,'loopback');assert.equal(client.$,'Ok');
  const token=runtime.control.router_cancel_new(),query=runtime.protocol.router_http_request('GET',url,runtime.json.json_macro_array([]),'');assert.equal(query.$,'Ok');
  assert.deepEqual(await api.timed(client.field0,query.field0,token),{$:'Err',field0:{$:'Timeout'}});
  const chunk=await api.firstChunk(client.field0,query.field0,token);assert.equal(chunk.$,'Ok');assert.equal(chunk.field0.$,'Some');const bytes=Buffer.from(chunk.field0.field0,'base64'),expected=Buffer.from('é😀');assert.ok(bytes.length>0);assert.deepEqual(bytes,expected.subarray(0,bytes.length));
  runtime.control.router_cancel_set(token);assert.deepEqual(await api.timed(client.field0,query.field0,token),{$:'Err',field0:{$:'Cancelled'}});
  assert.equal((await api.firstChunk(client.field0,query.field0,token)).$,'Err');runtime.transport.router_http_transport_client_dispose(client.field0);
 },{record:row=>receipts.push(row),extraFiles:barrels});
 assert.ok(receipts.every(row=>row.version==='5.9.3'&&row.passed));
});
test('barrel side effects star exports cycles missing values and duplicate owners do not become authority',limits,()=>{
 for(const changed of [
  barrels[1].source+'\nconsole.log("effect");',
  "export * from './api/transport.mjs';",
  "export {missing as makeClient} from './api/transport.mjs';",
  barrels[1].source+"\nexport {newToken} from './runtime/async-control-runtime.mjs';",
  "export {makeClient} from './cycle.mjs';",
 ])assert.throws(()=>translate(source,[barrels[0],{...barrels[1],source:changed},{path:'cycle.mjs',source:"export {makeClient} from './network.mjs';"}]));
});
test('binding expansion preserves all original ownership resource and source refusals',limits,()=>{
 for(const changed of [source.replace('close(stream);return chunk;','return chunk;'),source.replace('close(stream);return chunk;','close(stream);return opened;'),source.replace('await open(client,value,token)','open(client,value,token)'),source.replace('dispose(client);return result;','return result;')]){assert.notEqual(changed,source);assert.throws(()=>translate(changed));}
 for(const path of ['runtime/http-transport-runtime.mjs','runtime/http-transport-runtime.d.mts','src/translation_http_transport_core.rs']){const data=input();data.files.find(row=>row.path===path).source+='\n// stale\n';assert.throws(()=>translateNetworkControlBulkJavaScript(source,data));}
 assert.throws(()=>withSourceFailureOperation(()=>{try{translate(source,[{...barrels[0],source:'export const fabricated = 1;'},barrels[1]]);}catch{}return true;}),/invalidated.*source-input failure/u);
});

test('all unused terminal module loads retain lexical depth-first order and injected names avoid actual bindings',limits,()=>{
 const result=translate();assert.deepEqual(result.projection.terminals.map(row=>row.path),[
  'runtime/http-transport-runtime.mjs','runtime/http-protocol-runtime.mjs','runtime/async-control-runtime.mjs',
  'runtime/json-macro-runtime.mjs','runtime/extensions/filesystem-effects-runtime.mjs','runtime/http-deadline-runtime.mjs',
 ]);
 const changed=source+'\n/** @param {string} network_forwarded_dependency_0 */ export function echo(network_forwarded_dependency_0){return network_forwarded_dependency_0;}\n';
 const named=translate(changed);assert.ok(!named.projection.edits[0].after.includes(' as network_forwarded_dependency_0 '));
});
test('receiving compiler versions and original strict diagnostics remain explicit',limits,async()=>{
 assert.equal(requireNetworkControlCompilerVersion('Version 5.9.3\n'),'5.9.3');assert.throws(()=>requireNetworkControlCompilerVersion('Version 6.0.0\n'));
 const records=[];await assert.rejects(()=>verifyNetworkControlTargets({javascript:'export const value=1;',typescript:'export const value: number="wrong";'},()=>assert.fail('invalid target must not execute'),{record:row=>records.push(row)}));
 const failure=records.find(row=>row.stage==='strict-typescript');assert.equal(failure.version,'5.9.3');assert.equal(failure.passed,false);assert.ok((failure.stdout+failure.stderr).includes('TS2322'));
});

test('complete final DATA accounting counts all retained aliases and refuses UTF8 and repeated-path overflow',limits,()=>{
 const result=translate(),accounting=accountCompleteData(result);assert.ok(accounting.cells>0);assert.ok(accounting.utf16Units>0);assert.ok(accounting.utf8Bytes>=accounting.utf16Units);
 const nested={projection:result.projection,equation:result.equation,checked:result.checked,pairedJS:result.pairedJS,pairedTS:result.pairedTS,reverse:result.reverse,trace:result.trace};
 assert.ok(accountCompleteData(nested).cells>accountCompleteData(result.projection).cells);
 const text='é'.repeat(4500000);assert.throws(()=>accountCompleteData({first:text,second:text}),/UTF8/u);
 const child={source:'a'.repeat(1048576)};assert.throws(()=>accountCompleteData(Array(17).fill(child)),/UTF16/u);
});
test('dependency retention imports duplicate only actual exports under distinct checked local bindings',limits,()=>{
 const result=translate(),canonical=result.projection.canonical,data=input(canonical),{rustPath,...original}=data;
 const checked=translateHttpResourceCallerJavaScript(canonical,original);assert.equal(checked.rust,result.sources.Rust);
 assert.ok(canonical.includes('router_http_transport_client_new as network_forwarded_dependency_0'));
 assert.ok(canonical.includes('router_http_transport_client_new as create'));
 const forged=canonical.replace('router_http_transport_client_new as create','router_http_transport_client_new as network_forwarded_dependency_0');
 assert.notEqual(forged,canonical);const selected=input(forged),{rustPath:ignored,...invalid}=selected;assert.throws(()=>translateHttpResourceCallerJavaScript(forged,invalid),/competing/u);
});

// Independent Option loop/stream regression SOURCE. Every case is unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceOptionLoopSources} from '../../prepare-http-resource-option-loop-sources.mjs';
import {json_macro_array as array} from '../../json-macro-runtime.mjs';
import {router_http_request as request} from '../../http-protocol-runtime.mjs';
const limits={timeout:60000},imports=`import {router_text_find as find} from './runtime/text-runtime.mjs';
import {router_integer_u64_saturating_add as add} from './runtime/integer-runtime.mjs';
import {router_http_transport_read as read,router_http_transport_close as close} from './runtime/http-transport-runtime.mjs';
import {router_carrier_json_ok as ok} from './runtime/owned-outcome-runtime.mjs';
import {router_state_json_append as append} from './runtime/json-state-runtime.mjs';
import {json_macro_array as array,json_macro_string as text} from './runtime/json-macro-runtime.mjs';
import {deferFilesystemFlow as defer} from './runtime/extensions/filesystem-effects-runtime.mjs';
`;
const source=imports+`/** @param {string} input */ export function found(input){let count=0n;while(count<2n){count=add(count,1n);const value=find(input,'x');if(value.$==='None'){continue;}return value.field0;}return 0n;}
/** @param {string} input */ export function stopped(input){let count=0n;while(true){const value=find(input,'x');if(value.$==='None'){break;}count=add(count,1n);break;}return count;}
/** @param {Parameters<typeof read>[0]} stream @param {Parameters<typeof read>[1]} token */ export function chunks(stream,token){return defer(async()=>{let result=array([]);while(true){const received=await read(stream,token);if(received.$==='Err'){close(stream);return received;}const optional=received.field0;if(optional.$==='None'){break;}const chunk=optional.field0;result=append(result,text(chunk));}close(stream);return ok(result);});}
`;
function input(value,sourcePath='caller.mjs'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])};}
test('actual absent Option break and continue preserve nearest-loop source outcomes',limits,async()=>{
 const result=translateHttpResourceCallerJavaScript(source,input(source)),typed=translateHttpResourceCallerTypeScript(result.typescript,input(result.typescript,'caller.mts'));assert.ok(sameRustSourceSyntax(result.rust,typed.rust));assert.match(result.rust,/None => \{ continue;/u);assert.match(result.rust,/None => \{ break;/u);assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);await verifyHttpResourceTargets(result,async api=>{assert.equal(api.found('ax'),1n);assert.equal(api.found('absent'),0n);assert.equal(api.stopped('x'),1n);assert.equal(api.stopped('absent'),0n);});
});
test('actual streaming callers preserve binary chunks original order empty EOF and cleanup',limits,async t=>{
 const payload=Buffer.concat([Buffer.from('é😀'),Buffer.from([0,255,128]),Buffer.alloc(140000,65)]),server=createServer((request,response)=>response.end(request.url==='/empty'?Buffer.alloc(0):payload));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));const url='http://127.0.0.1:'+server.address().port,result=translateHttpResourceCallerJavaScript(source,input(source));await verifyHttpResourceTargets(result,async(api,{transport,control})=>{const created=transport.router_http_transport_client_new(1000n,1000n,1000n,'loopback');assert.equal(created.$,'Ok');try{for(const suffix of ['/body','/empty']){const requested=request('GET',url+suffix,array([]),'');assert.equal(requested.$,'Ok');const token=control.router_cancel_new(),opened=await transport.router_http_transport_open(created.field0,requested.field0,token);assert.equal(opened.$,'Ok');const value=await api.chunks(opened.field0,token);assert.equal(value.$,'Ok');assert.equal(value.field0.$,'Array');const encoded=value.field0.field0.map(row=>{assert.equal(row.$,'String');return Buffer.from(row.field0,'base64');});assert.deepEqual(Buffer.concat(encoded),suffix==='/empty'?Buffer.alloc(0):payload);assert.deepEqual(await transport.router_http_transport_read(opened.field0,token),{$:'Ok',field0:{$:'None'}});}}finally{transport.router_http_transport_client_dispose(created.field0);}});
});
test('whole canonical native nearest-loop Option arm reproduces every original token',limits,()=>{
 const native='pub fn stopped(input: &str) -> u64 { let mut count = 0_u64; while true { let value = match crate::translation_text_core::find(input, "x") { Some(__ro_http_some) => __ro_http_some, None => { break; } }; count = crate::translation_integer_core::u64_saturating_add(count, 1_u64); break; } count }\n',result=translateHttpResourceCallerRust(native,{...input(native,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(native,result.rust));
});
test('absence fallthrough missing loop labels and forged control flow remain refused',limits,()=>{
 for(const body of [
  '/** @param {string} input */ export function bad(input){const value=find(input,\'x\');if(value.$===\'None\'){break;}return value.field0;}',
  '/** @param {string} input @param {boolean} choice */ export function bad(input,choice){while(true){const value=find(input,\'x\');if(value.$===\'None\'){if(choice){break;}}return value.field0;}return 0n;}',
  '/** @param {string} input */ export function bad(input){label:while(true){const value=find(input,\'x\');if(value.$===\'None\'){break label;}return value.field0;}return 0n;}',
 ]){const value=imports+body;assert.throws(()=>translateHttpResourceCallerJavaScript(value,input(value)),body);}
 const result=translateHttpResourceCallerJavaScript(source,input(source)),meta=JSON.parse(result.meta);meta.functions.find(row=>row.name==='stopped').flow.steps.find(row=>row.kind==='while').body.steps[0].option.loop=false;assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),source,input(source)));
});
test('complete original flow native projection and parent source copies retain both inverses',limits,()=>{
 const plan=prepareHttpResourceOptionLoopSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});

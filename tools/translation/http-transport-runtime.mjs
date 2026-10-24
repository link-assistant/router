// Explicit guarded HTTP/1 pull transport. Native library internals stay native.
import * as http from 'node:http';
import * as https from 'node:https';
import {lookup} from 'node:dns';
import {Buffer} from 'node:buffer';
import {types} from 'node:util';
import {deferFilesystemFlow as defer} from './extensions/filesystem-effects-runtime.mjs';
import {router_cancel_is_set as cancelled,withAsyncCancellation as scoped} from './async-control-runtime.mjs';
import {router_text_len_utf8 as textLength} from './text-runtime.mjs';
import {router_http_request as requestValue,router_http_response as responseValue} from './http-protocol-runtime.mjs';
import {json_macro_value as copy,json_macro_array as array,json_macro_string as text} from './json-macro-runtime.mjs';
import {parseHttpNetworkPolicy,httpAddressAllowed,httpHostAllowed} from './http-network-policy-runtime.mjs';
const clients=new WeakMap(),streams=new WeakMap(),freeze=Object.freeze,ok=field0=>freeze({$:'Ok',field0}),err=field0=>freeze({$:'Err',field0}),none=()=>freeze({$:'None'}),some=field0=>freeze({$:'Some',field0});
const CANCELLED='HTTP cancelled',TIMEOUT='HTTP timeout',FAILED='HTTP request failed',BODY_FAILED='HTTP body read failed',RESOURCE='HTTP transport resource bound',CLOSED='HTTP client closed';
const FRAMING=new Set(['host','content-length','transfer-encoding','connection','upgrade','proxy-authorization','proxy-connection','expect']);
export const HTTP_TRANSPORT_LIMITS=freeze({clientsActive:32,chunkBytes:65536,pendingBytes:1048576,bufferedBodyBytes:786432,delayMs:86400000n});
function actual(map,value){if(!value||typeof value!=='object'||types.isProxy(value)||!map.has(value))throw new TypeError('Actual HTTP transport resource required');return map.get(value);}
function handle(map,state){const value=freeze(Object.create(null));map.set(value,state);return value;}
function delay(value){return typeof value==='bigint'&&value>=0n&&value<=HTTP_TRANSPORT_LIMITS.delayMs?Number(value):null;}
function collectPool(pool){if(!pool.refs&&!pool.active){pool.http.destroy();pool.https.destroy();}}
function release(state){if(!state.held)return;state.held=false;state.pool.active--;collectPool(state.pool);}
function terminate(state){if(state.response&&!state.response.readableEnded)state.response.destroy();state.response=null;state.pending=Buffer.alloc(0);release(state);}
function idleStream(value){const state=actual(streams,value);if(state.busy)throw new TypeError('Actual exclusive idle HTTP stream required');return state;}
export function router_http_transport_client_new(connectMs,idleMs,firstByteMs,allow){
 const connect=delay(connectMs),idle=delay(idleMs),first=delay(firstByteMs);if(connect===null||idle===null||first===null)return err('invalid HTTP timeout');textLength(allow);
 const policy=parseHttpNetworkPolicy(allow),pool={refs:1,active:0,http:new http.Agent({keepAlive:true,maxSockets:32,maxTotalSockets:32}),https:new https.Agent({keepAlive:true,maxSockets:32,maxTotalSockets:32})};
 return ok(handle(clients,{pool,policy,connect,idle,first,closed:false}));
}
export function router_http_transport_client_clone(value){const state=actual(clients,value);if(state.closed)return err(CLOSED);state.pool.refs++;return ok(handle(clients,{...state}));}
export function router_http_transport_client_dispose(value){const state=actual(clients,value);if(!state.closed){state.closed=true;state.pool.refs--;collectPool(state.pool);}return null;}
function requestFields(value){
 value=copy(value);if(value.$!=='Object'||value.field0.entries.length!==5)return err('invalid HTTP request');const fields=new Map(value.field0.entries.map(row=>[row.key,row.value]));if(fields.get('kind')?.$!=='String'||fields.get('kind').field0!=='request'||['method','url','body_base64'].some(key=>fields.get(key)?.$!=='String')||!fields.has('headers'))return err('invalid HTTP request');return requestValue(fields.get('method').field0,fields.get('url').field0,fields.get('headers'),fields.get('body_base64').field0);
}
function guardedLookup(policy){return (hostname,options,callback)=>{lookup(hostname,{all:true,verbatim:true},(fault,addresses)=>{if(fault){callback(fault);return;}const allowed=addresses.filter(row=>httpAddressAllowed(policy,row.address));if(!allowed.length){callback(Object.assign(Error('HTTP destination refused'),{code:'EACCES'}));return;}if(options?.all)callback(null,allowed);else callback(null,allowed[0].address,allowed[0].family);});};}
function responseHead(response){
 if(response.rawHeaders.length>256)return err('HTTP header count bound');const rows=[];for(let index=0;index<response.rawHeaders.length;index+=2)rows.push([response.rawHeaders[index].toLowerCase(),Buffer.from(response.rawHeaders[index+1],'latin1').toString('base64')]);rows.sort((left,right)=>left[0]<right[0]?-1:left[0]>right[0]?1:0);return responseValue(BigInt(response.statusCode),array(rows.map(([key,value])=>array([text(key),text(value)]))),'');
}
export function router_http_transport_open(value,request,cancellation){
 const client=actual(clients,value);cancelled(cancellation);return defer(async()=>{
  if(cancelled(cancellation))return err(CANCELLED);if(client.closed)return err(CLOSED);const checked=requestFields(request);if(checked.$==='Err')return checked;const fields=new Map(checked.field0.field0.entries.map(row=>[row.key,row.value])),url=new URL(fields.get('url').field0),method=fields.get('method').field0;
  if(!httpHostAllowed(client.policy,url.hostname))return err('HTTP destination refused');const headers=[],names=new Set();for(const pair of fields.get('headers').field0){const name=pair.field0[0].field0;if(FRAMING.has(name))return err('unsupported HTTP upgrade or framing');names.add(name);headers.push(name,Buffer.from(pair.field0[1].field0,'base64').toString('latin1'));}if(method.toUpperCase()==='CONNECT')return err('unsupported HTTP upgrade or framing');if(!names.has('accept'))headers.push('accept','*/*');const body=Buffer.from(fields.get('body_base64').field0,'base64');headers.push('content-length',String(body.length));if(client.pool.active>=32)return err(RESOURCE);client.pool.active++;
  const ownership={pool:client.pool,held:true};return scoped(cancellation,signal=>new Promise(resolve=>{
   let done=false,request,connectTimer,firstTimer;const clear=()=>{clearTimeout(connectTimer);clearTimeout(firstTimer);signal.removeEventListener('abort',abort);},finish=value=>{if(done)return;done=true;clear();resolve(value);},fail=message=>{if(done)return;request?.destroy();release(ownership);finish(err(message));},abort=()=>fail(CANCELLED);
   if(signal.aborted){fail(CANCELLED);return;}signal.addEventListener('abort',abort,{once:true});if(client.connect)connectTimer=setTimeout(()=>fail(TIMEOUT),client.connect);if(client.first)firstTimer=setTimeout(()=>fail(TIMEOUT),client.first);
   try{const transport=url.protocol==='https:'?https:http;request=transport.request(url,{method,headers,agent:url.protocol==='https:'?client.pool.https:client.pool.http,lookup:guardedLookup(client.policy),maxHeaderSize:65536,joinDuplicateHeaders:false},response=>{
    if(done){response.destroy();return;}request.setTimeout(0);if(response.statusCode===101){response.destroy();fail('unsupported HTTP upgrade or framing');return;}const head=responseHead(response);if(head.$==='Err'){response.destroy();fail(head.field0);return;}response.pause();const state={...ownership,response,head:head.field0,pending:Buffer.alloc(0),busy:false,idle:client.idle,fault:null};ownership.held=false;response.on('error',()=>{state.fault=BODY_FAILED;});response.on('aborted',()=>{state.fault=BODY_FAILED;});finish(ok(handle(streams,state)));
   });request.on('socket',socket=>{const connected=()=>{clearTimeout(connectTimer);if(client.idle)request.setTimeout(client.idle,()=>fail(TIMEOUT));};if(socket.connecting)socket.once(url.protocol==='https:'?'secureConnect':'connect',connected);else connected();});request.on('error',()=>fail(FAILED));request.on('upgrade',(_response,socket)=>{socket.destroy();fail('unsupported HTTP upgrade or framing');});request.on('connect',(_response,socket)=>{socket.destroy();fail('unsupported HTTP upgrade or framing');});request.end(body);}catch{fail(FAILED);}
  }));
 });
}
export function router_http_transport_head(value){return copy(idleStream(value).head);}
export function router_http_transport_close(value){terminate(idleStream(value));return null;}
function readChunk(state,signal){return new Promise(resolve=>{
 let done=false,timer;const clear=()=>{clearTimeout(timer);signal.removeEventListener('abort',abort);for(const event of ['readable','end','error','aborted','close'])state.response?.removeListener(event,ready);},finish=value=>{if(done)return;done=true;clear();resolve(value);},abort=()=>finish(err(CANCELLED)),ready=()=>{
  if(signal.aborted){abort();return;}if(state.fault){finish(err(state.fault));return;}const response=state.response;if(!response){finish(ok(none()));return;}let bytes;try{bytes=response.read();}catch{finish(err(BODY_FAILED));return;}if(bytes!==null){if(bytes.length>HTTP_TRANSPORT_LIMITS.pendingBytes){finish(err(RESOURCE));return;}state.pending=bytes.subarray(HTTP_TRANSPORT_LIMITS.chunkBytes);finish(ok(some(bytes.subarray(0,HTTP_TRANSPORT_LIMITS.chunkBytes).toString('base64'))));return;}if(response.readableEnded){finish(ok(none()));return;}if(response.destroyed&&!response.complete){finish(err(BODY_FAILED));return;}
 };
 if(signal.aborted){abort();return;}signal.addEventListener('abort',abort,{once:true});for(const event of ['readable','end','error','aborted','close'])state.response.on(event,ready);if(state.idle)timer=setTimeout(()=>finish(err(TIMEOUT)),state.idle);ready();
 });}
export function router_http_transport_read(value,cancellation){
 const state=actual(streams,value);cancelled(cancellation);return defer(async()=>{
  if(state.busy)throw new TypeError('Actual exclusive HTTP stream poll required');state.busy=true;try{
   if(cancelled(cancellation)){terminate(state);return err(CANCELLED);}if(state.pending.length){const bytes=state.pending.subarray(0,HTTP_TRANSPORT_LIMITS.chunkBytes);state.pending=state.pending.subarray(bytes.length);return ok(some(bytes.toString('base64')));}if(!state.response)return ok(none());const result=await scoped(cancellation,signal=>readChunk(state,signal));if(result.$==='Err'||result.field0.$==='None')terminate(state);return result;
  }finally{state.busy=false;}
 });
}
export function router_http_transport_send(value,request,cancellation){
 actual(clients,value);cancelled(cancellation);return defer(async()=>{const opened=await router_http_transport_open(value,request,cancellation);if(opened.$==='Err')return opened;const stream=opened.field0,parts=[];let length=0;
  try{for(;;){const next=await router_http_transport_read(stream,cancellation);if(next.$==='Err')return next;if(next.field0.$==='None')break;const bytes=Buffer.from(next.field0.field0,'base64');if(bytes.length>HTTP_TRANSPORT_LIMITS.bufferedBodyBytes-length)return err('HTTP body bound');parts.push(bytes);length+=bytes.length;}const fields=new Map(router_http_transport_head(stream).field0.entries.map(row=>[row.key,row.value]));return responseValue(fields.get('status').field0.field0,fields.get('headers'),Buffer.concat(parts,length).toString('base64'));}finally{router_http_transport_close(stream);}
 });
}

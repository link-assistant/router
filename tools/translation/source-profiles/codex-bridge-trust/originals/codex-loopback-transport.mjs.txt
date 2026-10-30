/** Bounded Codex backend HTTP/WebSocket transport, with one fixed Router upstream. */
import {createServer,request as httpRequest} from 'node:http';
import {request as httpsRequest} from 'node:https';
import {relayWebSocket} from './websocket-relay.mjs';
import {normalizeManagedOrigin} from './managed-server.mjs';
import {clientFailure} from './client-files.mjs';
export const CODEX_BRIDGE_BACKEND='/api/services/codex/backend-api';
const transport=new Set(['host','connection','proxy-connection','keep-alive','transfer-encoding','upgrade','te','trailer','content-length','accept-encoding','forwarded','x-forwarded-for','x-forwarded-host','x-forwarded-proto','x-real-ip','sec-websocket-key','sec-websocket-version','sec-websocket-extensions','sec-websocket-accept']);
const hop=new Set(['connection','proxy-connection','keep-alive','transfer-encoding','upgrade','te','trailer','content-length']);
const credentials=new Set(['authorization','proxy-authorization','set-cookie','set-cookie2','x-api-key','x-goog-api-key','anthropic-auth-token','cookie','chatgpt-account-id']);
export function codexLoopbackRequired(origin){const host=new URL(normalizeManagedOrigin(origin)).hostname.toLowerCase();return host!=='localhost'&&host!=='[::1]'&&!/^127\.\d+\.\d+\.\d+$/u.test(host);}
export function codexBridgeHeaders(input,response=false){
 const names=new Set(String(input.connection??'').split(',').map(value=>value.trim().toLowerCase())),headers={};for(const [key,value]of Object.entries(input)){const name=key.toLowerCase();if(value===undefined||names.has(name)||(response?hop.has(name)||credentials.has(name)||name.startsWith('x-router-')||name.startsWith('x-link-assistant-')||/^x-codex-(?:plan-type|active-limit|credits-balance)/u.test(name):transport.has(name)))continue;headers[name]=value;}return headers;
}
function target(origin,path){if(typeof path!=='string'||!path.startsWith(CODEX_BRIDGE_BACKEND+'/'))throw clientFailure('Codex bridge route is outside its backend namespace');const url=new URL(path,origin);if(url.origin!==origin||!url.pathname.startsWith(CODEX_BRIDGE_BACKEND+'/'))throw clientFailure('Codex bridge route escapes its backend namespace');return url;}
export async function startCodexLoopbackTransport({upstreamOrigin,nonce,port=0,onShutdown=async()=>{}}){
 const origin=normalizeManagedOrigin(upstreamOrigin);if(typeof nonce!=='string'||!/^[a-f0-9]{32}$/u.test(nonce)||!Number.isSafeInteger(port)||port<0||port>65535)throw clientFailure('Codex bridge requires a private nonce and loopback port');const health='/__link_assistant_router/codex_bridge/'+nonce,sockets=new Set(),requests=new Set();let stopped=false;
 const server=createServer(async(incoming,outgoing)=>{
  if(incoming.method==='GET'&&incoming.url===health){outgoing.writeHead(200,{'x-link-assistant-router-codex-bridge':nonce});outgoing.end('ok');return;}
  if(incoming.method==='POST'&&incoming.url===health+'/shutdown'){outgoing.writeHead(200,{'x-link-assistant-router-codex-bridge':nonce});outgoing.end('ok');setImmediate(()=>{void close().then(onShutdown).catch(()=>{});});return;}
  let url;try{url=target(origin,incoming.url);}catch{outgoing.writeHead(404);outgoing.end();return;}
  const parts=[];let bytes=0;try{for await(const part of incoming){bytes+=part.length;if(bytes>8*1024*1024){outgoing.writeHead(413);outgoing.end();incoming.resume();return;}parts.push(part);}}catch{outgoing.destroy();return;}
  const request=(url.protocol==='https:'?httpsRequest:httpRequest)(url,{method:incoming.method,headers:codexBridgeHeaders(incoming.headers)});requests.add(request);const timer=setTimeout(()=>request.destroy(Error('Codex bridge connect deadline')),15000);request.once('socket',socket=>{if(!socket.connecting)clearTimeout(timer);else socket.once(url.protocol==='https:'?'secureConnect':'connect',()=>clearTimeout(timer));});
  outgoing.once('close',()=>request.destroy());request.once('close',()=>{clearTimeout(timer);requests.delete(request);});request.once('error',()=>{if(!outgoing.headersSent){outgoing.writeHead(502);outgoing.end();}else outgoing.destroy();});request.once('response',response=>{outgoing.writeHead(response.statusCode??502,codexBridgeHeaders(response.headers,true));response.once('error',()=>outgoing.destroy());response.pipe(outgoing);});request.end(Buffer.concat(parts,bytes));
 });
 server.on('connection',socket=>{sockets.add(socket);socket.once('close',()=>sockets.delete(socket));});server.on('upgrade',(incoming,socket,head)=>{let url;try{url=target(origin,incoming.url);}catch{socket.end('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');return;}void relayWebSocket(incoming,socket,head,{target:async()=>({url,headers:new Headers(codexBridgeHeaders(incoming.headers)),claims:{}}),authorize:async()=>{},core:{},maxMessageBytes:16*1024*1024,timeoutMs:15000}).catch(()=>socket.destroy());});
 server.requestTimeout=15000;server.headersTimeout=10000;server.maxHeadersCount=256;server.maxConnections=64;
 await new Promise((resolve,reject)=>{const failed=(error)=>reject(error);server.once('error',failed);server.listen(port,'127.0.0.1',()=>{server.removeListener('error',failed);resolve();});});
 async function close(){if(stopped)return;stopped=true;for(const request of requests)request.destroy();for(const socket of sockets)socket.destroy();await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
 const address=server.address();if(address===null||typeof address==='string'){await close();throw clientFailure('Codex bridge did not bind an IP listener');}const loopbackOrigin='http://127.0.0.1:'+address.port;return {loopbackOrigin,backendBaseURL:loopbackOrigin+CODEX_BRIDGE_BACKEND,healthURL:loopbackOrigin+health,close};
}

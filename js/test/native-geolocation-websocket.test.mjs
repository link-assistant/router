import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer,request} from 'node:http';
import {createHash,randomBytes} from 'node:crypto';
import {createNativeRouter} from '../src/server.mjs';
import {WebSocketInspector,encodeWebSocketFrame} from '../src/websocket-relay.mjs';

for(const share of [false,true]) test(`localhost WebSocket location consent=${share} survives fragmentation and client EOF`,{timeout:5000},async t=>{
  const sockets=[],events=[];let headers,received,failed;
  const complete=new Promise((resolve,reject)=>{received=resolve;failed=reject;});
  const upstream=createServer();
  upstream.on('upgrade',(incoming,socket,head)=>{
    sockets.push(socket);headers=incoming.headers;
    const accept=createHash('sha1').update(headers['sec-websocket-key']+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
    const inspector=new WebSocketInspector({masked:true,onMessage:(opcode,payload)=>{
      if(opcode===9){assert.equal(events.length,0);socket.write(encodeWebSocketFrame(10,payload,false));}
      if(opcode===1){events.push(JSON.parse(payload));if(events.length===2)received();}
    }});
    socket.on('data',chunk=>inspector.feed(chunk).catch(error=>{failed(error);socket.destroy();}));
    if(head.length)void inspector.feed(head).catch(failed);
  });
  await new Promise(resolve=>upstream.listen(0,'127.0.0.1',resolve));
  const core={config:{},nativeCandidates:()=>[{provider:'p',provider_kind:'openai-compatible',account:'a',api_key:'upstream-secret',base_url:`http://127.0.0.1:${upstream.address().port}`}],
    tokens:{validate:async()=>({sub:'t',client_kind:'agent',principal_id:'p'})}};
  const router=createNativeRouter({core});
  t.after(async()=>{for(const socket of sockets)socket.destroy();await router.close();await new Promise(resolve=>upstream.close(resolve));});
  await router.listen({port:0});
  const incomingHeaders={authorization:'Bearer router-token','cf-region':'London',connection:'Upgrade',upgrade:'websocket','sec-websocket-key':randomBytes(16).toString('base64'),'sec-websocket-version':'13'};
  if(share)incomingHeaders['x-router-share-geolocation']='true';
  const {socket,head}=await new Promise((resolve,reject)=>{
    const call=request(`http://127.0.0.1:${router.address.port}/api/services/openai/v1/realtime`,{headers:incomingHeaders});
    call.on('error',reject);call.on('response',response=>reject(new Error(`Handshake returned ${response.statusCode}`)));
    call.on('upgrade',(_response,socket,head)=>resolve({socket,head}));call.end();
  });
  sockets.push(socket);
  let pong;const pinged=new Promise(resolve=>{pong=resolve;});
  const receiver=new WebSocketInspector({masked:false,onMessage:opcode=>{if(opcode===10)pong();}});
  socket.on('data',chunk=>receiver.feed(chunk).catch(()=>socket.destroy()));if(head.length)await receiver.feed(head);
  const event={type:'response.create',response:{model:'m',input:'London stays in the prompt',tools:[{type:'web_search',user_location:{city:'London'}}]}};
  const payload=Buffer.from(JSON.stringify(event));
  const first=encodeWebSocketFrame(1,payload.subarray(0,25));first[0]&=0x7f;
  socket.write(Buffer.concat([first,encodeWebSocketFrame(9,Buffer.from('inspect'))]));
  await Promise.race([pinged,complete]);assert.equal(events.length,0);
  const second={type:'session.update',session:{tools:[{type:'web_search_preview_2025_03_11',user_location:{city:'London'}}]}};
  // EOF must wait for asynchronous authorization and both complete inspected messages.
  socket.end(Buffer.concat([encodeWebSocketFrame(0,payload.subarray(25)),encodeWebSocketFrame(1,Buffer.from(JSON.stringify(second)))]));
  await complete;
  assert.equal(events[0].response.tools[0].user_location?.city,share?'London':undefined);
  assert.equal(events[1].session.tools[0].user_location?.city,share?'London':undefined);
  assert.equal(events[0].response.input,'London stays in the prompt');
  assert.equal(headers['cf-region'],share?'London':undefined);
  assert.equal(headers['x-router-share-geolocation'],undefined);
  assert.equal(headers.authorization,'Bearer upstream-secret');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer,request as httpRequest} from 'node:http';
import {createHash,randomBytes} from 'node:crypto';
import {createNativeRouter} from '../../../packages/javascript/native/server.mjs';
import {WebSocketInspector} from '../../../packages/javascript/native/websocket-relay.mjs';
const frame = (text,masked=false,fin=true,opcode=1) => {
  const payload=Buffer.from(text),size=payload.length,header=Buffer.alloc(size < 126?2:4);header[0]=(fin?128:0)|opcode;header[1]=(masked?128:0)|(size < 126?size:126);if(size>=126)header.writeUInt16BE(size,2);
  if(!masked)return Buffer.concat([header,payload]);const mask=randomBytes(4);for(let i=0;i<payload.length;i++)payload[i]^=mask[i%4];return Buffer.concat([header,mask,payload]);
};
async function connect(port,path='/api/services/openai/v1/realtime') {
  return new Promise((resolve,reject)=>{
    const request=httpRequest(`http://127.0.0.1:${port}${path}`,{headers:{authorization:'Bearer router-token',connection:'Upgrade',upgrade:'websocket','sec-websocket-key':randomBytes(16).toString('base64'),'sec-websocket-version':'13'}});
    request.on('error',reject);request.on('response',response=>reject(new Error(`Handshake returned ${response.statusCode}`)));request.on('upgrade',(response,socket,head)=>resolve({response,socket,head}));request.end();
  });
}
test('WebSocket frame inspection handles fragmentation and refuses masked direction and message bounds',async()=>{
  const messages=[],inspector=new WebSocketInspector({masked:true,maxMessageBytes:16,onMessage:(_op,p)=>messages.push(p.toString())});
  const raw=Buffer.concat([frame('Xin ',true,false),frame('chào',true,true,0)]);for(const byte of raw)await inspector.feed(Buffer.from([byte]));assert.deepEqual(messages,['Xin chào']);
  await assert.rejects(new WebSocketInspector({masked:false,maxMessageBytes:16}).feed(frame('bad',true)),/Invalid WebSocket/);
  await assert.rejects(new WebSocketInspector({masked:true,maxMessageBytes:4}).feed(frame('12345',true)),/exceeds/);
  await assert.rejects(new WebSocketInspector({masked:true}).feed(frame('orphan',true,true,0)),/fragmented/);
});
test('native realtime localhost upgrade swaps credentials and forwards messages with model/budget settlement',async t=>{
  let headers,seen=0,admitted=0,settled=0;const sockets=[];
  const upstream=createServer();upstream.on('upgrade',(incoming,socket)=>{
    sockets.push(socket);headers=incoming.headers;const key=headers['sec-websocket-key'];socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${createHash('sha1').update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64')}\r\n\r\n`);
    const inspector=new WebSocketInspector({masked:true,onMessage:(op,payload)=>{if(op===8){socket.end();return;}if(op!==1)return;seen++;const event=JSON.parse(payload);if(event.type==='response.create')socket.write(frame(JSON.stringify({type:'response.done',response:{id:'r',usage:{input_tokens:2,output_tokens:3,total_tokens:5}}})));}});socket.on('data',chunk=>inspector.feed(chunk).catch(()=>socket.destroy()));
  });
  await new Promise(resolve=>upstream.listen(0,'127.0.0.1',resolve));t.after(()=>{for(const socket of sockets)socket.destroy();upstream.close();});
  const core={config:{},nativeCandidates:()=>[{provider:'p',provider_kind:'openai-compatible',destination_kind:'stored_provider',account:'a',protocol:'openai',api_key:'upstream-token',base_url:`http://127.0.0.1:${upstream.address().port}`}],tokens:{validate:(_token,{model})=>{if(model && model!=='m')throw Object.assign(new Error('Model outside scope'),{status:403});return {sub:'t',client_kind:'agent',principal_id:'primary',record:{model_policy:{allowed_models:['m']}}};},admit:()=>{admitted++;return 'admitted';},settle:(_id,_reserved,used)=>{settled+=used;}}};
  const router=createNativeRouter({core});await router.listen({port:0});t.after(()=>router.close());
  const {socket,head,response}=await connect(router.address.port);t.after(()=>socket.destroy());assert.equal(response.statusCode,101);
  const events=[];let arrived;const received=new Promise(resolve=>{arrived=resolve;});const inspector=new WebSocketInspector({masked:false,onMessage:(op,payload)=>{if(op===1){events.push(JSON.parse(payload));arrived();}}});socket.on('data',chunk=>inspector.feed(chunk).catch(()=>socket.destroy()));if(head.length)await inspector.feed(head);
  socket.write(frame(JSON.stringify({type:'response.create',response:{model:'m'}}),true));await received;
  assert.equal(events[0].response.id,'r');assert.equal(seen,1);assert.equal(admitted,1);assert.equal(settled,5);assert.equal(headers.authorization,'Bearer upstream-token');
  socket.destroy();
});

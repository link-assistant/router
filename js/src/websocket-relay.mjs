import {request as httpRequest} from 'node:http';
import {request as httpsRequest} from 'node:https';
import {createHash,randomBytes} from 'node:crypto';
import {ProtocolError,normalizeUsage} from './protocols.mjs';
const guid='258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const accept = key => createHash('sha1').update(key+guid).digest('base64');
const closeFrame = (code,reason,masked=false) => {
  const text=Buffer.from(reason).subarray(0,123),payload=Buffer.alloc(2+text.length);payload.writeUInt16BE(code);text.copy(payload,2);
  if(!masked)return Buffer.concat([Buffer.from([0x88,payload.length]),payload]);
  const mask=randomBytes(4);for(let i=0;i<payload.length;i++)payload[i]^=mask[i%4];return Buffer.concat([Buffer.from([0x88,0x80|payload.length]),mask,payload]);
};
/** Inspect one bounded RFC6455 message while preserving original frame bytes. */
export class WebSocketInspector {
  constructor({masked,maxMessageBytes=4*1024*1024,onMessage=()=>{}}) {this.masked=masked;this.limit=maxMessageBytes;this.onMessage=onMessage;this.buffer=Buffer.alloc(0);this.parts=[];this.size=0;this.opcode=null;}
  async feed(chunk) {
    this.buffer=Buffer.concat([this.buffer,chunk]);
    while(this.buffer.length >= 2) {
      const first=this.buffer[0],second=this.buffer[1],fin=Boolean(first&0x80),opcode=first&15,masked=Boolean(second&0x80);
      if(first&0x70 || masked !== this.masked || ![0,1,2,8,9,10].includes(opcode))throw new ProtocolError('Invalid WebSocket frame',400);
      let length=second&127,offset=2;
      if(length === 126){if(this.buffer.length < 4)return;length=this.buffer.readUInt16BE(2);offset=4;}
      if(length === 127){if(this.buffer.length < 10)return;const wide=this.buffer.readBigUInt64BE(2);if(wide > BigInt(this.limit))throw new ProtocolError('WebSocket frame exceeds limit',413);length=Number(wide);offset=10;}
      if(length > this.limit || opcode >= 8 && (!fin || length > 125))throw new ProtocolError('WebSocket frame exceeds limit or has invalid control framing',413);
      const maskLength=masked?4:0;
      if(this.buffer.length < offset+maskLength+length)return;
      const payload=Buffer.from(this.buffer.subarray(offset+maskLength,offset+maskLength+length));
      if(masked){const mask=this.buffer.subarray(offset,offset+4);for(let i=0;i<payload.length;i++)payload[i]^=mask[i%4];}
      this.buffer=this.buffer.subarray(offset+maskLength+length);
      if(opcode >= 8){await this.onMessage(opcode,payload);continue;}
      if(opcode === 0 && this.opcode == null || opcode !== 0 && this.opcode != null)throw new ProtocolError('Invalid fragmented WebSocket message',400);
      if(opcode !== 0)this.opcode=opcode;
      this.size+=payload.length;if(this.size > this.limit)throw new ProtocolError('WebSocket message exceeds limit',413);this.parts.push(payload);
      if(fin){const value=Buffer.concat(this.parts,this.size),kind=this.opcode;this.parts=[];this.size=0;this.opcode=null;if(kind === 1)new TextDecoder('utf8',{fatal:true}).decode(value);await this.onMessage(kind,value);}
    }
    if(this.buffer.length > this.limit+14)throw new ProtocolError('WebSocket buffer exceeds limit',413);
  }
}
function reject(socket,status,message) {
  const body=JSON.stringify({error:{message,type:'api_error'}});
  socket.end(`HTTP/1.1 ${status} Error\r\nContent-Type: application/json\r\nContent-Length: ${Buffer.byteLength(body)}\r\nConnection: close\r\n\r\n${body}`);
}
/** Upgrade only after the exact upstream handshake; never disclose upstream credentials. */
export async function relayWebSocket(incoming,downstream,head,{target,authorize,core,maxMessageBytes=4*1024*1024,timeoutMs=15000}) {
  const key=incoming.headers['sec-websocket-key'];
  if(typeof key !== 'string' || !/^[A-Za-z0-9+/]{22}==$/.test(key) || incoming.headers['sec-websocket-version'] !== '13'){reject(downstream,400,'Invalid WebSocket handshake');return;}
  let binding;try{binding=await target();}catch(error){reject(downstream,error.status ?? 500,error.message);return;}
  const {url,headers,claims}=binding,upstreamKey=randomBytes(16).toString('base64');
  const options={...(binding.ca?{ca:binding.ca}:{}),method:'GET',headers:{...Object.fromEntries(headers),connection:'Upgrade',upgrade:'websocket','sec-websocket-key':upstreamKey,'sec-websocket-version':'13'},timeout:timeoutMs};
  let connecting=true;
  const request=(url.protocol === 'https:' ? httpsRequest:httpRequest)(url,options);
  request.once('timeout',()=>request.destroy(new Error('WebSocket connect timeout')));
  request.once('error',()=>{if(connecting)reject(downstream,502,'Upstream WebSocket connection failed');});
  downstream.once('close',()=>request.destroy());
  request.once('response',response=>{connecting=false;const chunks=[];let size=0;response.on('data',chunk=>{size+=chunk.length;if(size > maxMessageBytes){response.destroy();downstream.destroy();}else chunks.push(chunk);});response.once('end',()=>{const body=Buffer.concat(chunks);downstream.end(Buffer.concat([Buffer.from(`HTTP/1.1 ${response.statusCode} Upstream\r\nContent-Type: ${response.headers['content-type'] ?? 'application/json'}\r\nContent-Length: ${body.length}\r\nConnection: close\r\n\r\n`),body]));});});
  request.once('upgrade',(response,upstream,upstreamHead)=>{
    connecting=false;
    if(response.headers['sec-websocket-accept'] !== accept(upstreamKey)){upstream.destroy();reject(downstream,502,'Invalid upstream WebSocket handshake');return;}
    const protocol=response.headers['sec-websocket-protocol'];
    const offered=String(incoming.headers['sec-websocket-protocol'] ?? '').split(',').map(v=>v.trim());
    if(protocol && !offered.includes(protocol)){upstream.destroy();reject(downstream,502,'Upstream selected an unoffered WebSocket protocol');return;}
    downstream.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept(key)}\r\n${protocol ? `Sec-WebSocket-Protocol: ${protocol}\r\n`:''}\r\n`);
    const completed=new Set();let inFlight=0,closed=false;
    const tokenId=claims.sub ?? claims.id;
    const stop=async (code,reason) => {if(closed)return;closed=true;downstream.end(closeFrame(code,reason));upstream.end(closeFrame(code,reason,true));while(inFlight>0){inFlight--;await core.tokens?.settle?.(tokenId,0,0);}};
    const fromClient=new WebSocketInspector({masked:true,maxMessageBytes,onMessage:async(opcode,payload)=>{
      if(opcode !== 1)return;
      let event;try{event=JSON.parse(payload.toString('utf8'));}catch{return;}
      if(event.type !== 'response.create')return;
      const model=event.response?.model ?? event.model;
      const allowed=claims.record?.model_policy?.allowed_models ?? [];
      if(allowed.length && (!model || !allowed.includes(model)))throw new ProtocolError(model?'model_not_allowed':'model_required',403);
      if(model)await authorize(model);
      if(tokenId && core.tokens?.admit){const admitted=await core.tokens.admit(tokenId,0);if(admitted === false || typeof admitted === 'string' && admitted !== 'admitted')throw new ProtocolError('Router token budget is exhausted',429);inFlight++;}
    }});
    const fromUpstream=new WebSocketInspector({masked:false,maxMessageBytes,onMessage:async(opcode,payload)=>{
      if(opcode !== 1)return;let event;try{event=JSON.parse(payload.toString('utf8'));}catch{return;}
      const response=event.response;if(!['response.completed','response.done'].includes(event.type) || !response?.id || completed.has(response.id))return;
      completed.add(response.id);if(completed.size>10000)throw new ProtocolError('WebSocket response identity limit exceeded',413);
      const usage=normalizeUsage(response.usage);if(tokenId)await core.tokens?.settle?.(tokenId,0,usage.total);if(inFlight>0)inFlight--;
    }});
    const forward=(source,sink,inspector,initial)=>{
      let pending=Promise.resolve();
      const consume=chunk=>{source.pause();pending=pending.then(async()=>{if(closed)return;await inspector.feed(chunk);if(!sink.write(chunk))await new Promise(resolve=>sink.once('drain',resolve));source.resume();}).catch(()=>stop(1008,'Router rejected WebSocket message'));};
      source.on('data',consume);source.once('end',()=>{sink.end();});source.once('error',()=>stop(1011,'WebSocket peer disconnected'));source.once('close',()=>{sink.destroy();});if(initial.length)consume(initial);
    };
    forward(downstream,upstream,fromClient,head);forward(upstream,downstream,fromUpstream,upstreamHead);
  });
  request.end();
}

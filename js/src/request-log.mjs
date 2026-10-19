import {createHash,randomUUID} from 'node:crypto';
import {AsyncLocalStorage} from 'node:async_hooks';
import {mkdir,lstat,readdir,unlink,rename,chmod,open,rm} from 'node:fs/promises';
import {join,dirname,resolve} from 'node:path';
import {constants} from 'node:fs';
import {atomicWrite,serialized} from './storage.mjs';
import {decodeLogLine} from './resources.mjs';
import {ProtocolError} from './protocols.mjs';
import {matchHTTPRoute,OPAQUE_NATIVE_ROUTES} from './http-route-contract.mjs';
const context=new AsyncLocalStorage();
const errorName=name=>/^error-\d{20}-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.json$/i.test(name);
const keyName=name=>name.replace(/([a-z0-9])([A-Z])/g,'$1_$2').replace(/[^a-z0-9]+/gi,'_').toLowerCase();
const secretName=name=>/^(?:authorization|proxy_authorization|x_api_key|api_key|key|cookie|set_cookie|access_token|refresh_token|oauth_token|auth_token|security_token|x_auth_token|x_goog_api_key|x_amz_security_token|token|password|secret|client_secret|private_key)$/.test(keyName(name)) || /_(?:password|secret|token|api_key)$/.test(keyName(name));
const secretValue=value=>/^bearer /i.test(value.trim()) || /(?:sk-ant-|la_sk_|at-|la_admin_)/.test(value) || /^eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}$/.test(value.trim());
const mask=value=>{const text=String(value).trim(),bearer=/^(Bearer )(.*)$/i.exec(text),parts=[...(bearer?.[2] ?? text)],masked=parts.length<12?'[REDACTED]':parts.slice(0,3).join('')+'*'.repeat(parts.length-6)+parts.slice(-3).join('');return (bearer?.[1] ?? '')+masked;};
export function logRedact(value) {
  if(Array.isArray(value))return value.map(logRedact);
  if(value && typeof value==='object')return Object.fromEntries(Object.entries(value).map(([name,child])=>[name,['metadata','safety_identifier','user_id','prompt_cache_key'].includes(keyName(name)) ? '[REDACTED]' : secretName(name) ? typeof child==='string'?mask(child):'[REDACTED]' : keyName(name)==='uri' && typeof child==='string' ? logURI(child):logRedact(child)]));
  return typeof value==='string' && secretValue(value) ? mask(value):value;
}
export function logURI(value) {const [path,...query]=value.split('?');if(!query.length)return value;return path+'?'+query.join('?').split('&').map(part=>{const index=part.indexOf('='),name=index<0?part:part.slice(0,index),raw=index<0?'':part.slice(index+1);let decoded=raw,decodedName=name;try{decoded=decodeURIComponent(raw);decodedName=decodeURIComponent(name);}catch{}return secretName(decodedName) || secretValue(decoded) ? name+'='+mask(decoded):part;}).join('&');}
const bodyValue=bytes=>{let text;try{text=new TextDecoder('utf8',{fatal:true}).decode(bytes);}catch{return {base64:Buffer.from(bytes).toString('base64'),bytes:bytes.length};}try{return logRedact(JSON.parse(text));}catch{return text;}};
export function encodeLogLine(value) {
  const quote=text=>'"'+(text===''?'%z':text.replace(/[%"\\()\n\r\t]/g,char=>'%'+char.charCodeAt(0).toString(16).toUpperCase().padStart(2,'0')))+'"';
  if(value==null)return '()';if(typeof value==='string')return quote(value);if(Array.isArray(value))return '(#a'+value.map(child=>' '+encodeLogLine(child)).join('')+')';if(typeof value==='object')return '(#o'+Object.keys(value).sort().map(name=>' ('+quote(name)+' '+encodeLogLine(value[name])+')').join('')+')';return JSON.stringify(value);
}
async function stat(path) {try{return await lstat(path);}catch(error){if(error.code==='ENOENT')return null;throw error;}}
async function realPath(path) {let current=resolve(path);for(;;){const entry=await stat(current);if(entry?.isSymbolicLink())throw new ProtocolError('Log path cannot contain symlinks',400);if(current===dirname(current))return;current=dirname(current);}}
async function regularBytes(path,limit) {await realPath(path);const file=await open(path,constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));try{const entry=await file.stat();if(!entry.isFile())throw new ProtocolError('Log path must be a regular file',400);if(entry.size>limit)throw new ProtocolError('Log document exceeds limit',500);return file.readFile();}finally{await file.close();}}
/** Actual bounded, private retained exchanges; never a synthetic management log. */
export class NativeRequestLog {
  constructor({config={},env={},clock=Date.now}={}) {
    this.root=env.REQUEST_LOG || join(config.data_dir,'requests');this.maxBytes=positive(env.REQUEST_LOG_MAX_BYTES,100*1024*1024);this.maxTotal=nonnegative(env.REQUEST_LOG_MAX_TOTAL_BYTES,4*1024*1024*1024);
    this.errorRoot=env.ERROR_LOG_DIR || null;this.errorMax=nonnegative(env.ERROR_LOG_MAX_BYTES,10*1024*1024);this.clock=clock;this.active=new Map();this.generation=0;this.lastError=null;
  }
  async files() {
    await realPath(this.root);const entry=await stat(this.root);if(!entry)return [];if(!entry.isDirectory())throw new ProtocolError('Request log root must be a directory',400);const files=[];
    for(const dir of (await readdir(this.root)).sort()){const directory=join(this.root,dir),info=await stat(directory);if(!info?.isDirectory() || info.isSymbolicLink())continue;for(const name of ['requests.lino','requests.jsonl']){const path=join(directory,name),file=await stat(path);if(file?.isFile() && !file.isSymbolicLink())files.push({path,bytes:file.size,modified:file.mtimeMs,token:dir});}}
    return files;
  }
  async record(id,phase,fields,{opaque=false}={}) {
    const route=this.active.get(id),identity=route?.identity ?? {hash:'unauthenticated',id:null,label:null};
    let event={time:new Date(this.clock()).toISOString(),correlation_id:id,phase,...(opaque?{}:{token_hash:identity.hash,token_id:identity.id,token_label:identity.label}),...logRedact(fields)};
    let line=encodeLogLine(event)+'\n';if(Buffer.byteLength(line)>this.maxBytes){event={time:event.time,correlation_id:id,phase,...(opaque?{}:{token_hash:identity.hash,token_id:identity.id,token_label:identity.label}),body:`[OMITTED: ${Buffer.byteLength(line)} byte record exceeds log limit]`};line=encodeLogLine(event)+'\n';}
    if(Buffer.byteLength(line)>this.maxBytes)return;
    try{await serialized(this.root+'request',async()=>{
      const directory=join(this.root,identity.hash),path=join(directory,'requests.lino'),legacy=join(directory,'requests.jsonl');await realPath(directory);await mkdir(directory,{recursive:true,mode:0o700});await chmod(this.root,0o700);await chmod(directory,0o700);
      if(!await stat(path) && (await stat(legacy))?.isFile()){await realPath(legacy);await rename(legacy,path);}
      let previous=Buffer.alloc(0);if(await stat(path))previous=await regularBytes(path,this.maxBytes);
      const incoming=Buffer.from(line);if(previous.length+incoming.length>this.maxBytes){const marker=(discarded,retained)=>Buffer.from(encodeLogLine({time:new Date(this.clock()).toISOString(),phase:'log_compaction',body:`[OMITTED: ${discarded} bytes of older records discarded to stay within the request log limit; ${retained} bytes retained]`})+'\n'),budget=this.maxBytes-incoming.length,reserved=marker(previous.length,previous.length).length,marked=reserved<budget,capacity=marked?budget-reserved:budget;let floor=Math.max(0,previous.length-capacity);if(floor>0){const boundary=previous.indexOf(10,floor);floor=boundary<0?previous.length:boundary+1;}previous=Buffer.concat([...(marked && floor>0?[marker(floor,previous.length-floor)]:[]),previous.subarray(floor)]);}
      await atomicWrite(path,Buffer.concat([previous,incoming]));
      if(this.maxTotal){const files=await this.files(),groups=new Map();let total=0;for(const file of files){total+=file.bytes;const held=groups.get(file.token) ?? {bytes:0,modified:0};held.bytes+=file.bytes;held.modified=Math.max(held.modified,file.modified);groups.set(file.token,held);}for(const [token,group] of [...groups].sort(([,a],[,b])=>a.modified-b.modified)){if(total<=this.maxTotal)break;if(token===identity.hash)continue;await rm(join(this.root,token),{recursive:true});total-=group.bytes;}}
    });}catch(error){this.lastError=error.code ?? error.message;}
  }
  async lookup(id) {
    if(!id || Buffer.byteLength(id)>128)throw new ProtocolError('Invalid request id',400);const records=[];let size=0;
    for(const file of await this.files()){const text=(await regularBytes(file.path,this.maxBytes)).toString('utf8');for(const line of text.split('\n'))if(line.includes(id)){const value=decodeLogLine(line);if(value?.correlation_id===id){size+=Buffer.byteLength(line);if(size>10*1024*1024)throw new ProtocolError('request exceeds lookup limit',500);records.push(value);}}}
    return records;
  }
  async errorFiles() {if(!this.errorRoot)return [];await realPath(this.errorRoot);const entry=await stat(this.errorRoot);if(!entry)return [];if(!entry.isDirectory())throw new ProtocolError('Error log root must be a directory',400);const files=[];for(const name of (await readdir(this.errorRoot)).sort()){const entry=await stat(join(this.errorRoot,name));if(errorName(name) && entry?.isFile() && !entry.isSymbolicLink())files.push({name,bytes:entry.size});}return files;}
  async readError(name) {if(!errorName(name))throw new ProtocolError('invalid error filename',400);if(!(await this.errorFiles()).some(file=>file.name===name))throw new ProtocolError('Error capture not found',404);return regularBytes(join(this.errorRoot,name),Math.min(this.errorMax,8*1024*1024));}
  async captureError(id,status,bytes,{complete=true,truncated=false,generation=this.generation}={}) {
    if(!this.errorRoot || !this.errorMax)return;await serialized(this.errorRoot+'error',async()=>{if(generation!==this.generation)return;
      const document=Buffer.from(JSON.stringify({id,status,body:truncated || !complete?'[OMITTED: incomplete or oversized error body]':bodyValue(bytes),complete,truncated}));if(document.length>Math.min(this.errorMax,8*1024*1024))return;
      const files=await this.errorFiles();let total=files.reduce((sum,file)=>sum+file.bytes,0);for(const file of files){if(total+document.length<=this.errorMax)break;await unlink(join(this.errorRoot,file.name));total-=file.bytes;}
      await realPath(this.errorRoot);await mkdir(this.errorRoot,{recursive:true,mode:0o700});await chmod(this.errorRoot,0o700);const time=(BigInt(Math.floor(this.clock()))*1000000n).toString().padStart(20,'0');await atomicWrite(join(this.errorRoot,`error-${time}-${randomUUID()}.json`),document);
    });
  }
  async clear() {await serialized(this.root+'request',async()=>{for(const file of await this.files())await unlink(file.path);if(this.errorRoot)await serialized(this.errorRoot+'error',async()=>{this.generation++;for(const file of await this.errorFiles())await unlink(join(this.errorRoot,file.name));});});}
  queueSnapshot(configured=[]) {const counts=new Map(configured.map(name=>[name,0]));let unassigned=0;for(const route of this.active.values())if(route.account)counts.set(route.account,(counts.get(route.account) ?? 0)+1);else unassigned++;return {accounts:[...counts].sort(([a],[b])=>a.localeCompare(b)).map(([name,in_flight])=>({name,in_flight,queued:0})),in_flight:this.active.size,queued:0,unassigned};}
  select(account) {const id=context.getStore();if(id && this.active.has(id))this.active.get(id).account=account ?? 'primary';}
  async exchange(request,dispatch,{core}={}) {
    const id=randomUUID(),token=request.headers.get('authorization')?.replace(/^Bearer /i,'') ?? request.headers.get('x-api-key');let claims;
    try{if(token)claims=await core?.tokens?.validate(token);}catch{/* Unauthenticated identities share the retained diagnostic directory. */}
    this.active.set(id,{identity:claims?{hash:createHash('sha256').update(token).digest('hex').slice(0,32),id:claims.sub,label:claims.label ?? null}:{hash:'unauthenticated',id:null,label:null},account:null,opaque:false});
    const path=new URL(request.url).pathname,route=matchHTTPRoute(request.method,path),opaque=route && OPAQUE_NATIVE_ROUTES.some(item=>item.path===route.path && item.method===(request.method==='HEAD'?'GET':request.method)),uri=opaque?route.path:logURI(new URL(request.url).pathname+new URL(request.url).search);
    this.active.get(id).opaque=Boolean(opaque);let captured=false,length=0,omitted=false;const chunks=[];
    const requestRecord=async complete=>{if(captured)return;captured=true;await this.record(id,'client_request',{method:request.method,uri,...(opaque?{}:{version:'HTTP/1.1',headers:Object.fromEntries(request.headers),body:complete && !omitted?bodyValue(Buffer.concat(chunks)):length?'[OMITTED: incomplete or oversized request body]':'[NOT READ: request was rejected before the body was consumed]'})},{opaque});};
    let logged=request;
    if(!request.body || opaque){await requestRecord(true);}else {
      const reader=request.body.getReader();const stream=new ReadableStream({async pull(sink){try{const value=await reader.read();if(value.done){await requestRecord(true);reader.releaseLock();sink.close();return;}length+=value.value.length;if(length<=10*1024*1024)chunks.push(Buffer.from(value.value));else omitted=true;sink.enqueue(value.value);}catch(error){await requestRecord(false);sink.error(error);}},async cancel(reason){await requestRecord(false);await reader.cancel(reason);reader.releaseLock();}});
      logged=new Request(request,{body:stream,duplex:'half'});
    }
    let response;try{response=await context.run(id,()=>dispatch(logged));}catch(error){await requestRecord(false);this.active.delete(id);throw error;}
    await requestRecord(false);
    await this.record(id,'client_response',{status:response.status,...(opaque?{uri,upstream_request_id:response.headers.get('x-request-id') ?? response.headers.get('x-oai-request-id')}:{headers:Object.fromEntries(response.headers)})},{opaque});
    return this.wrapResponse(response,{id,phase:'client_response_body',opaque,finish:()=>this.active.delete(id)});
  }
  wrapResponse(response,{id,phase,opaque=false,errorCapture=false,finish=()=>{}}) {
    const reader=response.body?.getReader();if(!reader){finish();return response;}const log=this,generation=this.generation,chunks=[],started=this.clock(),streamed=!response.headers.has('content-type') || response.headers.get('content-type').split(';')[0].trim().toLowerCase()==='text/event-stream',inspectable=!(response.headers.get('content-encoding') ?? '').split(',').some(value=>value.trim() && value.trim().toLowerCase()!=='identity');let total=0,frames=0,truncated=false,finished=false,terminated=false,tail=Buffer.alloc(0),remaining=response.headers.has('content-length')?Number(response.headers.get('content-length')):null;
    const done=async(complete,detail=null)=>{if(finished)return;finished=true;if(errorCapture)await log.captureError(id,response.status,Buffer.concat(chunks),{complete:complete || remaining===0,truncated,generation}).catch(error=>{log.lastError=error.message;});if(!opaque && phase==='upstream_response_body')await log.record(id,'stream_end',{outcome:detail?'upstream_error':!streamed?'completed_not_streamed':terminated?'completed':inspectable?'ended_without_terminator':'encoded_not_verifiable',streamed,inspectable,complete:!detail && (!streamed || inspectable && terminated),frames,bytes:total,duration_ms:Math.max(0,log.clock()-started),detail});finish();};
    const stream=new ReadableStream({async pull(sink){try{const value=await reader.read();if(value.done){await done(true);reader.releaseLock();sink.close();return;}frames++;total+=value.value.length;if(remaining!=null)remaining=remaining>=value.value.length?remaining-value.value.length:null;if(inspectable){tail=Buffer.concat([tail,value.value]);terminated ||= /message_stop|\[DONE\]|response\.completed|finishReason/.test(tail.toString('utf8'));tail=tail.subarray(Math.max(0,tail.length-32));}if(!opaque && phase)await log.record(id,phase,{body:bodyValue(value.value)});if(errorCapture){const held=chunks.reduce((sum,chunk)=>sum+chunk.length,0),take=Math.min(value.value.length,Math.max(0,Math.min(1024*1024,log.errorMax)-held));if(take)chunks.push(Buffer.from(value.value.subarray(0,take)));truncated ||= take<value.value.length;}sink.enqueue(value.value);}catch(error){await done(false,String(error.message ?? error));sink.error(error);}},async cancel(reason){await done(false,String(reason ?? 'response body cancelled'));await reader.cancel(reason);reader.releaseLock();}});
    return new Response(stream,{status:response.status,headers:response.headers});
  }
  fetch(fetch) {return async(url,options)=>{const id=context.getStore(),opaque=this.active.get(id)?.opaque;if(id){this.select(this.active.get(id)?.account);await this.record(id,'upstream_request',opaque?{method:options?.method ?? 'GET'}:{method:options?.method ?? 'GET',uri:String(url),headers:Object.fromEntries(new Headers(options?.headers)),body:typeof options?.body==='string'?bodyValue(Buffer.from(options.body)):'[OMITTED: opaque upstream body]'},{opaque});}
    let response;try{response=await fetch(url,options);}catch(error){if(id)await this.record(id,'upstream_error',opaque?{}:{error:String(error.message ?? error)},{opaque});throw error;}if(id)await this.record(id,'upstream_response',{status:response.status,...(opaque?{}:{headers:Object.fromEntries(response.headers)})},{opaque});return this.wrapResponse(response,{id:id ?? randomUUID(),phase:id?'upstream_response_body':undefined,opaque,errorCapture:!opaque && response.status>=400});};}
}
function nonnegative(value,fallback){const n=Number(value);return value!=null && Number.isSafeInteger(n) && n>=0?n:fallback;}
function positive(value,fallback){return nonnegative(value,fallback) || fallback;}

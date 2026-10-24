// Opaque runtime resources, not compiler source/type/owner verdict caches.
import {types} from 'node:util';
import {Buffer} from 'node:buffer';
import {deferFilesystemFlow as defer} from './extensions/filesystem-effects-runtime.mjs';
const cancellationStates=new WeakMap(),senderStates=new WeakMap(),receiverStates=new WeakMap();
const freeze=Object.freeze,isProxy=types.isProxy;
export const ASYNC_CONTROL_LIMITS=freeze({bytes:1048576,capacity:32,pending:32,delayMs:86400000n});
const ok=field0=>freeze({$:'Ok',field0}),err=kind=>freeze({$:'Err',field0:freeze({$:kind})}),none=()=>freeze({$:'None'}),some=field0=>freeze({$:'Some',field0});
function resource(map,value){if(!value||typeof value!=='object'||isProxy(value)||!map.has(value))throw new TypeError('Actual live async control resource required');return map.get(value);}
function handle(map,state){const value=freeze(Object.create(null));map.set(value,state);return value;}
function count(value){if(typeof value!=='bigint'||value<0n||value>ASYNC_CONTROL_LIMITS.delayMs)return null;return Number(value);}
function subscribe(state,operation){if(state.set){operation();return ()=>{};}state.listeners.add(operation);return ()=>state.listeners.delete(operation);}
export function router_cancel_new(){return handle(cancellationStates,{set:false,listeners:new Set()});}
export function router_cancel_clone(value){return handle(cancellationStates,resource(cancellationStates,value));}
export function router_cancel_set(value){const state=resource(cancellationStates,value);if(state.set)return false;state.set=true;const listeners=[...state.listeners];state.listeners.clear();for(const listener of listeners)listener();return true;}
export function router_cancel_is_set(value){return resource(cancellationStates,value).set;}
export function router_cancel_wait(value){const state=resource(cancellationStates,value);return defer(()=>state.set?null:new Promise(resolve=>subscribe(state,()=>resolve(null))));}
export function router_async_sleep(milliseconds,value){
 const state=resource(cancellationStates,value);return defer(()=>{const duration=count(milliseconds);if(duration===null)return err('InvalidInput');if(state.set)return err('Cancelled');return new Promise(resolve=>{let active=true,unsubscribe=()=>{};const finish=value=>{if(!active)return;active=false;clearTimeout(timer);unsubscribe();resolve(value);},timer=setTimeout(()=>finish(ok(null)),duration);unsubscribe=subscribe(state,()=>finish(err('Cancelled')));});});
}
export function router_async_with_deadline(milliseconds,value,operation){
 const parent=resource(cancellationStates,value);if(typeof operation!=='function'||isProxy(operation))throw new TypeError('Actual ordinary deferred operation required');return defer(()=>{
  const duration=count(milliseconds);if(duration===null)return err('InvalidInput');if(parent.set)return err('Cancelled');if(duration===0)return err('Timeout');const child=router_cancel_new();
  return new Promise((resolve,reject)=>{let active=true,unsubscribe=()=>{};const finish=(value,fault=false)=>{if(!active)return;active=false;clearTimeout(timer);unsubscribe();router_cancel_set(child);fault?reject(value):resolve(value);},timer=setTimeout(()=>finish(err('Timeout')),duration);unsubscribe=subscribe(parent,()=>finish(err('Cancelled')));
   if(!active)return;try{Promise.resolve(operation(child)).then(value=>finish(ok(value)),error=>finish(error,true));}catch(error){finish(error,true);}
  });
 });
}
export function router_async_channel(capacity){
 if(typeof capacity!=='bigint'||capacity<1n||capacity>32n)return err('InvalidInput');const state={capacity:Number(capacity),bytes:0,queue:[],writers:[],reader:null,closed:false,disposed:false};return ok(freeze([handle(senderStates,state),handle(receiverStates,state)]));
}
export function router_async_sender_clone(value){return handle(senderStates,resource(senderStates,value));}
function encodedLength(value){
 if(typeof value!=='string')throw new TypeError('Base64 chunk must be source text');if(value.length>1398104)return {error:'Resource'};const bytes=Buffer.from(value,'base64');if(bytes.length>ASYNC_CONTROL_LIMITS.bytes)return {error:'Resource'};if(bytes.toString('base64')!==value)return {error:'InvalidInput'};return {bytes:bytes.length};
}
function pump(state){
 if(state.reader&&state.queue.length){const reader=state.reader;state.reader=null;const item=state.queue.shift();state.bytes-=item.bytes;reader.finish(ok(some(item.encoded)));}
 if(state.closed){for(const writer of [...state.writers])writer.finish(err('Closed'));if(state.reader&&!state.queue.length){const reader=state.reader;state.reader=null;reader.finish(ok(none()));}return;}
 while(state.writers.length&&state.queue.length<state.capacity){const writer=state.writers[0];if(state.bytes+writer.bytes>ASYNC_CONTROL_LIMITS.bytes)break;state.writers.shift();if(writer.cancelled()){writer.finish(err('Cancelled'));continue;}state.queue.push({encoded:writer.encoded,bytes:writer.bytes});state.bytes+=writer.bytes;writer.finish(ok(null));if(state.reader){const reader=state.reader;state.reader=null;const item=state.queue.shift();state.bytes-=item.bytes;reader.finish(ok(some(item.encoded)));}}
}
export function router_async_send(value,encoded,cancellation){
 const state=resource(senderStates,value),cancel=resource(cancellationStates,cancellation);return defer(()=>{
  if(cancel.set)return err('Cancelled');const size=encodedLength(encoded);if(size.error)return err(size.error);if(state.closed)return err('Closed');if(state.writers.length>=ASYNC_CONTROL_LIMITS.pending)return err('Resource');
  return new Promise(resolve=>{let active=true,unsubscribe=()=>{};const writer={encoded,bytes:size.bytes,cancelled:()=>cancel.set,finish:value=>{if(!active)return;active=false;unsubscribe();const index=state.writers.indexOf(writer);if(index>=0)state.writers.splice(index,1);resolve(value);}};state.writers.push(writer);unsubscribe=subscribe(cancel,()=>{writer.finish(err('Cancelled'));pump(state);});pump(state);});
 });
}
export function router_async_receive(value,cancellation){
 const state=resource(receiverStates,value),cancel=resource(cancellationStates,cancellation);return defer(()=>{
  if(cancel.set)return err('Cancelled');if(state.disposed)return ok(none());if(state.reader)throw new TypeError('One actual exclusive channel receiver poll required');if(!state.queue.length&&state.closed)return ok(none());
  return new Promise(resolve=>{let active=true,unsubscribe=()=>{};const reader={finish:value=>{if(!active)return;active=false;unsubscribe();if(state.reader===reader)state.reader=null;resolve(value);}};state.reader=reader;unsubscribe=subscribe(cancel,()=>reader.finish(err('Cancelled')));pump(state);});
 });
}
export function router_async_close(value){const state=resource(receiverStates,value);if(state.reader)throw new TypeError('Close requires an exclusive idle receiver');state.closed=true;pump(state);return null;}
export function router_async_dispose(value){const state=resource(receiverStates,value);if(state.reader)throw new TypeError('Dispose requires an exclusive idle receiver');state.disposed=true;state.closed=true;state.queue=[];state.bytes=0;pump(state);return null;}
export const ASYNC_CONTROL_SOURCE_AUTHORITY=freeze({sourceAuthority:false,semanticAuthority:false,runtimeParity:false});

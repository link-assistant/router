// Invocation-owned diagnostic DATA; it grants no source/native permission.
import {AsyncLocalStorage} from 'node:async_hooks';
import {writeSync as nativeWriteSync} from 'node:fs';
import {Buffer as NativeBuffer} from 'node:buffer';
import {types} from 'node:util';
import {fileURLToPath} from 'node:url';
export const SOURCE_DIAGNOSTIC_EXECUTABLE_ROOT=fileURLToPath(new URL('../../',import.meta.url));
import {guardProtectedNativeSourceDiagnosticWrite} from './protected-reviewed-adoption-20261102.mjs';
const contexts=new AsyncLocalStorage(),LIMITS=Object.freeze({records:256,bytes:1048576,textCharacters:8192,fieldCharacters:2048});
const bounded=text=>({text:text.slice(0,LIMITS.textCharacters),characters:text.length,truncated:text.length>LIMITS.textCharacters});
// Only this captured native operation effects the guarded descriptor. Mutable
// process.stderr.write members cannot redirect the protected route's output.
const writeDescriptor=nativeWriteSync,bufferFrom=NativeBuffer.from,applyNative=Reflect.apply;
const sliceText=String.prototype.slice,unitAt=String.prototype.charCodeAt;
function writeFixedDiagnosticDescriptor(message){
 let at=0,total=0;
 while(at<message.length){
  let end=Math.min(message.length,at+16384);
  if(end<message.length){const high=applyNative(unitAt,message,[end-1]),low=applyNative(unitAt,message,[end]);if(high>=0xd800&&high<=0xdbff&&low>=0xdc00&&low<=0xdfff)end--;}
  const text=applyNative(sliceText,message,[at,end]),raw=applyNative(bufferFrom,NativeBuffer,[text,'utf8']);let offset=0;
  while(offset<raw.length){const count=writeDescriptor(2,raw,offset,raw.length-offset);if(!Number.isSafeInteger(count)||count<=0||count>raw.length-offset)throw TypeError('Native diagnostic descriptor made no valid write progress');offset+=count;total+=count;}
  at=end;
 }return total;
}
function errorData(error){
 const kind=typeof error;if(error===null)return {kind:'null'};if(kind==='undefined')return {kind};if(kind==='string')return {kind,...bounded(error)};if(kind==='boolean')return {kind,value:error};if(kind==='number')return {kind,value:Number.isFinite(error)?error:String(error)};if(kind!=='object'&&kind!=='function')return {kind,opaque:true};
 if(types.isProxy(error))return {kind,opaque:true,reason:'proxy'};const fields={};for(const name of ['name','message','stack','code']){let row;try{row=Object.getOwnPropertyDescriptor(error,name);}catch{return {kind,opaque:true,reason:'descriptor failure'};}if(!row)continue;if(!Object.hasOwn(row,'value')){fields[name]={kind:'accessor',unobserved:true};continue;}const value=row.value;if(typeof value==='string')fields[name]={text:value.slice(0,LIMITS.fieldCharacters),characters:value.length,truncated:value.length>LIMITS.fieldCharacters};else if(value===null||['undefined','boolean','number'].includes(typeof value))fields[name]=errorData(value);else fields[name]={kind:typeof value,opaque:true};}return {kind,fields};
}
function copy(value){if(value===null||typeof value!=='object')return value;if(Array.isArray(value))return Object.freeze(value.map(copy));return Object.freeze(Object.fromEntries(Object.keys(value).map(key=>[key,copy(value[key])])));}
function collectorMethods(){
 const state={records:[],bytes:0,droppedRecords:0,droppedCharacters:0,lateRecords:0,closed:false,emitting:false};
 const append=event=>{if(state.closed){state.lateRecords=Math.min(Number.MAX_SAFE_INTEGER,state.lateRecords+1);return null;}const bytes=Buffer.byteLength(JSON.stringify(event))+(event.delivery==='PENDING'?196608:0);if(state.records.length===LIMITS.records||state.bytes+bytes>LIMITS.bytes){state.droppedRecords=Math.min(Number.MAX_SAFE_INTEGER,state.droppedRecords+1);state.droppedCharacters=Math.min(Number.MAX_SAFE_INTEGER,state.droppedCharacters+(event.message?.characters??0));return null;}state.bytes+=bytes;state.records.push(event);return event;};
 const snapshot=()=>copy({schema:'router-protected-source-diagnostics-20261103-v1',records:state.records,retainedBytesIncludingRouteReserve:state.bytes,droppedRecords:state.droppedRecords,droppedCharacters:state.droppedCharacters,lateRecords:state.lateRecords,limits:LIMITS,closed:state.closed,sourceAuthority:false,semanticAuthority:false});
 return Object.freeze({
  run(operation){if(state.closed)throw Error('Source diagnostic collector expired');if(typeof operation!=='function'||types.isProxy(operation))throw TypeError('Fixed source diagnostic operation required');return contexts.run({state,append},operation);},
  observe(message,primary){if(state.closed)throw Error('Source diagnostic collector expired');if(typeof message!=='string')throw TypeError('Primitive diagnostic text required');append({message:bounded(message),primary:errorData(primary),delivery:'CALLER_RETAINED'});return snapshot();},
  snapshot,
  close(){if(state.closed)throw Error('Source diagnostic collector already closed');state.closed=true;return snapshot();},
 });
}

const freezeCollector=Object.freeze;
class DiagnosticCollector {
 #methods=collectorMethods();
 constructor(){if(new.target!==DiagnosticCollector)throw TypeError('Original diagnostic collector constructor required');freezeCollector(this);}
 run(operation){return this.#methods.run(operation);}
 observe(message,primary){return this.#methods.observe(message,primary);}
 snapshot(){return this.#methods.snapshot();}
 close(){return this.#methods.close();}
}
freezeCollector(DiagnosticCollector.prototype);freezeCollector(DiagnosticCollector);
const runCollector=DiagnosticCollector.prototype.run;
export function createProtectedSourceDiagnosticCollector(){return new DiagnosticCollector();}
export function withProtectedSourceDiagnostics(collector,operation){return runCollector.call(collector,operation);}

function recoveryData(value){if(value===undefined)return undefined;if(!Array.isArray(value)||types.isProxy(value))return {opaque:true};const rows=[],length=Object.getOwnPropertyDescriptor(value,'length')?.value;let characters=0;for(let index=0;index<Math.min(length,64);index++){const field=Object.getOwnPropertyDescriptor(value,String(index));if(!field||!Object.hasOwn(field,'value')||typeof field.value!=='string')return {paths:rows,opaque:true,unobserved:length-index};if(characters+field.value.length>65536)return {paths:rows,truncated:true,unobserved:length-index};rows.push(field.value);characters+=field.value.length;}return {paths:rows,unobserved:Math.max(0,length-rows.length)};}
export function retainProtectedSourceDiagnostic(message,{primary,secondary,recoveryPaths}={}){if(typeof message!=='string')throw TypeError('Primitive source diagnostic text required');const context=contexts.getStore();if(!context)return {delivery:'NO_ADDITIVE_COLLECTOR'};context.append({message:bounded(message),primary:errorData(primary),secondary:errorData(secondary),recoveryPaths:recoveryData(recoveryPaths),delivery:'CALLER_RETAINED'});return {delivery:'CALLER_RETAINED'};}
function synchronousVeto(operation){if(typeof operation!=='function'||types.isProxy(operation)||types.isAsyncFunction(operation))throw TypeError('Fixed synchronous diagnostic veto required');const value=operation();if(types.isPromise(value))throw TypeError('Diagnostic veto must complete synchronously');if(value&&(typeof value==='object'||typeof value==='function')){let at=value,depth=0;for(;at!==null;at=Object.getPrototypeOf(at)){if(types.isProxy(at)||++depth>64)throw TypeError('Bounded inert diagnostic veto result required');const then=Object.getOwnPropertyDescriptor(at,'then');if(then&&(!Object.hasOwn(then,'value')||typeof then.value==='function'))throw TypeError('Diagnostic veto thenable/accessor refused');}}return value;}
export function emitProtectedSourceDiagnostic(message,{primary,secondary,recoveryPaths,additionalVeto}={}){
 if(typeof message!=='string')throw TypeError('Primitive source diagnostic text required');const context=contexts.getStore();
 // Compatibility path remains explicitly unqualified until a fixed caller
 // installs the additive collector. It is never claimed as protected output.
 if(!context){try{process.stderr.write(message);return {delivery:'LEGACY_UNGUARDED',failed:false};}catch(error){return {delivery:'LEGACY_FAILED',failed:true,error};}}
 const event=context.append({message:bounded(message),primary:errorData(primary),secondary:errorData(secondary),recoveryPaths:recoveryData(recoveryPaths),delivery:'PENDING'});
 if(context.state.closed)return {delivery:'RETAINED_EXPIRED',failed:true,error:Error('Source diagnostic collector expired')};
 if(context.state.emitting){if(event)event.delivery='RETAINED_REENTRANT';return {delivery:'RETAINED_REENTRANT',failed:true,error:Error('Reentrant source diagnostic retained')};}
 context.state.emitting=true;const failures=[],rawFailures=[];let delivered=false,attempted=false;
 const note=error=>{failures.push(errorData(error));rawFailures.push(error);};
 try{
  if(additionalVeto!==undefined)try{synchronousVeto(additionalVeto);}catch(error){note(error);}
  try{guardProtectedNativeSourceDiagnosticWrite(()=>{if(failures.length)return false;if(context.state.closed)throw Error('Source diagnostic collector expired before write');attempted=true;const value=writeFixedDiagnosticDescriptor(message);delivered=true;return value;},SOURCE_DIAGNOSTIC_EXECUTABLE_ROOT);}catch(error){note(error);}
 }finally{if(additionalVeto!==undefined)try{synchronousVeto(additionalVeto);}catch(error){note(error);}context.state.emitting=false;}
 const delivery=failures.length?(delivered?'EMITTED_CLOSING_FAILED':attempted?'WRITE_FAILED':'RETAINED_VETO'):delivered?'EMITTED':'RETAINED_UNAVAILABLE';
 if(event){event.delivery=delivery;event.routeFailures=failures;event.writeAttempted=attempted;}
 return {delivery,retention:event?'RECORDED':'EXPLICIT_OVERFLOW',failed:rawFailures.length>0,error:rawFailures[0],sourceAuthority:false};
}
export function writeProtectedSourceDiagnostic(message,details){const result=emitProtectedSourceDiagnostic(message,details);if(result.failed)throw result.error;if(result.delivery!=='EMITTED'&&result.delivery!=='LEGACY_UNGUARDED')throw Error('Source diagnostic retained without an output route');return result;}

export function protectedSourceDiagnosticText(error){
 if(types.isNativeError(error)&&!types.isProxy(error))try{const stack=error.stack;if(typeof stack==='string')return stack;}catch(secondary){retainProtectedSourceDiagnostic('Native diagnostic stack formatting failure',{primary:error,secondary});}
 if(error!==null&&['object','function'].includes(typeof error)&&!types.isProxy(error))for(const name of ['stack','message']){let field;try{field=Object.getOwnPropertyDescriptor(error,name);}catch{break;}if(field&&Object.hasOwn(field,'value')&&typeof field.value==='string')return field.value;}
 if(error===null||['undefined','boolean','number','string','symbol'].includes(typeof error))return String(error);return 'Opaque '+typeof error+' failure; retained diagnostic observation available';
}

export function protectedSourceDiagnosticMessage(error){if(error!==null&&['object','function'].includes(typeof error)&&!types.isProxy(error))try{const field=Object.getOwnPropertyDescriptor(error,'message');if(field&&Object.hasOwn(field,'value')&&typeof field.value==='string')return field.value;}catch{}return protectedSourceDiagnosticText(error);}
export function protectedSourceDiagnosticDisplay(error){if(types.isNativeError(error)&&!types.isProxy(error))try{return String(error);}catch(secondary){retainProtectedSourceDiagnostic('Native diagnostic display formatting failure',{primary:error,secondary});}return protectedSourceDiagnosticText(error);}

// Synchronous scoped routing behind an explicit owned matching backend.
// This is NOT the missing native persistent logging/redaction/lock adapter.
import {types} from 'node:util';
import * as literalRuntime from './literal-arguments-core-20261101-runtime.mjs';
const apply=Reflect.apply,freeze=Object.freeze,backends=new WeakMap(),MAX=8388608,EVENTS=4096;
const fail=message=>{throw new TypeError('Owned literal output: '+message);};
let active=null;
function ordinary(value){if(!value||typeof value!=='object'||types.isProxy(value)||Object.getPrototypeOf(value)!==Object.prototype)fail('ordinary complete owned backend input required');return value;}
function own(value,names){ordinary(value);const keys=Reflect.ownKeys(value);if(keys.length!==names.length||keys.some(key=>typeof key!=='string'||!names.includes(key)))fail('exact backend fields required');return Object.fromEntries(names.map(key=>{const field=Object.getOwnPropertyDescriptor(value,key);if(!field||!Object.hasOwn(field,'value')||!field.enumerable)fail('own backend fields without getters required');return [key,field.value];}));}
function callback(fn){if(typeof fn!=='function'||types.isProxy(fn)||types.isAsyncFunction(fn)||types.isGeneratorFunction(fn))fail('ordinary synchronous backend operation required');return fn;}
function sync(value){if(types.isPromise(value)||types.isProxy(value)||value!==null&&(typeof value==='object'||typeof value==='function')&&Reflect.has(value,'then'))fail('synchronous backend returned a future/thenable');return value;}
function call(state,name,args){return sync(apply(state[name],undefined,args));}
function text(value){if(typeof value!=='string'||value.length>2097152||/\p{Surrogate}/u.test(value)||Buffer.byteLength(value)>2097152)fail('bounded scalar-valid owned text required');return value;}
function bool(value){if(typeof value!=='boolean')fail('exact source bool required');return value;}
function ignoredIo(value){if(value===null)return;if(!value||types.isProxy(value)||Object.getPrototypeOf(value)!==Object.prototype)fail('backend transport must return null or an owned IO-error DATA value');const row=own(value,['kind','message']);if(row.kind!=='io-error'||typeof row.message!=='string'||row.message.length>4096)fail('bounded IO-error DATA value required');}
function transport(state,stderr,value,quiet){
 // Operation context wins even for quiet stderr, matching native write_transport.
 const written=call(state,'contextWrite',[stderr,value]);if(typeof written!=='boolean')fail('context transport must report actual scoped presence');if(written)return;
 if(stderr&&quiet)return;ignoredIo(call(state,'processWrite',[stderr,value]));
}
function route(state,mode,stderr,value){
 if(mode==='write'){
  const captured=call(state,'capture',[value]);if(typeof captured!=='boolean')fail('capture must return actual active-scope bool');if(captured)return;
  const quiet=call(state,'fileDiagnostics',[]);if(quiet!==null&&typeof quiet!=='boolean')fail('file diagnostics must be absent/null or bool');
  if(stderr&&quiet!==null){const result=call(state,'diagnostic',[value,quiet]);if(result!==null)fail('diagnostic must synchronously handle its own IO errors');}
  transport(state,stderr,value,quiet??false);
 }else transport(state,stderr,value,false);
}
export function createOutputBridgeBackend(input){
 const row=own(input,['capture','fileDiagnostics','diagnostic','contextWrite','processWrite']);for(const value of Object.values(row))callback(value);
 const handle=freeze({kind:'owned-literal-output-backend'});backends.set(handle,row);return handle;
}
export function withOutputLiteralBackend(backend,operation){
 if(arguments.length!==2)fail('one backend and synchronous operation required');callback(operation);const state=backends.get(backend);if(!state)fail('actual owned backend required');
 // Deliberately a synchronous stack, NOT AsyncLocalStorage: no inherited
 // Promise/timer/task scope. Checked callers contain no task/async operations.
 const previous=active,scope={state,live:true};active=scope;try{return sync(apply(operation,undefined,[]));}finally{scope.live=false;active=previous;}
}
function output(mode,stderr,value){
 bool(stderr);if(!active?.live)fail('explicit synchronous matching backend scope required');const state=active.state;
 // The successor of the ORIGINAL runtime consumes the SAME private carrier.
 // No copied marker/shape/public text accessor is accepted.
 const consume=literalRuntime.literal_arguments_consume_output;if(typeof consume!=='function')fail('complete same-store output successor is not installed');return consume(value,source=>{route(state,mode,stderr,text(source));return null;});
}
export function output_literal_write(stderr,value){if(arguments.length!==2)fail('write takes bool and carrier');return output('write',stderr,value);}
export function output_literal_result(stderr,value){if(arguments.length!==2)fail('result takes bool and carrier');return output('result',stderr,value);}
export function output_literal_passthrough(stderr,value){if(arguments.length!==2)fail('passthrough takes bool and carrier');return output('passthrough',stderr,value);}
export function createMemoryOutputBackend(input){
 const options=own(input,['captureActive','captureTerminal','operationActive','fileDiagnostics','transportError']);
 for(const key of ['captureActive','captureTerminal','operationActive','transportError'])bool(options[key]);if(options.fileDiagnostics!==null&&typeof options.fileDiagnostics!=='boolean')fail('exact optional diagnostics bool required');
 const state={stdout:'',stderr:'',events:[],bytes:0};
 function event(kind,stderr,value,quiet=null){value=text(value);const bytes=Buffer.byteLength(value);if(state.events.length>=EVENTS||state.bytes>MAX-bytes)throw new RangeError('Owned output memory event/UTF8 envelope');state.bytes+=bytes;state.events.push(freeze({kind,stderr,text:value,quiet}));}
 function contextWrite(stderr,value){if(!options.operationActive)return false;event('context',stderr,value);state[stderr?'stderr':'stdout']+=value;return true;}
 function processWrite(stderr,value){event('process',stderr,value);return options.transportError?freeze({kind:'io-error',message:'injected transport IO failure'}):null;}
 const backend=createOutputBridgeBackend({
  capture(value){event('capture-probe',false,value);if(!options.captureActive)return false;event('capture-record',false,value);if(options.captureTerminal||options.operationActive){if(!contextWrite(true,value))ignoredIo(processWrite(true,value));}return true;},
  fileDiagnostics(){return options.fileDiagnostics;},
  diagnostic(value,quiet){event('diagnostic',true,value,quiet);return null;},contextWrite,processWrite,
 });
 const snapshot=()=>freeze({stdout:state.stdout,stderr:state.stderr,events:freeze(state.events.map(row=>freeze({...row}))),bytes:state.bytes});
 return freeze({backend,snapshot});
}

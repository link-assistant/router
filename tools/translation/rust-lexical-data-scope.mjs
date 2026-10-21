// Explicit synchronous lexical DATA schedule. This never issues source,
// semantic, type, owner, native grammar or executable authority.
import {types} from 'node:util';
import {originalStaticSourceIntrinsicsUnchanged,originalDataFreezeIntrinsicsUnchanged} from './original-json-intrinsics.mjs';
import {originalLexingIntrinsicsUnchanged} from './original-lexing-intrinsics.mjs';
const field=Object.getOwnPropertyDescriptor,own=Object.hasOwn,parent=Object.getPrototypeOf,keys=Reflect.ownKeys,apply=Reflect.apply,freeze=Object.freeze;
const proxy=types.isProxy,promise=types.isPromise,asyncFunction=types.isAsyncFunction,generatorFunction=types.isGeneratorFunction,text=Function.prototype.toString;
const array=Array.isArray,arrayPrototype=Array.prototype,objectPrototype=Object.prototype,MapClass=Map,SetClass=Set;
const mapGet=Map.prototype.get,mapSet=Map.prototype.set,mapClear=Map.prototype.clear,setHas=Set.prototype.has,setAdd=Set.prototype.add,slice=String.prototype.slice;
const extra=[[types,'isProxy',proxy],[types,'isPromise',promise],[types,'isAsyncFunction',asyncFunction],[types,'isGeneratorFunction',generatorFunction]];
const pins=[];let qualified=true;
for(let at=0;at<extra.length;at++){
 const row=extra[at],descriptor=field(row[0],row[1]);pins[at]=descriptor;
 if(!descriptor||!own(descriptor,'value')||descriptor.value!==row[2]||typeof row[2]!=='function'||proxy(row[2])||apply(text,row[2],[])!==`function ${row[1]}() { [native code] }`)qualified=false;
}
function ready(){
 if(!qualified||!originalStaticSourceIntrinsicsUnchanged()||!originalDataFreezeIntrinsicsUnchanged()||!originalLexingIntrinsicsUnchanged())return false;
 for(let at=0;at<extra.length;at++){
  const actual=field(extra[at][0],extra[at][1]),pin=pins[at];
  if(!actual||!own(actual,'value')||actual.value!==pin.value||actual.enumerable!==pin.enumerable||actual.writable!==pin.writable||actual.configurable!==pin.configurable)return false;
 }
 return true;
}
let active=null;
const MAX_BYTES=16777216,MAX_ENTRIES=4096,MAX_TOKENS=200000;
function disable(){
 for(let frame=active;frame;frame=frame.parent){frame.disabled=true;if(frame.factories)apply(mapClear,frame.factories,[]);}
}
function eligible(frame){if(!frame||frame.disabled)return false;if(!ready()){disable();return false;}return true;}
function ordinaryData(descriptor){return !!(descriptor&&own(descriptor,'value')&&descriptor.enumerable&&descriptor.writable&&descriptor.configurable);}
function snapshot(value,source,budget){
 if(!value||typeof value!=='object'||proxy(value)||!array(value)||parent(value)!==arrayPrototype)return null;
 const length=field(value,'length');
 if(!length||!own(length,'value')||length.enumerable||length.configurable||!length.writable||typeof length.value!=='number'||length.value<0||length.value%1||length.value>MAX_TOKENS-budget.tokens)return null;
 const names=keys(value);if(names.length!==length.value+1||names[length.value]!=='length')return null;
 const seen=new SetClass(),rows=[];let bytes=128+source.length*2+length.value*16,last=0;if(bytes>MAX_BYTES-budget.bytes)return null;
 for(let at=0;at<length.value;at++){
  if(names[at]!==''+at)return null;const entry=field(value,names[at]);if(!ordinaryData(entry))return null;
  const token=entry.value;if(!token||typeof token!=='object'||proxy(token)||parent(token)!==objectPrototype||apply(setHas,seen,[token]))return null;
  apply(setAdd,seen,[token]);const names=keys(token);
  if(names.length!==4||names[0]!=='type'||names[1]!=='text'||names[2]!=='start'||names[3]!=='end')return null;
  const type=field(token,'type'),text=field(token,'text'),start=field(token,'start'),end=field(token,'end');
  if(!ordinaryData(type)||!ordinaryData(text)||!ordinaryData(start)||!ordinaryData(end)||typeof type.value!=='string'||typeof text.value!=='string'||typeof start.value!=='number'||typeof end.value!=='number'||start.value%1!==0||end.value%1!==0||start.value<last||end.value<=start.value||end.value>source.length||text.value!==apply(slice,source,[start.value,end.value]))return null;
  bytes+=192+2*(type.value.length+text.value.length);if(bytes>MAX_BYTES-budget.bytes)return null;
  rows[at]=freeze([type.value,text.value,start.value,end.value]);last=end.value;
 }
 return {rows:freeze(rows),bytes,tokens:length.value};
}
function fresh(data){
 const result=[];
 for(let at=0;at<data.rows.length;at++){const row=data.rows[at];result[at]={type:row[0],text:row[1],start:row[2],end:row[3]};}
 return result;
}
/** Each factory declares a new explicit first-result/reuse callback schedule.
 * The private identity includes BOTH this factory and its exact fallback;
 * public custom factories cannot address another factory's DATA table.
 */
const defaultOwner=()=>true;
export function createRustLexicalDataFactory(fallback,ownerState=defaultOwner,tailReplay=null){
 if(typeof fallback!=='function'||typeof ownerState!=='function'||tailReplay!==null&&typeof tailReplay!=='function')throw new TypeError('Rust lexical DATA factory needs function bindings');
 const identity={fallback,ownerState,tailReplay},admissible=!proxy(fallback)&&!proxy(ownerState)&&(tailReplay===null||!proxy(tailReplay));
 function ownerCurrent(){try{if(ownerState()&&ready())return true;}finally{if(!ready())disable();}disable();return false;}
 return function readRustLexicalData(source){
  const frame=active;
  if(!admissible||!eligible(frame)||typeof source!=='string')return fallback(source);
  if(!ownerCurrent())return fallback(source);
  if(tailReplay!==null&&source.length&&source[source.length-1]!=='\n'){try{return fallback(source);}finally{if(!ready())disable();else ownerCurrent();}}
  if(source.length*2+128>MAX_BYTES-frame.budget.bytes||frame.budget.entries>=MAX_ENTRIES){disable();return fallback(source);}
  let table=apply(mapGet,frame.factories,[identity]);
  const cached=table&&apply(mapGet,table,[source]);
  if(cached){const result=fresh(cached);if(eligible(frame)&&ownerCurrent()){if(tailReplay!==null)tailReplay(source);if(eligible(frame)&&ownerCurrent())return result;}return fallback(source);}
  // Errors are propagated directly and are never admitted. The first actual
  // result remains the original object; only a detached immutable copy stays.
  let result;try{result=fallback(source);}finally{if(!ready())disable();}
  if(frame!==active||!eligible(frame)||!ownerCurrent())return result;
  if(frame.budget.entries>=MAX_ENTRIES){disable();return result;}
  const data=snapshot(result,source,frame.budget);
  if(!eligible(frame)||!ownerCurrent())return result;
  if(!data)return result;
  table=apply(mapGet,frame.factories,[identity]);
  if(!table){table=new MapClass();apply(mapSet,frame.factories,[identity,table]);}
  apply(mapSet,table,[source,data]);frame.budget.bytes+=data.bytes;frame.budget.tokens+=data.tokens;frame.budget.entries++;
  return result;
 };
}
function synchronousResult(value){
 if(value===null||typeof value!=='object'&&typeof value!=='function')return true;
 if(proxy(value)||promise(value))return false;
 let at=value;
 // Inspect only descriptors, never then/stack getters or proxy operations.
 for(let depth=0;at!==null&&depth<64;depth++){
  if(proxy(at)||field(at,'then'))return false;at=parent(at);
 }
 return at===null;
}
export function withRustLexicalDataScope(run){
 if(typeof run!=='function'||proxy(run)||asyncFunction(run)||generatorFunction(run))throw new TypeError('Rust lexical DATA scope needs a synchronous ordinary callback');
 const prior=active,available=ready(),frame={parent:prior,factories:available?new MapClass():null,disabled:!available,budget:prior?prior.budget:{bytes:0,tokens:0,entries:0}};
 active=frame;if(!available)disable();
 try{const value=run();if(!synchronousResult(value))throw new TypeError('Rust lexical DATA scope cannot return a Promise, proxy or thenable');return value;}
 finally{if(!ready())disable();if(frame.factories)apply(mapClear,frame.factories,[]);frame.disabled=true;frame.parent=null;active=prior;}
}

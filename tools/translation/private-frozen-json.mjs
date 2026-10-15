// Storage-only bytes for authenticated owners' immutable comparison operands.
// This helper grants no source/checker/namespace authority. Callers must perform
// their private owner join first; every ineligible case runs normal stringify.
import {types} from 'node:util';
import {originalNamespaceTraversalIntrinsicsUnchanged} from './original-json-intrinsics.mjs';
import {originalLexingIntrinsicsUnchanged} from './original-lexing-intrinsics.mjs';
const enabled=originalNamespaceTraversalIntrinsicsUnchanged()&&originalLexingIntrinsicsUnchanged();
const descriptor=enabled?Object.getOwnPropertyDescriptor:null,descriptors=enabled?Object.getOwnPropertyDescriptors:null,prototype=enabled?Object.getPrototypeOf:null,own=enabled?Object.hasOwn:null,keys=enabled?Reflect.ownKeys:null,apply=enabled?Reflect.apply:null,isProxy=enabled?types.isProxy:null,isArray=enabled?Array.isArray:null;
const functionPrototype=enabled?prototype(function(){}):null,textField=enabled?descriptor(functionPrototype,'toString'):null;
const frozenField=enabled?descriptor(Object,'isFrozen'):null;
const native=(value,name)=>typeof value==='function'&&!isProxy(value)&&apply(textField.value,value,[])===`function ${name}() { [native code] }`;
const qualified=!!(enabled&&textField&&own(textField,'value')&&frozenField&&own(frozenField,'value')&&native(frozenField.value,'isFrozen'));
const objectPrototype=qualified?Object.prototype:null,arrayPrototype=qualified?Array.prototype:null;
const weakGet=qualified?WeakMap.prototype.get:null,weakSet=qualified?WeakMap.prototype.set:null,mapGet=qualified?Map.prototype.get:null,mapSet=qualified?Map.prototype.set:null,mapDelete=qualified?Map.prototype.delete:null,mapEntries=qualified?Map.prototype.entries:null,setHas=qualified?Set.prototype.has:null,setAdd=qualified?Set.prototype.add:null,setDelete=qualified?Set.prototype.delete:null;
const weakConstructor=qualified?WeakMap:null,setConstructor=qualified?Set:null;
const storage=qualified?new Map():null,iteratorPrototype=qualified?prototype(apply(mapEntries,storage,[])):null,next=qualified?descriptor(iteratorPrototype,'next').value:null;
const ENTRY_BYTES=4194304,TOTAL_BYTES=8388608,ENTRIES=16,CELLS=200000,DEPTH=160;
let retainedBytes=0,entries=0,hits=0,misses=0,captures=0,evictions=0;
function intrinsics(){
 if(!qualified||!originalNamespaceTraversalIntrinsicsUnchanged()||!originalLexingIntrinsicsUnchanged())return false;
 const actual=descriptor(Object,'isFrozen');return !!actual&&own(actual,'value')&&actual.value===frozenField.value&&actual.writable===frozenField.writable&&actual.enumerable===frozenField.enumerable&&actual.configurable===frozenField.configurable;
}
function immutableJson(value){
 let stack={value,depth:0,exit:false,next:null},cells=CELLS;const active=new setConstructor();
 while(stack){const frame=stack;stack=frame.next;const value=frame.value;
  if(frame.exit){apply(setDelete,active,[value]);continue;}
  if(--cells<0||frame.depth>DEPTH)return false;
  if(value===null||value===undefined||typeof value==='string'||typeof value==='number'||typeof value==='boolean')continue;
  if(typeof value!=='object'||isProxy(value)||apply(setHas,active,[value])||!apply(frozenField.value,Object,[value]))return false;
  const proto=prototype(value),array=isArray(value);if(proto!==objectPrototype&&proto!==null&&!(array&&proto===arrayPrototype))return false;
  const fields=descriptors(value),names=keys(fields);if(own(fields,'toJSON'))return false;
  if(array){if(!own(fields,'length'))return false;const length=fields.length.value;if(length<0||length>cells||names.length!==length+1)return false;for(let at=0;at<length;at++)if(!own(fields,at))return false;}
  for(let at=0;at<names.length;at++){const key=names[at],field=fields[key];if(typeof key!=='string'||!own(field,'value')||!field.enumerable&&!(array&&key==='length'))return false;}
  apply(setAdd,active,[value]);stack={value,depth:frame.depth,exit:true,next:stack};
  for(let at=names.length-1;at>=0;at--){const key=names[at];if(array&&key==='length')continue;stack={value:fields[key].value,depth:frame.depth+1,exit:false,next:stack};}
 }
 return true;
}
function retire(state){if(!state.active)return;apply(mapDelete,storage,[state]);retainedBytes-=state.bytes;entries--;state.active=false;state.encoded=null;if(evictions<9007199254740991)evictions++;}
function remember(state){apply(mapSet,storage,[state,state]);retainedBytes+=state.bytes;entries++;}
export function createPrivateFrozenJsonCache(){
 const values=qualified?new weakConstructor():null;
 return value=>{
  if(!intrinsics()||value===null||typeof value!=='object')return JSON.stringify(value);
  const prior=apply(weakGet,values,[value]);if(prior?.active){apply(mapDelete,storage,[prior]);apply(mapSet,storage,[prior,prior]);if(hits<9007199254740991)hits++;return prior.encoded;}
  if(misses<9007199254740991)misses++;
  if(!immutableJson(value))return JSON.stringify(value);
  const encoded=JSON.stringify(value);if(typeof encoded!=='string'||encoded.length*2+128>ENTRY_BYTES||!intrinsics())return encoded;
  // No issuer/root is held by global bookkeeping. Weak owner keys may vanish;
  // bounded encoded bytes survive at most until ordinary global eviction.
  const state={encoded,bytes:encoded.length*2+128,active:true};let removed=0;
  while(entries>=ENTRIES||retainedBytes+state.bytes>TOTAL_BYTES){if(removed++>=ENTRIES)return encoded;const cursor=apply(mapEntries,storage,[]),first=apply(next,cursor,[]);if(first.done)return encoded;const before=entries;retire(first.value[0]);if(entries>=before)return encoded;}
  remember(state);apply(weakSet,values,[value,state]);if(captures<9007199254740991)captures++;return encoded;
 };
}
// Bounded scalar diagnostics only; mutating this returned copy grants nothing.
export function privateFrozenJsonCacheFacts(){return {available:intrinsics(),entries,retainedBytes,hits,misses,captures,evictions,limits:{entryBytes:ENTRY_BYTES,bytes:TOTAL_BYTES,entries:ENTRIES,cells:CELLS,depth:DEPTH}};}

// Consumer-local validation snapshots, never source or checker authority.
// Mutable roots are re-read; only identical deeply frozen descendants can skip
// descriptor traversal. Every successful call still performs the actual hash.
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {copyMetadata,metadataDigest} from './extensions/source-links.mjs';
import {originalJsonIntrinsicsUnchanged} from './original-json-intrinsics.mjs';
const descriptor=Object.getOwnPropertyDescriptor,descriptors=Object.getOwnPropertyDescriptors,prototype=Object.getPrototypeOf,keys=Reflect.ownKeys,own=Object.hasOwn,isArray=Array.isArray,isFrozen=Object.isFrozen,apply=Reflect.apply,functionText=Function.prototype.toString;
const objectPrototype=Object.prototype,arrayPrototype=Array.prototype,isProxy=types.isProxy;
const required=[
 [Object,'getOwnPropertyDescriptor'],[Object,'getOwnPropertyDescriptors'],[Object,'getPrototypeOf'],[Object,'hasOwn'],[Object,'keys'],[Object,'create'],[Object,'defineProperty'],[Object,'isFrozen'],[Object,'freeze'],[globalThis,'String'],[globalThis,'Number'],
 [Reflect,'ownKeys'],[Reflect,'apply'],[Function.prototype,'toString'],[Array.prototype,Symbol.iterator,'values'],[Array,'isArray'],[Array.prototype,'push'],[Array.prototype,'sort'],[Set.prototype,'has'],[Set.prototype,'add'],[Set.prototype,'delete'],[Map.prototype,'get'],[Map.prototype,'set'],[Map.prototype,'delete'],[Map.prototype,'forEach'],[WeakMap.prototype,'get'],[WeakMap.prototype,'set'],[Buffer,'byteLength'],[BigInt.prototype,'toString'],[types,'isProxy'],[Number,'isSafeInteger'],[WeakRef.prototype,'deref'],[globalThis,'WeakRef'],[globalThis,'WeakMap'],[globalThis,'Map'],[globalThis,'Set'],
];
const bufferGlobal=descriptor(globalThis,'Buffer'),bigintPrototype=BigInt.prototype,weakDeref=WeakRef.prototype.deref;
const mapSize=descriptor(Map.prototype,'size'),reflectGlobal=descriptor(globalThis,'Reflect');
let arrayIteratorPrototype=null;try{arrayIteratorPrototype=prototype(apply(Array.prototype[Symbol.iterator],[],[]));}catch{}
if(arrayIteratorPrototype)required[required.length]=[arrayIteratorPrototype,'next'];
const pins=[];for(let index=0;index<required.length;index++){const owner=required[index][0],key=required[index][1];pins[index]={owner,key,name:required[index][2]??key,field:descriptor(owner,key)};}
const native=(fn,name)=>typeof fn==='function'&&!isProxy(fn)&&apply(functionText,fn,[])===`function ${name}() { [native code] }`;
// SameValue needs no mutable host callback or pre-import Object.is identity.
const sameValue=(left,right)=>left===right?(left!==0||1/left===1/right):(left!==left&&right!==right);
let initiallyNative=!!mapSize&&native(mapSize.get,'get size');for(let index=0;index<pins.length;index++){const pin=pins[index];if(!pin.field||!own(pin.field,'value')||!native(pin.field.value,pin.name))initiallyNative=false;}
// Same-name natives from another collection are not interchangeable. These
// probes execute only after native qualification and use no caller values.
function collectionsAgree(){try{const key={},value={},map=new Map(),set=new Set(),weak=new WeakMap();let visits=0;if(map.set(key,value)!==map||map.get(key)!==value||map.size!==1)return false;map.forEach((item,entry,owner)=>{if(item!==value||entry!==key||owner!==map)throw new TypeError('collection identity');visits++;});if(visits!==1||!map.delete(key)||map.size!==0)return false;if(set.add(key)!==set||!set.has(key)||!set.delete(key)||set.has(key))return false;if(weak.set(key,value)!==weak||weak.get(key)!==value)return false;const iterator=[key][Symbol.iterator](),first=iterator.next(),last=iterator.next();return first.value===key&&first.done===false&&last.done===true&&apply(weakDeref,new WeakRef(key),[])===key;}catch{return false;}}
if(initiallyNative&&!collectionsAgree())initiallyNative=false;
const captures=new WeakMap(),entries=new Map();let retainedBytes=0;
// Bounded scalar diagnostics cannot select, validate or retain an input.
const diagnostics={captureAttempts:0,captureDisabled:0,captureIssued:0,snapshotRefusals:0,canonicalOverEntry:0,largestCanonicalCodeUnits:0,evictions:0,peakEntries:0,peakRetainedBytes:0,validationAttempts:0,validationDisabled:0,validationNoToken:0,validationEvicted:0,validationRefreshed:0,validationMismatch:0,validationFast:0};
const count=name=>{if(diagnostics[name]<9007199254740991)diagnostics[name]++;};
export const ORIGINAL_METHOD_VALIDATION_LIMITS=Object.freeze({entryBytes:1048576,bytes:8388608,entries:64,cells:200000,metadataBytes:4194304,depth:160});
function intrinsics(){
 if(!initiallyNative||!originalJsonIntrinsicsUnchanged()||descriptor(bigintPrototype,'toJSON'))return false;
 const reflect=descriptor(globalThis,'Reflect');if(!reflect||!own(reflect,'value')||reflect.value!==reflectGlobal.value)return false;
 const size=descriptor(Map.prototype,'size');if(!size||!own(size,'get')||size.get!==mapSize.get||size.set!==mapSize.set||size.enumerable!==mapSize.enumerable||size.configurable!==mapSize.configurable)return false;
 const buffer=descriptor(globalThis,'Buffer');if(!buffer||!own(buffer,'value')||!bufferGlobal||!own(bufferGlobal,'value')||buffer.value!==bufferGlobal.value)return false;
 for(let index=0;index<pins.length;index++){const pin=pins[index],actual=descriptor(pin.owner,pin.key);if(!actual||!own(actual,'value')||actual.value!==pin.field.value||actual.writable!==pin.field.writable||actual.enumerable!==pin.field.enumerable||actual.configurable!==pin.field.configurable)return false;}
 return true;
}
export const originalMethodValidationIntrinsicsUnchanged=intrinsics;
export function originalMethodValidationStorageFacts(){return Object.freeze({entries:entries.size,retainedBytes,limits:ORIGINAL_METHOD_VALIDATION_LIMITS,diagnostics:Object.freeze({...diagnostics})});}
export function originalMethodValidationRuntimeFacts(){return Object.freeze({available:intrinsics(),initialNative:[...pins.map(pin=>({operation:String(pin.name),native:!!pin.field&&own(pin.field,'value')&&native(pin.field.value,pin.name)})),{operation:'Map.size getter',native:!!mapSize&&native(mapSize.get,'get size')}]});}
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const serialized=copy=>JSON.stringify(copy,(_,item)=>typeof item==='bigint'?{$integer:item.toString()}:item);
function oldestEntry(){let first,found=false;entries.forEach((_,key)=>{if(!found){first=key;found=true;}});return first;}
function discard(token){const state=entries.get(token);if(!state)return;count('evictions');retainedBytes-=state.retainedBytes;entries.delete(token);state.active=false;state.root=null;state.snapshot=null;state.serialized=null;}
// The bounded LRU owns only WeakRefs to inputs; no ambient finalizer callback. 
function capture(value,canonical){
 let retained=canonical.length*2;const active=new Set(),frozenNodes=new WeakMap();
 function visit(actual,copy,depth){
  if(depth>160)throw new TypeError('snapshot depth');
  if(!actual||typeof actual!=='object'){if(!sameValue(actual,copy))throw new TypeError('snapshot value');const bytes=typeof actual==='string'?Buffer.byteLength(actual):0;retained+=16;if(retained>ORIGINAL_METHOD_VALIDATION_LIMITS.entryBytes)throw new TypeError('snapshot size');return {scalar:true,value:actual,cells:1,bytes,height:0,frozen:true};}
  if(isProxy(actual)||active.has(actual))throw new TypeError('snapshot object');
  const prior=frozenNodes.get(actual);if(prior)return prior;
  const proto=prototype(actual);if(proto!==objectPrototype&&proto!==null&&proto!==arrayPrototype)throw new TypeError('snapshot prototype');
  const fields=descriptors(actual),rawKeys=keys(fields),orderedKeys=keys(copy),array=isArray(actual);if(array!==isArray(copy)||rawKeys.length!==orderedKeys.length)throw new TypeError('snapshot shape');
  for(let index=0;index<rawKeys.length;index++){const key=rawKeys[index];const field=fields[key];if(typeof key!=='string'||!own(field,'value')||(!field.enumerable&&!(array&&key==='length')))throw new TypeError('snapshot descriptor');}
  const children=[];let cells=1,bytes=0,height=0,deepFrozen=isFrozen(actual);active.add(actual);
  for(let index=0;index<orderedKeys.length;index++){const key=orderedKeys[index];if(array&&key==='length')continue;const field=fields[key];if(!field)throw new TypeError('snapshot field');const child=visit(field.value,copy[key],depth+1);children.push([key,child]);cells+=child.cells;bytes+=child.bytes;if(child.height+1>height)height=child.height+1;deepFrozen&&=child.frozen;}
  active.delete(actual);retained+=128+rawKeys.length*24;if(retained>ORIGINAL_METHOD_VALIDATION_LIMITS.entryBytes||cells>200000||bytes>4194304||depth+height>160)throw new TypeError('snapshot bounds');
  const node={scalar:false,reference:new WeakRef(actual),proto,keys:rawKeys,children,array,length:array?fields.length.value:null,cells,bytes,height,frozen:deepFrozen};if(deepFrozen)frozenNodes.set(actual,node);return node;
 }
 const snapshot=visit(value,canonical.copy,0);return {snapshot,retainedBytes:retained};
}
function matches(value,state){
 const active=new Set(),budget={cells:200000,bytes:4194304};
 function visit(actual,node,depth){
  if(depth>160)return false;
  if(node.frozen&&(node.scalar?sameValue(actual,node.value):(actual!==null&&typeof actual==='object'&&actual===apply(weakDeref,node.reference,[])))){budget.cells-=node.cells;budget.bytes-=node.bytes;return budget.cells>=0&&budget.bytes>=0&&depth+node.height<=160;}
  if(--budget.cells<0)return false;
  if(!actual||typeof actual!=='object'){if(!node.scalar)return false;if(typeof actual==='string'){budget.bytes-=Buffer.byteLength(actual);if(budget.bytes<0)return false;}return sameValue(actual,node.value);}
  if(node.scalar||isProxy(actual)||active.has(actual)||prototype(actual)!==node.proto||isArray(actual)!==node.array)return false;
  const fields=descriptors(actual),actualKeys=keys(fields);if(actualKeys.length!==node.keys.length)return false;
  for(let index=0;index<actualKeys.length;index++){const key=actualKeys[index],field=fields[key];if(key!==node.keys[index]||typeof key!=='string'||!own(field,'value')||(!field.enumerable&&!(node.array&&key==='length')))return false;}
  if(node.array&&(fields.length.value!==node.length||!Number.isSafeInteger(fields.length.value)||fields.length.value<0||fields.length.value>budget.cells||actualKeys.length!==fields.length.value+1))return false;
  active.add(actual);for(let index=0;index<node.children.length;index++){const child=node.children[index];if(!visit(fields[child[0]].value,child[1],depth+1)){active.delete(actual);return false;}}active.delete(actual);return true;
 }
 return value===apply(weakDeref,state.root,[])&&visit(value,state.snapshot,0);
}
// Called at the exact old metadataDigest issuance point. Hash callbacks occur
// once with the same canonical bytes, even when capture is disabled or evicted.
export function captureOriginalMethodValidation(value){
 count('captureAttempts');if(!value||typeof value!=='object'||!intrinsics()){count('captureDisabled');return {digest:metadataDigest(value),capture:null};}
 const copy=copyMetadata(value),canonical=serialized(copy);if(canonical.length>diagnostics.largestCanonicalCodeUnits)diagnostics.largestCanonicalCodeUnits=canonical.length;if(canonical.length*2>ORIGINAL_METHOD_VALIDATION_LIMITS.entryBytes)count('canonicalOverEntry');let candidate=null;
 try{candidate=capture(value,{copy,length:canonical.length});}catch{count('snapshotRefusals');candidate=null;}
 const digest=hash(canonical);if(!candidate||!intrinsics())return {digest,capture:null};
 const token=Object.freeze({}),state={...candidate,root:new WeakRef(value),serialized:canonical,active:true};
 let evictions=0;while(entries.size>=ORIGINAL_METHOD_VALIDATION_LIMITS.entries||retainedBytes+state.retainedBytes>ORIGINAL_METHOD_VALIDATION_LIMITS.bytes){if(evictions++>=ORIGINAL_METHOD_VALIDATION_LIMITS.entries)return {digest,capture:null};let oldest;const before=entries.size;try{oldest=oldestEntry();if(oldest===undefined)return {digest,capture:null};discard(oldest);}catch{return {digest,capture:null};}if(entries.size>=before)return {digest,capture:null};}
 const bookkeeping=Object.freeze({});entries.set(bookkeeping,state);retainedBytes+=state.retainedBytes;captures.set(token,{state,bookkeeping,root:state.root});count('captureIssued');if(entries.size>diagnostics.peakEntries)diagnostics.peakEntries=entries.size;if(retainedBytes>diagnostics.peakRetainedBytes)diagnostics.peakRetainedBytes=retainedBytes;return {digest,capture:token};
}
export function originalMethodValidationDigest(value,token){
 count('validationAttempts');if(!intrinsics()){count('validationDisabled');return metadataDigest(value);}
 const issued=token&&captures.get(token),state=issued?.state;
 if(state?.active&&matches(value,state)){count('validationFast');entries.delete(issued.bookkeeping);entries.set(issued.bookkeeping,state);return hash(state.serialized);}
 count(!state?'validationNoToken':!state.active?'validationEvicted':'validationMismatch');
 // Eviction drops the large snapshot, not the genuine token's weak origin.
 // Recovery performs the complete fresh original copy/canonical/hash once.
 // Consumers still compare this returned digest to their original signed one.
 if(state&&!state.active&&value!==null&&typeof value==='object'&&value===apply(weakDeref,issued.root,[])){
  const fresh=captureOriginalMethodValidation(value);if(fresh.capture){captures.set(token,captures.get(fresh.capture));count('validationRefreshed');}return fresh.digest;
 }
 return metadataDigest(value);
}

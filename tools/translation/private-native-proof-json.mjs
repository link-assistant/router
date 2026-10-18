// Explicit stateless proof-DATA serialization; never source/owner authority.
// The legacy composer and its caches, counters and defaults remain unchanged.
import {types} from 'node:util';
import {createPrivateFrozenJsonComposer} from './private-frozen-json.mjs';
import {originalBatchedNamespaceTraversalIntrinsicsUnchanged} from './original-json-intrinsics.mjs';
import {originalBatchedLexingIntrinsicsUnchanged} from './original-lexing-intrinsics.mjs';

// This NEW internal format uses fixed ordinary intrinsic owners. It neither
// reflects on the mutable globalThis binding nor assumes Bun's global is plain.
// Bootstrap remains conservative; no captured owner or native function escapes.
const initiallyNative=originalBatchedNamespaceTraversalIntrinsicsUnchanged()&&originalBatchedLexingIntrinsicsUnchanged();
const get=initiallyNative?Object.getOwnPropertyDescriptor:null,has=initiallyNative?Object.hasOwn:null,ownKeys=initiallyNative?Reflect.ownKeys:null,apply=initiallyNative?Reflect.apply:null,parent=initiallyNative?Object.getPrototypeOf:null;
const objectOwner=initiallyNative?Object:null,arrayOwner=initiallyNative?Array:null,jsonOwner=initiallyNative?JSON:null,bufferOwner=initiallyNative?ArrayBuffer:null,setOwner=initiallyNative?Set:null,typeOwner=initiallyNative?types:null;
const isProxy=initiallyNative?types.isProxy:null,isArray=initiallyNative?Array.isArray:null;
const ownersOrdinary=!!(initiallyNative&&objectOwner&&arrayOwner&&jsonOwner&&bufferOwner&&setOwner&&typeOwner&&!isProxy(typeOwner)&&!isProxy(objectOwner)&&!isProxy(arrayOwner)&&!isProxy(jsonOwner)&&!isProxy(bufferOwner)&&!isProxy(setOwner));
const data=field=>field&&has(field,'value')?field.value:undefined;
const objectPrototypeField=ownersOrdinary?get(objectOwner,'prototype'):null,arrayPrototypeField=ownersOrdinary?get(arrayOwner,'prototype'):null,setPrototypeField=ownersOrdinary?get(setOwner,'prototype'):null;
const objectPrototype=data(objectPrototypeField),arrayPrototype=data(arrayPrototypeField),setPrototype=data(setPrototypeField),functionPrototype=ownersOrdinary?parent(function(){}):null;
const textField=ownersOrdinary?get(functionPrototype,'toString'):null,boxedField=ownersOrdinary?get(typeOwner,'isBoxedPrimitive'):null,isViewField=ownersOrdinary?get(bufferOwner,'isView'):null;
const stringifyField=ownersOrdinary?get(jsonOwner,'stringify'):null,isArrayField=ownersOrdinary?get(arrayOwner,'isArray'):null,proxyField=ownersOrdinary?get(typeOwner,'isProxy'):null;
const native=(field,name)=>!!(field&&has(field,'value')&&typeof field.value==='function'&&!isProxy(field.value)&&parent(field.value)===functionPrototype&&apply(textField.value,field.value,[])===`function ${name}() { [native code] }`);
const setHasField=setPrototype&&!isProxy(setPrototype)?get(setPrototype,'has'):null,setAddField=setPrototype&&!isProxy(setPrototype)?get(setPrototype,'add'):null,setDeleteField=setPrototype&&!isProxy(setPrototype)?get(setPrototype,'delete'):null;
const qualified=!!(ownersOrdinary&&objectPrototype&&arrayPrototype&&setPrototype&&!isProxy(objectPrototype)&&!isProxy(arrayPrototype)&&!isProxy(setPrototype)&&textField&&has(textField,'value')&&native({value:get},'getOwnPropertyDescriptor')&&native({value:has},'hasOwn')&&native({value:ownKeys},'ownKeys')&&native({value:apply},'apply')&&native({value:parent},'getPrototypeOf')&&native({value:setOwner},'Set')&&native(boxedField,'isBoxedPrimitive')&&native(isViewField,'isView')&&native(stringifyField,'stringify')&&native(isArrayField,'isArray')&&native(proxyField,'isProxy')&&native(setHasField,'has')&&native(setAddField,'add')&&native(setDeleteField,'delete'));
const setHas=data(setHasField),setAdd=data(setAddField),setDelete=data(setDeleteField);
const CELLS=200000,DEPTH=160,UNITS=8388608;
function sameField(actual,expected){return !!(actual&&expected&&has(actual,'value')&&has(expected,'value')&&actual.value===expected.value&&actual.writable===expected.writable&&actual.enumerable===expected.enumerable&&actual.configurable===expected.configurable);}
function nativeReady(){
 // Identity inspection of the live util import precedes all owner reflection.
 // All reflected receivers below are fixed ordinary captured native owners.
 if(!qualified||types!==typeOwner)return false;
 if(!sameField(get(typeOwner,'isProxy'),proxyField)||!sameField(get(typeOwner,'isBoxedPrimitive'),boxedField)||!sameField(get(bufferOwner,'isView'),isViewField)||!sameField(get(jsonOwner,'stringify'),stringifyField)||!sameField(get(arrayOwner,'isArray'),isArrayField))return false;
 if(!sameField(get(objectOwner,'prototype'),objectPrototypeField)||!sameField(get(arrayOwner,'prototype'),arrayPrototypeField)||!sameField(get(setOwner,'prototype'),setPrototypeField))return false;
 if(parent(objectPrototype)!==null||parent(arrayPrototype)!==objectPrototype||get(objectPrototype,'toJSON')||get(arrayPrototype,'toJSON'))return false;
 return sameField(get(setPrototype,'has'),setHasField)&&sameField(get(setPrototype,'add'),setAddField)&&sameField(get(setPrototype,'delete'),setDeleteField);
}
function withinNativeBudget(value){
 let cells=0,units=0;
 const active=new setOwner();
 const charge=count=>{units+=count;return units<=UNITS;};
 function visit(value,depth){
  if(++cells>CELLS||depth>DEPTH)return false;
  if(value===null)return charge(4);
  const kind=typeof value;
  // Worst-case JSON escaping costs six UTF16 units per input code unit. No
  // character scan, replacement string or native scalar quotation is needed.
  if(kind==='string')return charge(value.length*6+2);
  if(kind==='boolean')return charge(5);
  // Nested optional DATA uses native object omission / dense-array null.
  // Four units conservatively covers either result; root undefined stays old.
  if(kind==='undefined')return depth>0&&charge(4);
  // Every finite binary64 JSON spelling fits this conservative bound; NaN and
  // infinities are null. Primitive -0 remains the native spelling 0.
  if(kind==='number')return charge(32);
  if(kind!=='object'||isProxy(value)||apply(boxedField.value,typeOwner,[value])||apply(isViewField.value,bufferOwner,[value])||apply(setHas,active,[value]))return false;
  const array=isArray(value),owner=parent(value);
  if(owner!==(array?arrayPrototype:objectPrototype)&&!(owner===null&&!array))return false;
  const names=ownKeys(value);if(names.length>CELLS+1)return false;
  // A native lazy stack must be rejected before ANY descriptor materializes it.
  for(let at=0;at<names.length;at++)if(typeof names[at]!=='string'||names[at]==='stack'||names[at]==='toJSON'||names[at]==='rawJSON')return false;
  let length=names.length;
  if(array){const field=get(value,'length');if(!field||!has(field,'value')||field.enumerable||field.value<0||field.value%1||field.value>CELLS||names.length!==field.value+1||names[names.length-1]!=='length')return false;length=field.value;for(let at=0;at<length;at++)if(names[at]!==''+at)return false;}
  if(!charge(2+(length?length-1:0)))return false;
  // Finish the whole own-data census before descending. ownKeys returned a
  // fresh private native array: its existing indexed slots are own writable
  // data, never exposed to callbacks. Reuse those slots for child values; no
  // second descriptor lookup or separately allocated field/child plan is needed.
  for(let at=0;at<length;at++){
   const name=names[at],field=get(value,name);
   if(!field||!has(field,'value')||!field.enumerable||!array&&!charge(name.length*6+3))return false;
   names[at]=field.value;
  }
  apply(setAdd,active,[value]);
  for(let at=0;at<length;at++)if(!visit(names[at],depth+1))return false;
  apply(setDelete,active,[value]);return true;
 }
 return visit(value,0);
}
/** A NEW internal serialization/warming contract, with identical JSON bytes.
 * Unknown values and altered required intrinsic owners invoke the old composer.
 * Global binding lookup and legacy measurement/cache warming are NOT replayed
 * on native success. This explicit format promises bytes, not those old tapes.
 * Eligible own DATA cannot invoke callbacks between census and native encode.
 * A miss adds only captured callback-free reflection before the real old tail.
 * No source/owner fact, result bytes or current eligibility verdict is cached.
 */
export function createPrivateNativeProofJsonSerializer(){
 const fallback=createPrivateFrozenJsonComposer();
 return function serializeProofData(value){
  if(nativeReady()){
   let selected=false;try{selected=withinNativeBudget(value);}catch{}
   if(selected)return apply(stringifyField.value,jsonOwner,[value]);
  }
  return fallback(value);
 };
}

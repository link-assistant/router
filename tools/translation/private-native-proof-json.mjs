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
const objectOwner=initiallyNative?Object:null,arrayOwner=initiallyNative?Array:null,jsonOwner=initiallyNative?JSON:null,bufferOwner=initiallyNative?ArrayBuffer:null,setOwner=initiallyNative?Set:null,weakOwner=initiallyNative?WeakMap:null,mapOwner=initiallyNative?Map:null,typeOwner=initiallyNative?types:null;
const isProxy=initiallyNative?types.isProxy:null,isArray=initiallyNative?Array.isArray:null;
const ownersOrdinary=!!(initiallyNative&&objectOwner&&arrayOwner&&jsonOwner&&bufferOwner&&setOwner&&weakOwner&&mapOwner&&typeOwner&&!isProxy(mapOwner)&&!isProxy(weakOwner)&&!isProxy(typeOwner)&&!isProxy(objectOwner)&&!isProxy(arrayOwner)&&!isProxy(jsonOwner)&&!isProxy(bufferOwner)&&!isProxy(setOwner));
const data=field=>field&&has(field,'value')?field.value:undefined;
const objectPrototypeField=ownersOrdinary?get(objectOwner,'prototype'):null,arrayPrototypeField=ownersOrdinary?get(arrayOwner,'prototype'):null,setPrototypeField=ownersOrdinary?get(setOwner,'prototype'):null;
const objectPrototype=data(objectPrototypeField),arrayPrototype=data(arrayPrototypeField),setPrototype=data(setPrototypeField),functionPrototype=ownersOrdinary?parent(function(){}):null;
const textField=ownersOrdinary?get(functionPrototype,'toString'):null,boxedField=ownersOrdinary?get(typeOwner,'isBoxedPrimitive'):null,isViewField=ownersOrdinary?get(bufferOwner,'isView'):null;
const stringifyField=ownersOrdinary?get(jsonOwner,'stringify'):null,isArrayField=ownersOrdinary?get(arrayOwner,'isArray'):null,proxyField=ownersOrdinary?get(typeOwner,'isProxy'):null;
const native=(field,name)=>!!(field&&has(field,'value')&&typeof field.value==='function'&&!isProxy(field.value)&&parent(field.value)===functionPrototype&&apply(textField.value,field.value,[])===`function ${name}() { [native code] }`);
const weakPrototypeField=ownersOrdinary?get(weakOwner,'prototype'):null,weakPrototype=data(weakPrototypeField),stringPrototype=ownersOrdinary?parent(''):null,regexpPrototype=ownersOrdinary?parent(/(?:)/):null;
const weakGetField=weakPrototype&&!isProxy(weakPrototype)?get(weakPrototype,'get'):null,weakSetField=weakPrototype&&!isProxy(weakPrototype)?get(weakPrototype,'set'):null,charCodeField=stringPrototype&&!isProxy(stringPrototype)?get(stringPrototype,'charCodeAt'):null;
const mapPrototypeField=ownersOrdinary?get(mapOwner,'prototype'):null,mapPrototype=data(mapPrototypeField);
const mapGetField=mapPrototype&&!isProxy(mapPrototype)?get(mapPrototype,'get'):null,mapSetField=mapPrototype&&!isProxy(mapPrototype)?get(mapPrototype,'set'):null;
const execField=regexpPrototype&&!isProxy(regexpPrototype)?get(regexpPrototype,'exec'):null;
const setHasField=setPrototype&&!isProxy(setPrototype)?get(setPrototype,'has'):null,setAddField=setPrototype&&!isProxy(setPrototype)?get(setPrototype,'add'):null,setDeleteField=setPrototype&&!isProxy(setPrototype)?get(setPrototype,'delete'):null;
const qualified=!!(ownersOrdinary&&objectPrototype&&arrayPrototype&&setPrototype&&!isProxy(objectPrototype)&&!isProxy(arrayPrototype)&&!isProxy(setPrototype)&&textField&&has(textField,'value')&&native({value:get},'getOwnPropertyDescriptor')&&native({value:has},'hasOwn')&&native({value:ownKeys},'ownKeys')&&native({value:apply},'apply')&&native({value:parent},'getPrototypeOf')&&native({value:setOwner},'Set')&&native(boxedField,'isBoxedPrimitive')&&native(isViewField,'isView')&&native(stringifyField,'stringify')&&native(isArrayField,'isArray')&&native(proxyField,'isProxy')&&native(setHasField,'has')&&native(setAddField,'add')&&native(setDeleteField,'delete')&&native({value:weakOwner},'WeakMap')&&native(weakGetField,'get')&&native(weakSetField,'set')&&native(charCodeField,'charCodeAt')&&native(execField,'exec')&&native({value:mapOwner},'Map')&&native(mapGetField,'get')&&native(mapSetField,'set'));
const setHas=data(setHasField),setAdd=data(setAddField),setDelete=data(setDeleteField),weakGet=data(weakGetField),weakSet=data(weakSetField),charCode=data(charCodeField),exec=data(execField),mapGet=data(mapGetField),mapSet=data(mapSetField);
const CELLS=200000,DEPTH=160,UNITS=8388608;
function sameField(actual,expected){return !!(actual&&expected&&has(actual,'value')&&has(expected,'value')&&actual.value===expected.value&&actual.writable===expected.writable&&actual.enumerable===expected.enumerable&&actual.configurable===expected.configurable);}
function nativeReady(){
 // Identity inspection of the live util import precedes all owner reflection.
 // All reflected receivers below are fixed ordinary captured native owners.
 if(!qualified||types!==typeOwner)return false;
 if(!sameField(get(typeOwner,'isProxy'),proxyField)||!sameField(get(typeOwner,'isBoxedPrimitive'),boxedField)||!sameField(get(bufferOwner,'isView'),isViewField)||!sameField(get(jsonOwner,'stringify'),stringifyField)||!sameField(get(arrayOwner,'isArray'),isArrayField))return false;
 if(!sameField(get(objectOwner,'prototype'),objectPrototypeField)||!sameField(get(arrayOwner,'prototype'),arrayPrototypeField)||!sameField(get(setOwner,'prototype'),setPrototypeField))return false;
 if(!sameField(get(mapOwner,'prototype'),mapPrototypeField)||!sameField(get(mapPrototype,'get'),mapGetField)||!sameField(get(mapPrototype,'set'),mapSetField))return false;
 if(parent(objectPrototype)!==null||parent(arrayPrototype)!==objectPrototype||get(objectPrototype,'toJSON')||get(arrayPrototype,'toJSON'))return false;
 if(!sameField(get(weakOwner,'prototype'),weakPrototypeField)||!sameField(get(weakPrototype,'get'),weakGetField)||!sameField(get(weakPrototype,'set'),weakSetField)||!sameField(get(stringPrototype,'charCodeAt'),charCodeField)||parent(regexpPrototype)!==objectPrototype||!sameField(get(regexpPrototype,'exec'),execField))return false;
 return sameField(get(setPrototype,'has'),setHasField)&&sameField(get(setPrototype,'add'),setAddField)&&sameField(get(setPrototype,'delete'),setDeleteField);
}
function withinNativeBudget(value){
 let cells=0,units=0,resultHeight=0;
 const nativeDescriptorData=parent(objectPrototypeField)===objectPrototype&&!get(objectPrototype,'writable');
 // Private dense native-call argument storage; both arrays have existing own
 // writable slots. Only slot values reach qualified natives, never the arrays.
 const unaryArgs=[null],binaryArgs=[null,null];
 // Fresh scalar measurements only; neither this map nor a record escapes the
 // callback-free scan. Logical occurrence costs are always charged again.
 const costs=new weakOwner(),unitBase=UNITS+1,heightBase=DEPTH+1;
 // Exact short-string costs only, bounded and discarded with this scan. Every
 // occurrence still pays its complete cost; no input/source verdict is stored.
 const quotedCosts=new mapOwner();let quotedEntries=0;
 const charge=count=>{if(count>UNITS-units)return false;units+=count;return true;};
 function quoted(value){
  if(value.length>UNITS-units-2)return false;
  const short=value.length<=128;
  if(short){const known=(unaryArgs[0]=value,apply(mapGet,quotedCosts,unaryArgs));if(known!==undefined)return charge(known);}
  // Native exec scans ordinary spans without a JS call per source unit.
  // Each fresh literal owns lastIndex; no regex or match array can escape.
  const special=/["\\\u0000-\u001f\ud800-\udfff]/g;let count=value.length+2,match;
  while((match=(unaryArgs[0]=value,apply(exec,special,unaryArgs)))!==null){
   const at=match.index,code=(unaryArgs[0]=at,apply(charCode,value,unaryArgs));
   if(code===34||code===92||code===8||code===9||code===10||code===12||code===13)count++;
   else if(code<32)count+=5;
   else if(code>=55296&&code<=56319){
    const next=at+1<value.length?(unaryArgs[0]=at+1,apply(charCode,value,unaryArgs)):-1;
    if(next>=56320&&next<=57343)special.lastIndex=at+2;else count+=5;
   }else count+=5;
   if(count>UNITS-units)return false;
  }
  if(!charge(count))return false;
  if(short&&quotedEntries<4096){(binaryArgs[0]=value,binaryArgs[1]=count,apply(mapSet,quotedCosts,binaryArgs));quotedEntries++;}
  return true;
 }
 function visit(value,depth){
  resultHeight=0;
  if(++cells>CELLS||depth>DEPTH)return false;
  if(value===null)return charge(4);
  const kind=typeof value;
  if(kind==='string')return quoted(value);
  if(kind==='boolean')return charge(5);
  // Undefined object properties/dense-array slots remain conservatively
  // charged, and root undefined still selects the original composer.
  if(kind==='undefined')return depth>0&&charge(4);
  if(kind==='number')return charge(32);
  if(kind!=='object'||isProxy(value)||(unaryArgs[0]=value,apply(boxedField.value,typeOwner,unaryArgs))||(unaryArgs[0]=value,apply(isViewField.value,bufferOwner,unaryArgs)))return false;
  const known=(unaryArgs[0]=value,apply(weakGet,costs,unaryArgs));
  if(known===0)return false;
  if(known!==undefined){
   const packed=known-1,height=packed%heightBase,quotient=(packed-height)/heightBase,knownUnits=quotient%unitBase,knownCells=(quotient-knownUnits)/unitBase;
   if(knownCells-1>CELLS-cells||knownUnits>UNITS-units||height>DEPTH-depth)return false;
   cells+=knownCells-1;units+=knownUnits;resultHeight=height;return true;
  }
  const cellsBefore=cells-1,unitsBefore=units;
  const array=isArray(value),owner=parent(value);
  if(owner!==(array?arrayPrototype:objectPrototype)&&!(owner===null&&!array))return false;
  const names=ownKeys(value);if(names.length>CELLS+1)return false;
  // A native lazy stack must be rejected before ANY descriptor materializes it.
  for(let at=0;at<names.length;at++)if(typeof names[at]!=='string'||names[at]==='stack'||names[at]==='toJSON'||names[at]==='rawJSON')return false;
  let length=names.length;
  if(array){const field=get(value,'length');if(!field||(nativeDescriptorData?field.writable===undefined:!has(field,'value'))||field.enumerable||field.value<0||field.value%1||field.value>CELLS||names.length!==field.value+1||names[names.length-1]!=='length')return false;length=field.value;for(let at=0;at<length;at++)if(names[at]!==''+at)return false;}
  if(!charge(2+(length?length-1:0)))return false;
  // Every descriptor precedes descent. Captured native ownKeys supplies a
  // fresh private array whose existing own slots can safely hold child values.
  for(let at=0;at<length;at++){
   const name=names[at],field=get(value,name);
   if(!field||(nativeDescriptorData?field.writable===undefined:!has(field,'value'))||!field.enumerable||!array&&(!quoted(name)||!charge(1)))return false;
   names[at]=field.value;
  }
  (binaryArgs[0]=value,binaryArgs[1]=0,apply(weakSet,costs,binaryArgs));let height=0;
  for(let at=0;at<length;at++){
   if(!visit(names[at],depth+1))return false;
   if(resultHeight+1>height)height=resultHeight+1;
  }
  (binaryArgs[0]=value,binaryArgs[1]=((cells-cellsBefore)*unitBase+(units-unitsBefore))*heightBase+height+1,apply(weakSet,costs,binaryArgs));
  resultHeight=height;return true;
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

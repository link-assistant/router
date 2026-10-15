// Reuse of privately computed JSON bytes is valid only under the same ordinary
// native serializer and plain-data prototype chains. This issues no authority.
import {types} from 'node:util';
const descriptor=Object.getOwnPropertyDescriptor,prototype=Object.getPrototypeOf,apply=Reflect.apply,keys=Reflect.ownKeys,hasOwn=Object.hasOwn;
const originalObject=Object,originalArray=Array,originalJson=JSON,objectPrototype=Object.prototype,arrayPrototype=Array.prototype;
const globalJson=descriptor(globalThis,'JSON'),globalObject=descriptor(globalThis,'Object'),globalArray=descriptor(globalThis,'Array'),stringify=descriptor(JSON,'stringify');
const functionText=Function.prototype.toString;
function snapshot(owner){const names=keys(owner),result=[];for(let index=0;index<names.length;index++)result[index]=[names[index],descriptor(owner,names[index])];return result;}
const mapPrototype=Map.prototype,setPrototype=Set.prototype,weakSetPrototype=WeakSet.prototype,arrayDescriptors=snapshot(arrayPrototype),mapDescriptors=snapshot(mapPrototype),setDescriptors=snapshot(setPrototype),weakSetDescriptors=snapshot(weakSetPrototype);
const globalMap=descriptor(globalThis,'Map'),globalSet=descriptor(globalThis,'Set'),globalWeakSet=descriptor(globalThis,'WeakSet'),species=descriptor(originalArray,Symbol.species);
const objectOperations=['keys','values','entries','fromEntries'],objectPins=[];for(let index=0;index<objectOperations.length;index++){const name=objectOperations[index];objectPins[index]=[name,descriptor(originalObject,name)];}
const objectHasOwn=descriptor(originalObject,'hasOwn'),objectDescriptor=descriptor(originalObject,'getOwnPropertyDescriptor');
const globalsAreData=globalJson&&hasOwn(globalJson,'value')&&globalJson.value===originalJson&&globalObject&&hasOwn(globalObject,'value')&&globalObject.value===originalObject&&globalArray&&hasOwn(globalArray,'value')&&globalArray.value===originalArray&&globalMap&&hasOwn(globalMap,'value')&&globalSet&&hasOwn(globalSet,'value');
const native=(fn,name)=>typeof fn==='function'&&!types.isProxy(fn)&&apply(functionText,fn,[])===`function ${name}() { [native code] }`;
function nativePrototype(entries,kind){for(let index=0;index<entries.length;index++){const key=entries[index][0],field=entries[index][1];if(hasOwn(field,'value')){if(typeof field.value!=='function')continue;const name=key==='constructor'?kind:key===Symbol.iterator?(kind==='Map'?'entries':'values'):kind==='Set'&&key==='keys'?'values':key;if(typeof name!=='string'||!native(field.value,name)&&!(kind==='Set'&&key==='keys'&&native(field.value,'keys')))return false;}else if(field.get!==undefined&&!native(field.get,'get '+String(key))||field.set!==undefined&&!native(field.set,'set '+String(key)))return false;}return true;}
let ordinaryNative=globalsAreData&&native(originalObject,'Object')&&native(originalArray,'Array')&&native(globalMap.value,'Map')&&native(globalSet.value,'Set')&&globalWeakSet&&hasOwn(globalWeakSet,'value')&&native(globalWeakSet.value,'WeakSet')&&stringify&&hasOwn(stringify,'value')&&native(stringify.value,'stringify')&&nativePrototype(arrayDescriptors,'Array')&&nativePrototype(mapDescriptors,'Map')&&nativePrototype(setDescriptors,'Set')&&nativePrototype(weakSetDescriptors,'WeakSet')&&species&&!hasOwn(species,'value')&&species.set===undefined&&native(species.get,'get [Symbol.species]');
for(let index=0;index<objectPins.length;index++){const name=objectPins[index][0],field=objectPins[index][1];if(!field||!hasOwn(field,'value')||!native(field.value,name))ordinaryNative=false;}

const iteratorPins=[];if(ordinaryNative)try{const owners=[arrayPrototype,mapPrototype,setPrototype],receivers=[[],new Map(),new Set()];for(let index=0;index<owners.length;index++){const iterator=apply(descriptor(owners[index],Symbol.iterator).value,receivers[index],[]),owner=prototype(iterator),field=descriptor(owner,'next');iteratorPins[index]={owner,field};if(!field||!hasOwn(field,'value')||!native(field.value,'next'))ordinaryNative=false;}}catch{ordinaryNative=false;}

// A native from a different collection can have the same name. Check receiver
// brands only after all operations used by these private probes qualify native.
if(ordinaryNative)try{const key={},value={},map=new Map(),set=new Set(),weak=new WeakSet();ordinaryNative=map.set(key,value)===map&&map.get(key)===value&&map.has(key)&&map.size===1&&map.delete(key)&&map.size===0&&set.add(key)===set&&set.has(key)&&set.size===1&&set.delete(key)&&set.size===0&&weak.add(key)===weak&&weak.has(key)&&weak.delete(key)&&!weak.has(key);}catch{ordinaryNative=false;}

// TypedArray and collection natives can share Array/Object method names while
// rejecting their receivers. These bounded probes see only private literals.
if(ordinaryNative)try{
 const input=[3,1],plain={key:7},array=value=>prototype(value)===arrayPrototype;
 const mapped=apply(arrayPrototype.map,input,[value=>value+1]),filtered=apply(arrayPrototype.filter,input,[value=>value>1]),flat=apply(arrayPrototype.flatMap,input,[value=>[value]]),slice=apply(arrayPrototype.slice,input,[0,1]);let visited=0;apply(arrayPrototype.forEach,input,[(value,index,owner)=>{if(owner!==input||index!==visited)throw new TypeError('array receiver');visited++;}]);
 ordinaryNative=array(mapped)&&mapped.length===2&&mapped[0]===4&&mapped[1]===2&&array(filtered)&&filtered.length===1&&filtered[0]===3&&array(flat)&&flat.length===2&&flat[0]===3&&flat[1]===1&&array(slice)&&slice.length===1&&slice[0]===3&&visited===2&&apply(arrayPrototype.find,input,[value=>value===1])===1&&apply(arrayPrototype.every,input,[value=>typeof value==='number'])===true&&apply(arrayPrototype.some,input,[value=>value===1])===true&&apply(arrayPrototype.includes,input,[3])===true&&apply(arrayPrototype.includes,input,['3'])===false&&apply(arrayPrototype.at,input,[0])===3&&apply(arrayPrototype.join,input,[':'])==='3:1';
 const names=originalObject.keys(plain),values=originalObject.values(plain),pairs=originalObject.entries(plain),record=originalObject.fromEntries([['key',7]]);ordinaryNative=ordinaryNative&&array(names)&&names.length===1&&names[0]==='key'&&array(values)&&values.length===1&&values[0]===7&&array(pairs)&&pairs.length===1&&array(pairs[0])&&pairs[0][0]==='key'&&pairs[0][1]===7&&prototype(record)===objectPrototype&&hasOwn(record,'key')&&record.key===7;
}catch{ordinaryNative=false;}

function same(actual,expected){if(!actual||!expected||hasOwn(actual,'value')!==hasOwn(expected,'value'))return false;return actual.enumerable===expected.enumerable&&actual.configurable===expected.configurable&&(hasOwn(expected,'value')?actual.value===expected.value&&actual.writable===expected.writable:hasOwn(actual,'get')&&hasOwn(actual,'set')&&hasOwn(expected,'get')&&hasOwn(expected,'set')&&actual.get===expected.get&&actual.set===expected.set);}
function samePrototype(owner,expectedDescriptors){const actual=keys(owner);if(actual.length!==expectedDescriptors.length)return false;for(let index=0;index<actual.length;index++){const entry=expectedDescriptors[index],key=entry[0],expected=entry[1];if(actual[index]!==key||!same(descriptor(owner,key),expected))return false;}return true;}
export function originalJsonIntrinsicsUnchanged(){
 if(!ordinaryNative)return false;for(let index=0;index<iteratorPins.length;index++){const pin=iteratorPins[index];if(!same(descriptor(pin.owner,'next'),pin.field))return false;}for(let index=0;index<objectPins.length;index++){const name=objectPins[index][0],field=objectPins[index][1];if(!same(descriptor(originalObject,name),field))return false;}
 return same(descriptor(originalArray,Symbol.species),species)&&same(descriptor(globalThis,'WeakSet'),globalWeakSet)&&samePrototype(weakSetPrototype,weakSetDescriptors)&&same(descriptor(globalThis,'JSON'),globalJson)&&same(descriptor(globalThis,'Object'),globalObject)&&same(descriptor(globalThis,'Array'),globalArray)&&same(descriptor(globalThis,'Map'),globalMap)&&same(descriptor(globalThis,'Set'),globalSet)&&same(descriptor(originalObject,'hasOwn'),objectHasOwn)&&same(descriptor(originalObject,'getOwnPropertyDescriptor'),objectDescriptor)&&same(descriptor(originalJson,'stringify'),stringify)&&originalObject.prototype===objectPrototype&&originalArray.prototype===arrayPrototype&&prototype(objectPrototype)===null&&prototype(arrayPrototype)===objectPrototype&&!descriptor(objectPrototype,'toJSON')&&!descriptor(arrayPrototype,'toJSON')&&samePrototype(arrayPrototype,arrayDescriptors)&&samePrototype(mapPrototype,mapDescriptors)&&samePrototype(setPrototype,setDescriptors);
}

// Qualification shared by the complete original and current derive leaf. The
// older JSON guard keeps its exact domain; these additional operations qualify
// only the new invocation-local path index, never source/proof authority.
const pathIsArray=descriptor(originalArray,'isArray'),pathIsProxy=descriptor(types,'isProxy'),pathWeakMap=descriptor(globalThis,'WeakMap'),pathReflect=descriptor(globalThis,'Reflect'),pathGetPrototypeOf=descriptor(originalObject,'getPrototypeOf');
let pathWeakPrototype=null,pathWeakHas=null,pathOwnKeys=null,pathNative=ordinaryNative&&native(descriptor,'getOwnPropertyDescriptor')&&native(hasOwn,'hasOwn')&&native(prototype,'getPrototypeOf')&&native(keys,'ownKeys')&&pathIsArray&&hasOwn(pathIsArray,'value')&&native(pathIsArray.value,'isArray')&&pathIsProxy&&hasOwn(pathIsProxy,'value')&&native(pathIsProxy.value,'isProxy')&&pathWeakMap&&hasOwn(pathWeakMap,'value')&&native(pathWeakMap.value,'WeakMap')&&pathReflect&&hasOwn(pathReflect,'value')&&!types.isProxy(pathReflect.value);
if(pathNative){pathWeakPrototype=pathWeakMap.value.prototype;pathWeakHas=descriptor(pathWeakPrototype,'has');pathOwnKeys=descriptor(pathReflect.value,'ownKeys');pathNative=!!(pathWeakHas&&hasOwn(pathWeakHas,'value')&&native(pathWeakHas.value,'has')&&pathOwnKeys&&hasOwn(pathOwnKeys,'value')&&pathOwnKeys.value===keys&&pathGetPrototypeOf&&hasOwn(pathGetPrototypeOf,'value')&&pathGetPrototypeOf.value===prototype);}
if(pathNative)try{const map=new pathWeakMap.value(),value={};pathNative=apply(pathWeakHas.value,map,[value])===false&&pathIsArray.value([])&&!pathIsArray.value({});}catch{pathNative=false;}
export function originalPathMembershipIntrinsicsUnchanged(){
 return !!(pathNative&&originalJsonIntrinsicsUnchanged()&&same(descriptor(originalObject,'getPrototypeOf'),pathGetPrototypeOf)&&same(descriptor(globalThis,'Reflect'),pathReflect)&&same(descriptor(pathReflect.value,'ownKeys'),pathOwnKeys)&&same(descriptor(originalArray,'isArray'),pathIsArray)&&same(descriptor(types,'isProxy'),pathIsProxy)&&same(descriptor(globalThis,'WeakMap'),pathWeakMap)&&pathWeakMap.value.prototype===pathWeakPrototype&&same(descriptor(pathWeakPrototype,'has'),pathWeakHas));
}

// This separate qualification permits invocation-local streaming of namespace
// maps. It does not skip a digest, metadata copy, target check or proof join.
// All common issuers initialize before a consumer's cold-leaf observer tests;
// those tests do not claim equivalence of the whole issuer bootstrap.
const traversalFunctionPrototype=pathNative?prototype(functionText):null;
const traversalCall=pathNative?descriptor(traversalFunctionPrototype,'call'):null;
const traversalDescriptors=pathNative?descriptor(originalObject,'getOwnPropertyDescriptors'):null;
const traversalApply=pathNative?descriptor(pathReflect.value,'apply'):null;
const traversalEntries=pathNative?descriptor(mapPrototype,'entries'):null;
const traversalMapIterator=pathNative?iteratorPins[1]:null;
let traversalNative=!!(pathNative&&traversalCall&&hasOwn(traversalCall,'value')&&native(traversalCall.value,'call')&&traversalDescriptors&&hasOwn(traversalDescriptors,'value')&&native(traversalDescriptors.value,'getOwnPropertyDescriptors')&&traversalApply&&hasOwn(traversalApply,'value')&&traversalApply.value===apply&&native(apply,'apply')&&traversalEntries&&hasOwn(traversalEntries,'value')&&traversalEntries.value===descriptor(mapPrototype,Symbol.iterator)?.value&&traversalMapIterator);
if(traversalNative)try{
 const map=new globalMap.value(),key={},value={};map.set(key,value);
 const cursor=apply(traversalEntries.value,map,[]),first=apply(traversalMapIterator.field.value,cursor,[]),end=apply(traversalMapIterator.field.value,cursor,[]);
 traversalNative=prototype(cursor)===traversalMapIterator.owner&&first.done===false&&first.value.length===2&&first.value[0]===key&&first.value[1]===value&&end.done===true;
}catch{traversalNative=false;}
export function originalNamespaceTraversalIntrinsicsUnchanged(){
 if(!traversalNative||!originalPathMembershipIntrinsicsUnchanged()||!same(descriptor(traversalFunctionPrototype,'call'),traversalCall)||!same(descriptor(originalObject,'getOwnPropertyDescriptors'),traversalDescriptors)||!same(descriptor(pathReflect.value,'apply'),traversalApply)||!same(descriptor(mapPrototype,'entries'),traversalEntries))return false;
 // The old route calls entries.call; a function's own call hook or changed
 // prototype is also observable and therefore keeps the collected fallback.
 return prototype(traversalEntries.value)===traversalFunctionPrototype&&!descriptor(traversalEntries.value,'call')&&prototype(traversalMapIterator.field.value)===traversalFunctionPrototype&&!descriptor(traversalMapIterator.field.value,'call');
}

// Qualify only the operations skipped by a source span index. Changed host
// operations retain the original lexer path; this is no source authority.
import {types} from 'node:util';
import {originalJsonIntrinsicsUnchanged,originalBatchedJsonIntrinsicsUnchanged} from './original-json-intrinsics.mjs';
import {originalBatchedDataFreezeIntrinsicsUnchanged} from './original-json-intrinsics.mjs';
function createGuardedProofLexingIntrinsics(){
 if(!originalBatchedDataFreezeIntrinsicsUnchanged())return {
  originalLexingIntrinsicsUnchanged(){return false;},
  originalBatchedLexingIntrinsicsUnchanged(){return false;},
 };

const descriptor=Object.getOwnPropertyDescriptor,own=Object.hasOwn,prototype=Object.getPrototypeOf,apply=Reflect.apply,text=Function.prototype.toString,isProxy=types.isProxy;
const stringPrototype=prototype(''),regexpPrototype=prototype(/(?:)/u),arrayPrototype=prototype([]),objectPrototype=prototype({});
const species=descriptor(Array,Symbol.species);
const required=[[Object,'getOwnPropertyDescriptor'],[Object,'hasOwn'],[Object,'getPrototypeOf'],[Object,'freeze'],[Reflect,'apply'],[Function.prototype,'toString'],[WeakMap.prototype,'get'],[WeakMap.prototype,'set'],[globalThis,'WeakMap'],[globalThis,'Array'],[arrayPrototype,'constructor','Array'],[stringPrototype,'startsWith'],[stringPrototype,'indexOf'],[stringPrototype,'repeat'],[stringPrototype,'slice'],[stringPrototype,'charCodeAt'],[regexpPrototype,'exec'],[regexpPrototype,'test'],[arrayPrototype,'push'],[arrayPrototype,'join'],[arrayPrototype,'map'],[arrayPrototype,'filter'],[arrayPrototype,'find'],[arrayPrototype,'includes'],[arrayPrototype,'indexOf'],[arrayPrototype,'slice'],[arrayPrototype,'at'],[arrayPrototype,'shift'],[arrayPrototype,Symbol.iterator,'values']];
let iteratorPrototype=null;try{iteratorPrototype=prototype(apply(Array.prototype[Symbol.iterator],[],[]));}catch{}
if(iteratorPrototype)required[required.length]=[iteratorPrototype,'next'];
const pins=[];for(let i=0;i<required.length;i++){const row=required[i],owner=row[0],key=row[1],name=row.length>2?row[2]:key;pins[i]={owner,key,name,field:descriptor(owner,key)};}
const native=(fn,name)=>typeof fn==='function'&&!isProxy(fn)&&apply(text,fn,[])===`function ${name}() { [native code] }`;
let qualified=iteratorPrototype!==null&&Array.prototype===arrayPrototype&&species&&own(species,'get')&&own(species,'set')&&!own(species,'value')&&species.set===undefined&&native(species.get,'get [Symbol.species]');for(let i=0;i<pins.length;i++){const pin=pins[i];if(!pin.field||!own(pin.field,'value')||!native(pin.field.value,pin.name))qualified=false;}
if(qualified)try{const key={},map=new WeakMap(),iterator=[key][Symbol.iterator]();qualified=map.set(key,key)===map&&map.get(key)===key&&iterator.next().value===key&&iterator.next().done===true;}catch{qualified=false;}
 function originalLexingIntrinsicsUnchanged(){
 if(!qualified||!originalJsonIntrinsicsUnchanged()||Array.prototype!==arrayPrototype||prototype(stringPrototype)!==objectPrototype||prototype(regexpPrototype)!==objectPrototype)return false;
 const actualSpecies=descriptor(Array,Symbol.species);if(!actualSpecies||!own(actualSpecies,'get')||!own(actualSpecies,'set')||own(actualSpecies,'value')||actualSpecies.get!==species.get||actualSpecies.set!==species.set||actualSpecies.enumerable!==species.enumerable||actualSpecies.configurable!==species.configurable)return false;
 for(let i=0;i<pins.length;i++){const pin=pins[i],actual=descriptor(pin.owner,pin.key);if(!actual||!own(actual,'value')||actual.value!==pin.field.value||actual.writable!==pin.field.writable||actual.enumerable!==pin.field.enumerable||actual.configurable!==pin.field.configurable)return false;}
 return true;
}

// Separate explicit sibling; the original lexical guard and all pins stay exact.
 function originalBatchedLexingIntrinsicsUnchanged(){
 if(!qualified||!originalBatchedJsonIntrinsicsUnchanged()||Array.prototype!==arrayPrototype||prototype(stringPrototype)!==objectPrototype||prototype(regexpPrototype)!==objectPrototype)return false;
 const actualSpecies=descriptor(Array,Symbol.species);if(!actualSpecies||!own(actualSpecies,'get')||!own(actualSpecies,'set')||own(actualSpecies,'value')||actualSpecies.get!==species.get||actualSpecies.set!==species.set||actualSpecies.enumerable!==species.enumerable||actualSpecies.configurable!==species.configurable)return false;
 for(let i=0;i<pins.length;i++){const pin=pins[i],actual=descriptor(pin.owner,pin.key);if(!actual||!own(actual,'value')||actual.value!==pin.field.value||actual.writable!==pin.field.writable||actual.enumerable!==pin.field.enumerable||actual.configurable!==pin.field.configurable)return false;}
 return true;
}

 return {originalLexingIntrinsicsUnchanged,originalBatchedLexingIntrinsicsUnchanged};
}
const {originalLexingIntrinsicsUnchanged,originalBatchedLexingIntrinsicsUnchanged}=createGuardedProofLexingIntrinsics();
export {originalLexingIntrinsicsUnchanged,originalBatchedLexingIntrinsicsUnchanged};

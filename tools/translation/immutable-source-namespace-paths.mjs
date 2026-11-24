// Storage qualification only. No source, namespace or semantic owner is issued.
import {types} from 'node:util';
import {originalStaticSourceIntrinsicsUnchanged,originalDataFreezeIntrinsicsUnchanged,originalCapturedFunctionSource} from './original-json-intrinsics.mjs';
const enabled=originalStaticSourceIntrinsicsUnchanged()&&originalDataFreezeIntrinsicsUnchanged();
const descriptor=enabled?Object.getOwnPropertyDescriptor:null,own=enabled?Object.hasOwn:null,keys=enabled?Reflect.ownKeys:null;
const prototype=enabled?Object.getPrototypeOf:null,isFrozen=enabled?Object.isFrozen:null,isArray=enabled?Array.isArray:null,isProxy=enabled?types.isProxy:null;
const objectPrototype=enabled?Object.prototype:null,arrayPrototype=enabled?Array.prototype:null;
const typedGlobal=enabled?descriptor(globalThis,'Uint8Array'):null;
const native=(value,name)=>typeof value==='function'&&!isProxy(value)&&originalCapturedFunctionSource(value)===`function ${name}() { [native code] }`;
const typedConstructor=typedGlobal&&own(typedGlobal,'value')&&native(typedGlobal.value,'Uint8Array')?typedGlobal.value:null;
const typedParent=typedConstructor?prototype(typedConstructor):null;
const typedPrototype=typedConstructor?descriptor(typedConstructor,'prototype'):null;
const typedOwnFrom=typedConstructor?descriptor(typedConstructor,'from'):null;
const typedFrom=typedParent&&!isProxy(typedParent)?descriptor(typedParent,'from'):null;
let typedNative=!!(typedConstructor&&typedPrototype&&own(typedPrototype,'value')&&!typedOwnFrom&&typedFrom&&own(typedFrom,'value')&&native(typedFrom.value,'from'));
if(typedNative)try{
 let calls=0;const output=Reflect.apply(typedFrom.value,typedConstructor,[[{},{}],()=>++calls-1]);
 typedNative=prototype(output)===typedPrototype.value&&calls===2&&data(output,'0')===0&&data(output,'1')===1;
}catch{typedNative=false;}
function same(actual,expected){
 if(!expected)return actual===undefined;
 return !!actual&&own(actual,'value')&&own(expected,'value')&&actual.value===expected.value&&actual.writable===expected.writable&&actual.enumerable===expected.enumerable&&actual.configurable===expected.configurable;
}
function namespaceWritesClosed(){return !descriptor(objectPrototype,'type')&&!descriptor(objectPrototype,'value')&&!descriptor(objectPrototype,'macro');}
const CELLS=500000,DEPTH=160,CHARS=16777216;
export function immutableNamespaceIntrinsicsUnchanged(){
 return enabled&&typedNative&&originalStaticSourceIntrinsicsUnchanged()&&originalDataFreezeIntrinsicsUnchanged()&&namespaceWritesClosed()&&same(descriptor(globalThis,'Uint8Array'),typedGlobal)&&prototype(typedConstructor)===typedParent&&same(descriptor(typedConstructor,'prototype'),typedPrototype)&&same(descriptor(typedConstructor,'from'),typedOwnFrom)&&same(descriptor(typedParent,'from'),typedFrom);
}
function data(value,name){const field=descriptor(value,name);return field&&own(field,'value')?field.value:undefined;}
function strings(value){
 if(!isArray(value))return false;
 for(let index=0;index<value.length;index++)if(typeof data(value,''+index)!=='string')return false;
 return true;
}
export function closedFrozenNamespaceScopes(scopes){
 if(!immutableNamespaceIntrinsicsUnchanged())return false;
 try{return qualifyFrozenScopes(scopes);}catch{return false;}
}
function qualifyFrozenScopes(scopes){
 let cells=0,chars=0;const active=new WeakSet(),done=new WeakSet();
 const visit=(value,depth)=>{
  if(++cells>CELLS||depth>DEPTH)return false;
  if(typeof value==='string'){chars+=value.length;return chars<=CHARS;}
  if(value===null||value===undefined||typeof value==='boolean'||typeof value==='number')return true;
  if(typeof value!=='object'||isProxy(value))return false;
  if(active.has(value))return false;if(done.has(value))return true;
  const array=isArray(value),parent=prototype(value);
  if(parent!==(array?arrayPrototype:objectPrototype)&&!(parent===null&&!array))return false;
  const names=keys(value);
  // A captured native Error stack can format during descriptor inspection.
  // Check all names before obtaining even the first field descriptor.
  for(let index=0;index<names.length;index++)if(typeof names[index]!=='string'||names[index]==='stack'||names[index]==='toJSON')return false;
  const length=array?data(value,'length'):null;
  if(array&&(typeof length!=='number'||length<0||length>CELLS||length%1||names.length!==length+1||names[names.length-1]!=='length'))return false;
  active.add(value);
  for(let index=0;index<names.length;index++){
   const name=names[index],field=descriptor(value,name);
   if(!field||!own(field,'value')||field.configurable||field.writable)return false;
   if(array&&name==='length'){if(field.enumerable||field.value!==length)return false;continue;}
   if(!field.enumerable||array&&name!==''+index||!visit(field.value,depth+1))return false;
  }
  if(!isFrozen(value))return false;
  active.delete(value);done.add(value);return true;
 };
 if(!visit(scopes,0)||!isArray(scopes))return false;
 // These exact fields are read by private template construction. Requiring
 // own data prevents an absent optional field from invoking an inherited hook.
 for(let index=0;index<scopes.length;index++){
  const scope=data(scopes,''+index);if(!scope||typeof scope!=='object')return false;
  const path=data(scope,'path'),bindings=data(scope,'bindings');
  if(!strings(path)||!isArray(bindings))return false;
  for(let at=0;at<bindings.length;at++){
   const binding=data(bindings,''+at);
   if(!binding||typeof binding!=='object')return false;
   const namespace=data(binding,'namespace'),name=data(binding,'name'),status=data(binding,'status'),target=data(binding,'target'),visibility=data(binding,'visibility');
   if(!['type','value','macro'].includes(namespace)||typeof name!=='string'||typeof status!=='string'||!own(binding,'target')||target!==null&&!strings(target))return false;
   if(!visibility||typeof visibility!=='object'||typeof data(visibility,'kind')!=='string')return false;
   if(data(visibility,'kind')!=='public'&&!strings(data(visibility,'path')))return false;
  }
 }
 return true;
}
export function closedNamespaceConsumerPath(path){
 if(!immutableNamespaceIntrinsicsUnchanged()||!path||typeof path!=='object'||isProxy(path)||!isArray(path)||prototype(path)!==arrayPrototype)return false;
 const names=keys(path),length=data(path,'length');
 if(typeof length!=='number'||length>CELLS||length<0||length%1||names.length!==length+1||names[names.length-1]!=='length')return false;
 for(let index=0;index<length;index++){
  if(names[index]!==''+index)return false;
  const field=descriptor(path,names[index]);if(!field||!own(field,'value')||!field.enumerable||typeof field.value!=='string')return false;
 }
 return true;
}
export function closedNamespaceVisibilityMask(mask,length){
 if(!immutableNamespaceIntrinsicsUnchanged()||!mask||typeof mask!=='object'||isProxy(mask))return false;
 const names=keys(mask);if(names.length!==length)return false;
 for(let index=0;index<length;index++){
  if(names[index]!==''+index)return false;
  const field=descriptor(mask,names[index]);
  if(!field||!own(field,'value')||field.value!==0&&field.value!==1)return false;
 }
 return true;
}

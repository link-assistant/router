// Identity inspection only. This factory grants no parser/source authority;
// the actual high parser consumer keeps its issued parse records private.
import {types} from 'node:util';
const entries=Map.prototype.entries,get=Map.prototype.get,has=Map.prototype.has,set=Map.prototype.set;
const fail=message=>{throw new TypeError('Original parser/cursor '+message);};
function reflectionTarget(value){if(!value||!['object','function'].includes(typeof value)||types.isProxy(value))fail('source class changed');return value;}
function prototypeDescriptors(prototype){
  const nearest=new Map();
  for(let current=prototype,depth=0;current;current=Object.getPrototypeOf(current)){
    reflectionTarget(current);if(++depth>64)fail('prototype chain exceeds its finite identity bound');
    const descriptors=Object.getOwnPropertyDescriptors(current);
    for(const name of Reflect.ownKeys(descriptors))if(!has.call(nearest,name))set.call(nearest,name,descriptors[name]);
  }
  return nearest;
}
export function originalMethodSnapshot(prototype) {
  reflectionTarget(prototype);const methods=new Map();
  for(let current=prototype,depth=0;current&&current!==Object.prototype;current=Object.getPrototypeOf(current)){
    reflectionTarget(current);if(++depth>64)fail('prototype chain exceeds its finite identity bound');
    for(const [name,field]of Object.entries(Object.getOwnPropertyDescriptors(current)))if(name!=='constructor'&&Object.hasOwn(field,'value')&&typeof field.value==='function'&&!has.call(methods,name)){
      if(types.isProxy(field.value))fail('method identity changed: proxy callback');set.call(methods,name,field.value);
    }
  }
  return methods;
}
function guardValue(options,methods){
  reflectionTarget(options);if(![Object.prototype,null].includes(Object.getPrototypeOf(options)))fail('callbacks or accessors changed: options');
  const fields=Object.getOwnPropertyDescriptors(options);
  for(const name of Reflect.ownKeys(fields))if(name!=='originalGuard'||!Object.hasOwn(fields[name],'value'))fail('callbacks or accessors changed: options');
  const original=Object.hasOwn(fields,'originalGuard')?fields.originalGuard.value:null;if(original===undefined||original===null)return null;
  reflectionTarget(original);const descriptors=Object.getOwnPropertyDescriptors(original);
  if(!Object.hasOwn(descriptors,'baseIs')||!Object.hasOwn(descriptors,'guard')||!Object.hasOwn(descriptors.baseIs,'value')||!Object.hasOwn(descriptors.guard,'value')||Reflect.ownKeys(descriptors).some(name=>!['baseIs','guard'].includes(name)))fail('callbacks or accessors changed: original guard');
  const base=descriptors.baseIs.value,guard=descriptors.guard.value;
  if(types.isProxy(base)||types.isProxy(guard)||typeof guard!=='function'||base!==get.call(methods,'is'))fail('callbacks or accessors changed: original guard');
  return guard;
}
export function assertOriginalParserIdentity(value,prototype,methods,options={}) {
  reflectionTarget(value);reflectionTarget(prototype);reflectionTarget(methods);
  if(Object.getPrototypeOf(value)!==prototype)fail('source class changed');
  if(Object.getPrototypeOf(methods)!==Map.prototype||Reflect.ownKeys(methods).length)fail('method identity changed: expected native snapshot');
  const guard=guardValue(options,methods),own=Object.getOwnPropertyDescriptors(value);
  for(const name of Reflect.ownKeys(own)){
    const descriptor=own[name];if(!Object.hasOwn(descriptor,'value')||typeof descriptor.value==='function'&&!(name==='is'&&descriptor.value===guard))fail('callbacks or accessors changed');
  }
  // Inspect the complete chain once per assertion. This index never survives
  // the call: prototypes, accessors and own overrides remain mutable inputs.
  const descriptors=prototypeDescriptors(prototype);
  for(const [name,method]of entries.call(methods)){
    if(typeof name!=='string'||typeof method!=='function'||types.isProxy(method))fail('method identity changed: invalid expected method');
    // Inspect the original prototype method even when the genuine text guard
    // shadows `is`; its captured delegation never authorizes a changed class.
    const descriptor=get.call(descriptors,name);
    if(!descriptor)fail('method identity changed: missing original method');
    if(!Object.hasOwn(descriptor,'value'))fail('method identity changed: accessor');
    if(descriptor.value!==method)fail('method identity changed');
    const override=Object.hasOwn(own,name)?own[name]:null;if(override&&!(name==='is'&&override.value===guard))fail('method identity changed: own replacement');
  }
}

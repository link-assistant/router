// Identity inspection only. This factory grants no parser/source authority;
// the actual high parser consumer keeps its issued parse records private.
import {types} from 'node:util';
export function originalMethodSnapshot(prototype) {
  const methods=new Map();
  for(let current=prototype;current&&current!==Object.prototype;current=Object.getPrototypeOf(current))for(const [name,field]of Object.entries(Object.getOwnPropertyDescriptors(current)))if(name!=='constructor'&&typeof field.value==='function'&&!methods.has(name))methods.set(name,field.value);
  return methods;
}
export function assertOriginalParserIdentity(value,prototype,methods,{originalGuard=null}={}) {
  if(!value||types.isProxy(value)||Object.getPrototypeOf(value)!==prototype)throw new TypeError('Original parser/cursor source class changed');
  const guard=originalGuard&&originalGuard.baseIs===methods.get('is')?originalGuard.guard:null;
  for(const [name,descriptor]of Object.entries(Object.getOwnPropertyDescriptors(value)))if(!Object.hasOwn(descriptor,'value')||typeof descriptor.value==='function'&&!(name==='is'&&descriptor.value===guard))throw new TypeError('Original parser/cursor callbacks or accessors changed');
  for(const [name,method]of methods)if(value[name]!==method&&!(name==='is'&&value[name]===guard))throw new TypeError('Original parser/cursor method identity changed');
}

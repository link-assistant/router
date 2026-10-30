// Development DATA equations only. No source, owner or semantic authority.
import {types} from 'node:util';
import {transportConcreteSyntaxSourceEquations} from './concrete-syntax-meta.mjs';

const fail=message=>{throw new TypeError('Concrete source equations: '+message);};
function data(object,names,array=false){
 if(object===null||typeof object!=='object'||types.isProxy(object)||Object.getPrototypeOf(object)!==(array?Array.prototype:Object.prototype))fail('ordinary own data required');
 const keys=Reflect.ownKeys(object);if(keys.length!==names.length||keys.some((key,index)=>key!==names[index]))fail('complete ordered own fields required');
 return names.map(key=>{const field=Object.getOwnPropertyDescriptor(object,key);if(!field||!Object.hasOwn(field,'value')||key!=='length'&&field.enumerable!==true)fail('enumerable own data required');return field.value;});
}

/** Each call authenticates a fresh complete batch and checks every edit/inverse. */
export function transportConcreteSourceEquations(input){
 if(input===null||typeof input!=='object'||types.isProxy(input)||!Array.isArray(input)||Object.getPrototypeOf(input)!==Array.prototype)fail('dense equation array required');
 const size=Object.getOwnPropertyDescriptor(input,'length');if(!size||!Object.hasOwn(size,'value')||!Number.isSafeInteger(size.value)||size.value<1||size.value>128)fail('bounded equation count required');
 const equations=data(input,[...Array.from({length:size.value},(_,index)=>String(index)),'length'],true).slice(0,-1).map(row=>{
  const [before,after,language]=data(row,['before','after','language']);if(typeof before!=='string'||typeof after!=='string'||!['Rust','JavaScript','TypeScript'].includes(language))fail('primitive sources and supported language required');return {before,after,language};
 });
 // The source-generated sibling keeps the complete original transaction and
 // calls its unchanged full CST substitution and serialization operations.
 return transportConcreteSyntaxSourceEquations(equations.flatMap(({before,after,language})=>[{source:before,language},{source:after,language}])).equations;
}

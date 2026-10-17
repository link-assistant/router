// Immutable guards run before typed layout guards, rejecting proxies and
// accessors before any record inspection in the derived-Copy profile.
import {types} from 'node:util';
export function assertImmutableCopy(value){
  const active=new Set(),done=new Set();
  function visit(value){
    if(value===null||typeof value!=='object')return;
    if(types.isProxy(value)||!Object.isFrozen(value))throw new TypeError('Copy receiver requires immutable checked records and sized arrays');
    if(Array.isArray(value)) {
      if(Object.getPrototypeOf(value)!==Array.prototype)throw new TypeError('Copy array has an unsupported prototype');
      const length=Object.getOwnPropertyDescriptor(value,'length')?.value,keys=Reflect.ownKeys(value);
      if(!Number.isSafeInteger(length)||length>4096||keys.length!==length+1||keys.some(key=>key!=='length'&&(typeof key!=='string'||!/^(?:0|[1-9][0-9]*)$/u.test(key)||Number(key)>=length)))throw new TypeError('Copy array requires a dense checked layout');
    }
    if(active.has(value))throw new TypeError('Copy receiver cannot contain a cycle');
    if(done.has(value))return;
    active.add(value);
    for(const key of Reflect.ownKeys(value)){
      const descriptor=Object.getOwnPropertyDescriptor(value,key);
      if(typeof key!=='string'||!descriptor||!Object.hasOwn(descriptor,'value'))throw new TypeError('Copy receiver requires own data fields');
      visit(descriptor.value);
    }
    active.delete(value);done.add(value);
  }
  visit(value);return true;
}

// Immutable guards run before typed layout guards, rejecting proxies and
// accessors before any record inspection in the derived-Copy profile.
import {types} from 'node:util';
export function assertImmutableCopy(value){
  const active=new Set(),done=new Set();
  function visit(value){
    if(value===null||typeof value!=='object')return;
    if(types.isProxy(value)||Array.isArray(value)||!Object.isFrozen(value))throw new TypeError('Copy receiver requires immutable checked records');
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

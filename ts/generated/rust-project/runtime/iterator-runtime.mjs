// Aggregate iteration borrows immutable ABI values. Reject a proxy before any
// trap can run; accessors, mutable containers and holes cannot model that view.
import {types} from 'node:util';
export const IMMUTABLE_ITERATOR_LIMITS=Object.freeze({depth:1024,cells:65536});
export function assertImmutableIterator(value) {
  const active=new Set(),done=new Set();let cells=0;
  function visit(value,depth=0) {
    if(depth>IMMUTABLE_ITERATOR_LIMITS.depth||++cells>IMMUTABLE_ITERATOR_LIMITS.cells)throw new TypeError('Borrowed iterator exceeds the bounded immutable view profile');
    if(value===null||typeof value!=='object')return;
    if(types.isProxy(value))throw new TypeError('Borrowed iterator rejects proxy values');
    const array=Array.isArray(value),prototype=Object.getPrototypeOf(value);
    if(array?prototype!==Array.prototype:prototype!==Object.prototype&&prototype!==null)throw new TypeError('Borrowed iterator requires ordinary array/record prototypes');
    if(!Object.isFrozen(value))throw new TypeError('Borrowed iterator requires immutable containers');
    if(active.has(value))throw new TypeError('Borrowed iterator rejects cyclic values');
    if(done.has(value))return;
    active.add(value);
    const keys=Reflect.ownKeys(value);
    if(array&&keys.length!==value.length+1)throw new TypeError('Borrowed iterator rejects array holes and extra fields');
    for(const key of keys) {
      const descriptor=Object.getOwnPropertyDescriptor(value,key);
      if(typeof key!=='string'||!descriptor||!Object.hasOwn(descriptor,'value'))throw new TypeError('Borrowed iterator requires own data fields');
      if(array&&key!=='length'&&(!/^(0|[1-9][0-9]*)$/u.test(key)||Number(key)>=value.length))throw new TypeError('Borrowed iterator rejects extra array fields');
      visit(descriptor.value,depth+1);
    }
    active.delete(value);done.add(value);
  }
  visit(value);return true;
}

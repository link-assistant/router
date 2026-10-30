// Inspect only the fresh checked declaration supplied by the actual forward
// capture. This helper issues no source, type, namespace or execution authority.
import {sameType} from '../checked-types.mjs';
export function checkedOwnedVectorTail(declaration,checkScalar){
 let node=declaration.body;const names=new Set();let count=0;
 while(node?.k==='let'){
  if(++count>64||node.mutable||typeof node.name!=='string'||names.has(node.name)||!sameType(node.type,declaration.ret))throw new TypeError('Owned reverse vector origin: bounded immutable scalar bindings required');
  names.add(node.name);checkScalar(node.value?.type);node=node.body;
 }
 if(node?.k!=='array'||!sameType(node.type,declaration.ret))throw new TypeError('Owned reverse vector origin: complete checked owned array tail required');
 return node;
}

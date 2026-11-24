// Only fresh checked declarations from the actual forward capture reach this
// DATA traversal. It does not issue source/type/namespace/execution authority.
import {sameType} from '../checked-types.mjs';
export function checkedOwnedJsonVectorTail(declaration,checkScalar){
 let work=0,bindings=0;const tails=[];
 function visit(node,names,depth){
  if(++work>4096||depth>64)throw new TypeError('Owned reverse vector origin: bounded checked control required');
  while(node?.k==='let'){
   if(++bindings>64||node.mutable||typeof node.name!=='string'||names.has(node.name)||!sameType(node.type,declaration.ret))throw new TypeError('Owned reverse vector origin: bounded immutable scalar bindings required');
   const value=node.value;if(sameType(value?.type,declaration.ret)){if(!value||!['array','if','var','let'].includes(value.k))throw new TypeError('Owned reverse JSON vector origin: complete immutable owned vector initializer required');names.set(node.name,value);}else{checkScalar(value?.type,value);names.set(node.name,null);}node=node.body;
  }
  if(node?.k==='var'){if(!names.has(node.name)||!names.get(node.name)||!sameType(node.type,declaration.ret))throw new TypeError('Owned reverse JSON vector origin: actual immutable owned vector alias required');const next=names.get(node.name),earlier=new Map(names);earlier.delete(node.name);visit(next,earlier,depth+1);return;}
  if(node?.k==='if'){
   if(!sameType(node.type,declaration.ret)||node.cond?.type?.kind!=='bool'||node.cond.type.rustReference||node.cond.type.rustGenericIdentityUnresolved)throw new TypeError('Owned reverse vector origin: actual checked bool branches required');
   visit(node.then,new Map(names),depth+1);visit(node.else,new Map(names),depth+1);return;
  }
  if(node?.k!=='array'||node.compatibilityCore?.id!=='router-core-vector-list-v1'||!sameType(node.type,declaration.ret))throw new TypeError('Owned reverse vector origin: complete checked owned array tail required');
  tails.push(node);if(tails.length>64)throw new TypeError('Owned reverse vector origin: bounded branch leaves required');
 }
 visit(declaration.body,new Map(declaration.params.map(param=>[param.name,null])),0);return tails[0];
}

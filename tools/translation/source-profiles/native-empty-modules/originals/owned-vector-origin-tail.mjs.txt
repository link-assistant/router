// Only fresh checked declarations from the actual forward capture reach this
// DATA traversal. It does not issue source/type/namespace/execution authority.
import {sameType} from '../checked-types.mjs';
export function checkedOwnedVectorTail(declaration,checkScalar){
 declaration=observeNativeFunctionControl(declaration);
 let work=0,bindings=0;const tails=[];
 function visit(node,names,depth){
  if(++work>4096||depth>64)throw new TypeError('Owned reverse vector origin: bounded checked control required');
  while(node?.k==='let'){
   if(++bindings>64||node.mutable||typeof node.name!=='string'||names.has(node.name)||!sameType(node.type,declaration.ret))throw new TypeError('Owned reverse vector origin: bounded immutable scalar bindings required');
   names.add(node.name);checkScalar(node.value?.type);node=node.body;
  }
  if(node?.k==='if'){
   if(!sameType(node.type,declaration.ret)||node.cond?.type?.kind!=='bool'||node.cond.type.rustReference||node.cond.type.rustGenericIdentityUnresolved)throw new TypeError('Owned reverse vector origin: actual checked bool branches required');
   visit(node.then,new Set(names),depth+1);visit(node.else,new Set(names),depth+1);return;
  }
  if(node?.k!=='array'||node.compatibilityCore?.id!=='router-core-vector-list-v1'||!sameType(node.type,declaration.ret))throw new TypeError('Owned reverse vector origin: complete checked owned array tail required');
  tails.push(node);if(tails.length>64)throw new TypeError('Owned reverse vector origin: bounded branch leaves required');
 }
 visit(declaration.body,new Set(),0);return tails[0];
}

import {observeNativeFunctionControl} from './owned-native-function-control.mjs';

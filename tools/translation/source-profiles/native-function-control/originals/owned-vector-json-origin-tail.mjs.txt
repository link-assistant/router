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

// Actual complete checked canonical value bodies only. This bounded DATA walk
// never substitutes for the original function's ownership/effect checking.
export function checkedOwnedJsonValueTail(declaration,checkScalar){
 let work=0,bindings=0,leaves=0,first=null;
 function visit(node,names,depth){
  if(++work>4096||depth>64)throw new TypeError('Owned JSON value origin: bounded complete source control required');
  while(node?.k==='let'){
   if(++bindings>64||node.mutable||typeof node.name!=='string'||names.has(node.name)||!sameType(node.type,declaration.ret))throw new TypeError('Owned JSON value origin: actual immutable lexical binder required');
   const valueType=node.value?.type,ownedJsonVector=valueType?.kind==='array'&&valueType.rustOwnership?.kind==='owned'&&valueType.rustOwnership.source==='Vec'&&!valueType.rustReference&&!valueType.rustFixedArray&&!valueType.rustGenericIdentityUnresolved&&!valueType.rustBorrowingUnresolved&&(!valueType.patternOwnershipRefusal||valueType.patternOwnershipRefusal==='ownership-bearing Vec type')&&sameType(valueType.element,declaration.ret)&&!valueType.element.rustReference&&!valueType.element.rustOwnership&&!valueType.element.patternOwnershipRefusal;
   if(!ownedJsonVector)checkScalar(valueType,node.value);names.add(node.name);node=node.body;
  }
  if(node?.k==='if'){if(!sameType(node.type,declaration.ret)||node.cond?.type?.kind!=='bool'||node.cond.type.rustReference||node.cond.type.rustGenericIdentityUnresolved)throw new TypeError('Owned JSON value origin: actual checked Boolean branch required');visit(node.then,new Set(names),depth+1);visit(node.else,new Set(names),depth+1);return;}
  const type=node?.type;if(!type||type.kind!=='data'||!sameType(type,declaration.ret)||type.rustReference||type.rustOwnership||type.patternOwnershipRefusal||type.rustBorrowingUnresolved||type.rustGenericIdentityUnresolved||++leaves>64)throw new TypeError('Owned JSON value origin: actual owned canonical return required');
  if(first===null)first=node;
 }
 visit(declaration.body,new Set(declaration.params.map(param=>param.name)),0);return first;
}

// Complete bounded immutable-tail copy with an actual primitive return.
export function checkedOwnedJsonScalarTail(declaration,checkScalar,canonicalSourceName){
 let work=0,bindings=0,leaves=0,first=null;
 function visit(node,names,depth){
  if(++work>4096||depth>64)throw new TypeError('JSON primitive return origin: bounded complete source control required');
  while(node?.k==='let'){
   if(++bindings>64||node.mutable||typeof node.name!=='string'||names.has(node.name)||!sameType(node.type,declaration.ret))throw new TypeError('JSON primitive return origin: actual immutable lexical binder required');
   const valueType=node.value?.type,ownedJsonVector=valueType?.kind==='array'&&valueType.rustOwnership?.kind==='owned'&&valueType.rustOwnership.source==='Vec'&&!valueType.rustReference&&!valueType.rustFixedArray&&!valueType.rustGenericIdentityUnresolved&&!valueType.rustBorrowingUnresolved&&(!valueType.patternOwnershipRefusal||valueType.patternOwnershipRefusal==='ownership-bearing Vec type')&&valueType.element?.kind==='data'&&valueType.element.name===canonicalSourceName&&!valueType.element.rustReference&&!valueType.element.rustOwnership&&!valueType.element.patternOwnershipRefusal;
   if(!ownedJsonVector)checkScalar(valueType,node.value);names.add(node.name);node=node.body;
  }
  if(node?.k==='if'){if(!sameType(node.type,declaration.ret)||node.cond?.type?.kind!=='bool'||node.cond.type.rustReference||node.cond.type.rustGenericIdentityUnresolved)throw new TypeError('JSON primitive return origin: actual checked Boolean branch required');visit(node.then,new Set(names),depth+1);visit(node.else,new Set(names),depth+1);return;}
  const type=node?.type;if(!type||!['unit','bool','fixed'].includes(type.kind)||!sameType(type,declaration.ret)||type.rustReference||type.rustOwnership||type.patternOwnershipRefusal||type.rustBorrowingUnresolved||type.rustGenericIdentityUnresolved||++leaves>64)throw new TypeError('JSON primitive return origin: actual owned canonical return required');
  if(first===null)first=node;
 }
 visit(declaration.body,new Set(declaration.params.map(param=>param.name)),0);return first;
}

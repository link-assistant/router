// Exact primitive vector tree DATA. Admission still requires the private whole
// source traversal and a fresh actual forward checkedSource accessor.
import {emitOwnedVectorCandidateLiteral} from './owned-vector-candidate-support.mjs';
const fail=message=>{throw new TypeError('Owned vector native control: '+message);};
const integer=name=>typeof name==='string'&&/^[iu](?:8|16|32|64|128|size)$/u.test(name);
const domain=type=>originalOwnedVectorText(type)?'text-owned':originalStaticVectorText(type)?'str-static':observedSourceF64(type)?'f64':type?.kind==='bool'?'bool':type?.kind==='fixed'&&integer(type.rustPrimitiveName)?type.rustPrimitiveName:null;
function frame(item){
 if(!item.vectorOrigin||!['bool','integer','float','static-text','text'].includes(item.vectorOrigin.element.kind)||!item.params.every(param=>param.type==='bool'||param.type==='f64'||param.type==='str-static'||param.type==='text-owned'||integer(param.type)))fail('actual primitive vector profile required');
 let work=0,leaves=0;return {charge(depth){if(++work>20000||depth>64)fail('bounded primitive vector tree required');},leaf(depth){if(depth>8||++leaves>64)fail('bounded complete primitive vector branches required');},boolean:name=>item.params.some(param=>param.rust===name&&param.type==='bool'),parameter:name=>item.params.some(param=>param.rust===name)};
}
function requestedCondition(node,guard,depth=0){
 guard.charge(depth);if(node.type!=='bool')fail('actual bool condition domain required');
 if(node.kind==='bool'&&typeof node.value==='boolean')return ['bool',node.value];
 if(node.kind==='vector-condition-input'&&guard.boolean(node.rust))return ['parameter',node.rust];
 if(node.kind==='not')return ['not',requestedCondition(node.value,guard,depth+1)];
 if(node.kind==='binary'&&['&&','||'].includes(node.op))return [node.op==='&&'?'and':'or',requestedCondition(node.left,guard,depth+1),requestedCondition(node.right,guard,depth+1)];
 fail('only closed original bool conditions are drafted');
}
function actualCondition(node,guard,depth=0){
 guard.charge(depth);if(node?.type?.kind!=='bool'||node.type.rustReference||node.type.rustGenericIdentityUnresolved)fail('actual native bool condition required');
 if(node.k==='lit'&&typeof node.value==='boolean')return ['bool',node.value];
 if(node.k==='var'&&guard.boolean(node.name))return ['parameter',node.name];
 if(node.k==='unary'&&node.op==='not')return ['not',actualCondition(node.arg,guard,depth+1)];
 if(node.k==='binary'&&['and','or'].includes(node.op))return [node.op,actualCondition(node.left,guard,depth+1),actualCondition(node.right,guard,depth+1)];
 fail('fresh actual condition differs from the closed bool projection');
}
export function requestedNativeVectorTree(item){
 const guard=frame(item);
 function body(rows,depth){
  guard.charge(depth);if(!Array.isArray(rows)||rows.length!==1)fail('complete terminating vector branch required');const node=rows[0];
  if(node.kind==='if')return ['if',requestedCondition(node.cond,guard),body(node.then,depth+1),body(node.else,depth+1)];
  if(node.kind!=='return'||node.value.kind!=='owned-vector-list'||node.value.items.length>4096)fail('checked owned vector return leaf required');guard.leaf(depth);
  return ['vector',node.value.items.map(value=>{guard.charge(depth);if(value.kind==='vector-input'&&guard.parameter(value.rust))return ['parameter',value.rust];if(value.kind==='bool'&&typeof value.value==='boolean')return ['bool',value.value];if(value.kind==='integer'&&typeof value.value==='string')return ['integer',value.value];if(value.kind==='float'){evaluateOwnedVectorF64(value);return ['float',value.value];}if(value.kind==='text')return ['text',ownedVectorTextValue(value)];fail('checked primitive vector element required');})];
 }
 return body(item.body,0);
}
export function actualNativeVectorTree(own,item){
 const guard=frame(item);if(own?.k!=='fn'||own.async||own.params.length!==item.params.length||own.ret?.kind!=='array'||own.ret.rustOwnership?.kind!=='owned'||own.ret.rustOwnership.source!=='Vec'||domain(own.ret.element)!==item.vectorOrigin.element.name||own.params.some((param,index)=>param.name!==item.params[index].rust||domain(param.type)!==item.params[index].type))fail('fresh actual native signature differs');
 function body(node,depth){
  guard.charge(depth);if(node?.k==='if')return ['if',actualCondition(node.cond,guard),body(node.then,depth+1),body(node.else,depth+1)];
  if(node?.k!=='array'||node.items.length>4096||node.compatibilityCore?.id!=='router-core-vector-list-v1')fail('fresh qualified owned vector return required');guard.leaf(depth);
  return ['vector',node.items.map(value=>{guard.charge(depth);if(value.k==='var'&&guard.parameter(value.name))return ['parameter',value.name];if(value.k==='toString'&&value.sourceOwnershipOperation?.profile==='checked-standard-string-ownership-v1'&&value.sourceOwnershipOperation.operation==='to_owned'&&value.sourceOwnershipOperation.qualifiedPath==='::std::borrow::ToOwned::to_owned'&&originalOwnedVectorText(value.type)){const arg=value.arg;if(arg?.k==='var'&&item.params.some(param=>param.rust===arg.name&&param.type==='text-owned'))return ['parameter',arg.name];if(arg?.k==='lit'&&arg.type?.kind==='string')return ['text',ownedVectorTextValue({kind:'text',value:arg.value})];fail('actual original standard String copy operand differs');}if(value.k==='lit'&&value.type?.kind==='bool'&&typeof value.value==='boolean')return ['bool',value.value];if(value.k==='lit'&&value.type?.kind==='float'&&!value.type.rustReference&&!value.type.rustGenericIdentityUnresolved&&!value.type.rustBorrowingUnresolved){const item={kind:'float',value:value.value};evaluateOwnedVectorF64(item);return ['float',item.value];}if(value.k==='lit'&&value.type?.kind==='string'&&!value.type.rustReference)return ['text',ownedVectorTextValue({kind:'text',value:value.value})];if(value.k==='lit'&&value.type?.kind==='fixed'&&(typeof value.value==='string'||typeof value.value==='bigint')){let integer;try{integer=BigInt(value.value).toString();}catch{fail('actual original native integer literal differs');}return ['integer',integer];}fail('fresh original vector element differs');})];
 }
 return body(own.body,0);
}
export function emitNativeVectorControlBody(item){
 requestedNativeVectorTree(item);const guard=frame(item);
 function condition(node){
  const value=requestedCondition(node,guard);function emit(tree){if(tree[0]==='bool')return String(tree[1]);if(tree[0]==='parameter')return tree[1];if(tree[0]==='not')return '(!'+emit(tree[1])+')';return '('+emit(tree[1])+(tree[0]==='and'?' && ':' || ')+emit(tree[2])+')';}return emit(value);
 }
 function body(rows,depth){const node=rows[0],pad=' '.repeat(depth*4);if(node.kind==='return')return pad+(node.value.element.kind==='text'?emitNativeOwnedTextVector(node.value):emitOwnedVectorCandidateLiteral(node.value,true));return pad+'if '+condition(node.cond)+' {\n'+body(node.then,depth+1)+'\n'+pad+'} else {\n'+body(node.else,depth+1)+'\n'+pad+'}';}
 return body(item.body,1);
}

import {observedSourceF64} from '../floating-scalar-source-data.mjs';
import {evaluateOwnedVectorF64} from './owned-vector-f64-literal.mjs';

import {ownedVectorTextValue} from './owned-vector-text-literal.mjs';
// Domain DATA from the fresh actual original signature, never a permit token.
function originalStaticVectorText(type){
 return !!type&&type.kind==='string'&&!type.rustReference&&!type.patternOwnershipRefusal&&!type.rustGenericIdentityUnresolved&&!type.rustBorrowingUnresolved&&type.rustOwnership?.kind==='borrowed'&&type.rustOwnership.source==='str'&&type.rustBorrowLifetime?.kind==='static'&&(type.rustSourceType===true||type.rustBorrowLifetime.source==='string-literal');
}

function originalOwnedVectorText(type){
 return !!type&&type.kind==='string'&&type.rustSourceType===true&&!type.rustReference&&!type.rustGenericIdentityUnresolved&&!type.rustBorrowingUnresolved&&type.rustOwnership?.kind==='owned'&&type.rustOwnership.source==='String'&&(!type.patternOwnershipRefusal||['ownership-bearing String type','owned String source type','owned String formatting','owned String construction','owned String conversion','owned String replacement'].includes(type.patternOwnershipRefusal));
}
function emitNativeOwnedTextVector(value){
 const items=value.items.map(item=>{if(item.kind==='vector-input'){if(item.type!=='text-owned'||!/^__ro_vector_input_[0-9]+$/u.test(item.rust))fail('actual owned String input required');return '::std::borrow::ToOwned::to_owned(&'+item.rust+')';}const literal=emitOwnedVectorText(item,true,true);return '::std::borrow::ToOwned::to_owned('+literal+')';});return 'crate::translation_core::vec!['+items.join(', ')+']';
}
import {emitOwnedVectorText} from './owned-vector-text-literal.mjs';

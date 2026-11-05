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
export function requestedOriginalPrimitiveVectorTree(item){
 const guard=frame(item);
 function body(rows,depth){
  guard.charge(depth);if(!Array.isArray(rows)||rows.length!==1)fail('complete terminating vector branch required');const node=rows[0];
  if(node.kind==='if')return ['if',requestedCondition(node.cond,guard),body(node.then,depth+1),body(node.else,depth+1)];
  if(node.kind!=='return'||node.value.kind!=='owned-vector-list'||node.value.items.length>4096)fail('checked owned vector return leaf required');guard.leaf(depth);
  return ['vector',node.value.items.map(value=>{guard.charge(depth);if(value.kind==='vector-input'&&guard.parameter(value.rust))return ['parameter',value.rust];if(value.kind==='bool'&&typeof value.value==='boolean')return ['bool',value.value];if(value.kind==='integer'&&typeof value.value==='string')return ['integer',value.value];if(value.kind==='float'){evaluateOwnedVectorF64(value);return ['float',value.value];}if(value.kind==='text')return ['text',ownedVectorTextValue(value)];fail('checked primitive vector element required');})];
 }
 return body(item.body,0);
}
export function actualOriginalPrimitiveVectorTree(own,item){
 const guard=frame(item);if(own?.k!=='fn'||own.async||own.params.length!==item.params.length||own.ret?.kind!=='array'||own.ret.rustOwnership?.kind!=='owned'||own.ret.rustOwnership.source!=='Vec'||domain(own.ret.element)!==item.vectorOrigin.element.name||own.params.some((param,index)=>param.name!==item.params[index].rust||domain(param.type)!==item.params[index].type))fail('fresh actual native signature differs');
 function body(node,depth){
  guard.charge(depth);if(node?.k==='if')return ['if',actualCondition(node.cond,guard),body(node.then,depth+1),body(node.else,depth+1)];
  if(node?.k!=='array'||node.items.length>4096||node.compatibilityCore?.id!=='router-core-vector-list-v1')fail('fresh qualified owned vector return required');guard.leaf(depth);
  return ['vector',node.items.map(value=>{guard.charge(depth);if(value.k==='var'&&guard.parameter(value.name))return ['parameter',value.name];if(value.k==='toString'&&value.sourceOwnershipOperation?.profile==='checked-standard-string-ownership-v1'&&value.sourceOwnershipOperation.operation==='to_owned'&&value.sourceOwnershipOperation.qualifiedPath==='::std::borrow::ToOwned::to_owned'&&originalOwnedVectorText(value.type)){const arg=value.arg;if(arg?.k==='var'&&item.params.some(param=>param.rust===arg.name&&param.type==='text-owned'))return ['parameter',arg.name];if(arg?.k==='lit'&&arg.type?.kind==='string')return ['text',ownedVectorTextValue({kind:'text',value:arg.value})];fail('actual original standard String copy operand differs');}if(value.k==='lit'&&value.type?.kind==='bool'&&typeof value.value==='boolean')return ['bool',value.value];if(value.k==='lit'&&value.type?.kind==='float'&&!value.type.rustReference&&!value.type.rustGenericIdentityUnresolved&&!value.type.rustBorrowingUnresolved){const item={kind:'float',value:value.value};evaluateOwnedVectorF64(item);return ['float',item.value];}if(value.k==='lit'&&value.type?.kind==='string'&&!value.type.rustReference)return ['text',ownedVectorTextValue({kind:'text',value:value.value})];if(value.k==='lit'&&value.type?.kind==='fixed'&&(typeof value.value==='string'||typeof value.value==='bigint')){let integer;try{integer=BigInt(value.value).toString();}catch{fail('actual original native integer literal differs');}return ['integer',integer];}fail('fresh original vector element differs');})];
 }
 return body(own.body,0);
}
export function emitOriginalPrimitiveVectorControlBody(item){
 requestedOriginalPrimitiveVectorTree(item);const guard=frame(item);
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
// JSON-only ordered effect DATA. Callers must first reissue the complete program
// privately and obtain the native declaration from a fresh checkedSource/lower.
const jsonFail=message=>{throw new TypeError('Owned vector native JSON control: '+message);};
function jsonControlFrame(item){
 if(item.vectorOrigin?.kind!=='json-vector'||item.returns!=='json-list-owned'||item.params.some(row=>!['json','json-ref','bool'].includes(row.type)))jsonFail('actual canonical JSON vector profile required');
 let work=0,leaves=0;return {charge(depth=0){if(++work>100000||depth>64)jsonFail('bounded complete JSON body required');},leaf(){if(++leaves>64)jsonFail('bounded complete JSON branches required');}};
}
const jsonEvent=(events,operation,args)=>{if(events.length>=16384)jsonFail('bounded ordered JSON effects required');const value=['effect',events.length];events.push([operation,args]);return value;};
function requestedJsonExpression(node,env,events,guard,borrow=false,depth=0){
 guard.charge(depth);if(!node)jsonFail('complete checked receiving expression required');
 if(node.kind==='variable'){if(!env.has(node.name))jsonFail('actual lexical receiving binder required');const value=env.get(node.name);return node.type==='json'&&!borrow?jsonEvent(events,'copy',[value]):value;}
 if(node.kind==='string'&&node.type==='str'&&typeof node.value==='string'&&!/\p{Surrogate}/u.test(node.value))return ['str',node.value];
 if(node.kind==='integer'&&typeof node.value==='string')return ['integer',node.type==='i64'?'i64':'u64',BigInt(node.value).toString()];
 if(node.kind==='bool'&&typeof node.value==='boolean')return ['bool',node.value];
 if(node.kind==='not')return ['not',requestedJsonExpression(node.value,env,events,guard,false,depth+1)];
 if(node.kind==='binary'&&['&&','||'].includes(node.op))return [node.op==='&&'?'and':'or',requestedJsonExpression(node.left,env,events,guard,false,depth+1),requestedJsonExpression(node.right,env,events,guard,false,depth+1)];
 if(node.kind==='choose'&&['bool','str','usize','u64','i64'].includes(node.type)){const before=events.length,condition=requestedJsonExpression(node.cond,env,events,guard,false,depth+1),yes=requestedJsonExpression(node.then,env,events,guard,false,depth+1),no=requestedJsonExpression(node.else,env,events,guard,false,depth+1);if(events.length!==before)jsonFail('primitive conditional must retain pure scalar arms');return ['choose',condition,yes,no];}
 if(node.kind==='owned-call'&&['router_core_json_copy','json_macro_value'].includes(node.name)&&node.args.length===1)return jsonEvent(events,'copy',[requestedJsonExpression(node.args[0],env,events,guard,true,depth+1)]);
 if(node.kind==='owned-call'&&node.name==='router_core_json_with_field'&&node.args.length===3)return jsonEvent(events,'with-field',node.args.map(argument=>requestedJsonExpression(argument,env,events,guard,true,depth+1)));
 if(node.kind==='owned-call'&&['json_macro_null','json_macro_bool','json_macro_string','json_macro_u64','json_macro_i64'].includes(node.name)){const suffix=node.name==='json_macro_i64'&&node.args[0].type!=='i64'?'i64_unsigned':node.name.slice('json_macro_'.length),args=node.args.map(argument=>requestedJsonExpression(argument,env,events,guard,false,depth+1));return jsonEvent(events,'build-'+suffix,args);}
 if(['json-array','json-object'].includes(node.kind)){if(node.kind==='json-object'&&!node.entries.length)return jsonEvent(events,'build-object',[]);const children=node.kind==='json-array'?node.items:node.entries.map(entry=>entry.value),values=children.map(child=>child.type==='json'&&['owned-call','json-array','json-object'].includes(child.kind)?requestedJsonExpression(child,env,events,guard,false,depth+1):jsonEvent(events,'copy',[requestedJsonExpression(child,env,events,guard,true,depth+1)]));if(node.kind==='json-array')return jsonEvent(events,'build-array',[['vector',values]]);const keys=node.entries.map(entry=>jsonEvent(events,'build-string',[['str',entry.key]])),keyArray=jsonEvent(events,'build-array',[['vector',keys]]);return jsonEvent(events,'build-fields',[keyArray,['vector',values]]);}
 if(node.kind==='json-vector-literal'&&node.items.length<=4096)return ['vector',node.items.map(child=>child.type==='json'&&['owned-call','json-array','json-object'].includes(child.kind)?requestedJsonExpression(child,env,events,guard,false,depth+1):jsonEvent(events,'copy',[requestedJsonExpression(child,env,events,guard,true,depth+1)]))];
 jsonFail('JSON constructor/update/reader expression needs its next source rule');
}
export function requestedNativeJsonVectorTree(item){
 const guard=jsonControlFrame(item),env=new Map(item.params.map((param,index)=>[param.name,['parameter',index]])),events=[];
 for(let index=0;index<item.params.length;index++)if(item.params[index].type!=='bool')jsonEvent(events,'validate',[['parameter',index]]);
 function body(rows,names,effects,depth){
  guard.charge(depth);if(!Array.isArray(rows)||!rows.length)jsonFail('complete terminating receiving body required');
  for(let at=0;at<rows.length;at++){
   const node=rows[at];if(node.kind==='let'){if(names.has(node.name))jsonFail('unique immutable receiving binder required');names.set(node.name,requestedJsonExpression(node.value,names,effects,guard));continue;}
   if(at!==rows.length-1)jsonFail('terminator must close the complete receiving body');
   if(node.kind==='return'){guard.leaf();return [effects,requestedJsonExpression(node.value,names,effects,guard)];}
   if(node.kind==='if'){const condition=requestedJsonExpression(node.cond,names,effects,guard);return [effects,['if',condition,body(node.then,new Map(names),[...effects],depth+1),body(node.else,new Map(names),[...effects],depth+1)]];}
   jsonFail('unregistered receiving statement');
  }jsonFail('missing receiving terminator');
 }
 return body(item.body,env,events,0);
}
export function actualNativeJsonVectorTree(own,item,lowered){
 const guard=jsonControlFrame(item),domain=originalJsonVectorDomain(own,lowered);if(!domain||own.k!=='fn'||own.async||own.params.length!==item.params.length||domain.parameters.some((param,index)=>param.name!==item.params[index].type)||own.params.some((param,index)=>param.name!==item.params[index].rust))jsonFail('actual canonical native signature differs');
 const env=new Map(own.params.map((param,index)=>[param.name,['parameter',index]]));
 function expression(node,names,events,depth=0){
  guard.charge(depth);if(!node)jsonFail('complete actual native expression required');
  if(node.k==='var'){if(!names.has(node.name))jsonFail('actual native lexical binder required');return names.get(node.name);}
  if(node.k==='lit'&&node.type?.kind==='string'&&!node.type.rustReference&&node.type.rustOwnership?.kind==='borrowed'&&node.type.rustOwnership.source==='str'&&typeof node.value==='string'&&!/\p{Surrogate}/u.test(node.value))return ['str',node.value];
  if(node.k==='lit'&&node.type?.kind==='fixed'&&['u64','i64'].includes(node.type.rustPrimitiveName)&&!node.type.rustReference&&!node.type.rustGenericIdentityUnresolved&&!node.type.rustBorrowingUnresolved)return ['integer',node.type.rustPrimitiveName,BigInt(node.value).toString()];
  if(node.k==='lit'&&node.type?.kind==='bool'&&typeof node.value==='boolean')return ['bool',node.value];
  if(node.k==='unary'&&node.op==='not'&&node.type?.kind==='bool')return ['not',expression(node.arg,names,events,depth+1)];
  if(node.k==='binary'&&['and','or'].includes(node.op)&&node.type?.kind==='bool')return [node.op,expression(node.left,names,events,depth+1),expression(node.right,names,events,depth+1)];
  if(node.k==='let'){if(node.mutable||names.has(node.name))jsonFail('unique immutable actual native binder required');const value=expression(node.value,names,events,depth+1),local=new Map(names);local.set(node.name,value);return expression(node.body,local,events,depth+1);}
  if(node.k==='if'&&['bool','string','fixed'].includes(node.type?.kind)){const before=events.length,condition=expression(node.cond,names,events,depth+1),yes=expression(node.then,new Map(names),events,depth+1),no=expression(node.else,new Map(names),events,depth+1);if(events.length!==before)jsonFail('actual primitive conditional has non-scalar effects');return ['choose',condition,yes,no];}
  if(node.k==='routerHostCall'&&node.id.startsWith('router_vector_json_build_')){const suffix=node.id.slice('router_vector_json_build_'.length),operation=boundedJsonCoreOperation('json_build_'+suffix);if(!operation||operation.id!==node.id||operation.params.length!==node.args?.length||node.type?.name!==own.ret.element.name||node.compatibilityCore?.id!=='router-owned-json-update-v1'||node.compatibilityCore.sourceSha256!==BOUNDED_JSON_CORE_SHA256||node.compatibilityCore.symbol!=='crate::translation_json_core::json_build_'+suffix)jsonFail('actual canonical native builder source boundary differs');return jsonEvent(events,'build-'+suffix,node.args.map(argument=>expression(argument,names,events,depth+1)));}
  if(node.k==='routerHostCall'&&['router_vector_json_validate','router_vector_json_copy','router_vector_json_with_field'].includes(node.id)){
   const operation=node.id==='router_vector_json_validate'?'validate':node.id==='router_vector_json_copy'?'copy':'with-field',name=operation==='validate'?'json_validate':operation==='copy'?'json_checked_copy':'json_checked_with_field';
   if(node.args?.length!==(operation==='with-field'?3:1)||node.compatibilityCore?.id!=='router-owned-json-update-v1'||node.compatibilityCore.sourceSha256!==BOUNDED_JSON_CORE_SHA256||node.compatibilityCore.symbol!=='crate::translation_json_core::'+name||operation==='validate'&&node.type?.kind!=='unit'||operation!=='validate'&&node.type?.name!==own.ret.element.name)jsonFail('actual privately checked bounded native operation differs');
   return jsonEvent(events,operation,node.args.map(argument=>expression(argument,names,events,depth+1)));
  }
  if(node.k==='array'&&node.items.length<=4096&&node.compatibilityCore?.id==='router-core-vector-list-v1'&&sameType(node.type,own.ret))return ['vector',node.items.map(child=>expression(child,names,events,depth+1))];
  jsonFail('actual native expression is outside the drafted copy/control projection');
 }
 function body(node,names,events,depth){
  guard.charge(depth);while(node?.k==='let'){if(node.mutable||names.has(node.name))jsonFail('unique immutable actual body binder required');names.set(node.name,expression(node.value,names,events,depth+1));node=node.body;}
  if(node?.k==='if'){const condition=expression(node.cond,names,events,depth+1);return [events,['if',condition,body(node.then,new Map(names),[...events],depth+1),body(node.else,new Map(names),[...events],depth+1)]];}
  guard.leaf();const result=expression(node,names,events,depth+1);if(result?.[0]!=='vector')jsonFail('complete native owned vector return required');return [events,result];
 }
 return body(own.body,env,[],0);
}
export function emitNativeJsonVectorControlBody(item){
 requestedNativeJsonVectorTree(item);const source=emitOwnedCoreProgram([item],'rust',{nativeJsonSource:true}),tokens=rustTokens(source).filter(token=>token.type!=='comment');const fn=tokens.findIndex(token=>token.text==='fn'),start=tokens.findIndex((token,index)=>index>fn&&token.text==='{'),end=tokens.at(-1);if(fn<0||start<0||end?.text!=='}')jsonFail('complete emitted native JSON function body required');return source.slice(tokens[start].end,end.start).trimEnd();
}
import {originalJsonVectorDomain} from './owned-vector-json-native.mjs';
import {BOUNDED_JSON_CORE_SHA256} from '../bounded-json-core-source-data.mjs';
import {sameType} from '../checked-types.mjs';
import {emitOwnedCoreProgram} from './owned-vector-candidate-operations.mjs';
import {rustTokens} from '../rust-structure.mjs';

import {boundedJsonCoreOperation} from '../bounded-json-core-call-source.mjs';

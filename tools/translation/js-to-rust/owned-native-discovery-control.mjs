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
 if(!['json-vector','json-value','json-scalar','primitive-scalar'].includes(item.vectorOrigin?.kind)||item.returns!==(item.vectorOrigin.kind==='json-value'?'json':['json-scalar','primitive-scalar'].includes(item.vectorOrigin.kind)?item.vectorOrigin.type:'json-list-owned')||item.params.some(row=>!['json','json-ref','bool','str'].includes(row.type)&&!primitiveBitwiseType(row.type)))jsonFail('actual canonical JSON vector profile required');
 let work=0,leaves=0;return {charge(depth=0){if(++work>100000||depth>64)jsonFail('bounded complete JSON body required');},leaf(){if(++leaves>64)jsonFail('bounded complete JSON branches required');}};
}
const jsonNot=value=>value?.[0]==='not'?value[1]:['not',value];function jsonChoose(condition,yes,no){if(condition?.[0]==='not'&&condition[1]?.[0]==='some'){condition=condition[1];[yes,no]=[no,yes];}return yes?.[0]==='bool'&&no?.[0]==='bool'&&yes[1]!==no[1]?(yes[1]?condition:jsonNot(condition)):['choose',condition,yes,no];}
// DATA normalization for the already checked 64-bit native profile. Both
// callees keep their independent actual source/signature/loan checks above.
function jsonNativeIndex(value,depth=0){
 if(depth>64)jsonFail('bounded actual index scalar tree required');
 if(value?.[0]==='integer'&&['u64','usize'].includes(value[1])&&/^(?:0|[1-9][0-9]*)$/u.test(value[2])&&BigInt(value[2])<=18446744073709551615n)return ['integer','u64',value[2]];
 // These are already typed u64/usize by both independent source checkers;
 // ordered effect and Some-payload origins remain present in the whole tree.
 if(value?.[0]==='effect'&&value.length===2&&Number.isSafeInteger(value[1])&&value[1]>=0)return value;
 if(value?.[0]==='payload'&&value.length===2)return value;
 if(value?.[0]==='parameter'&&value.length===2&&Number.isSafeInteger(value[1])&&value[1]>=0)return value;
 if(value?.[0]==='choose'&&value.length===4)return ['choose',value[1],jsonNativeIndex(value[2],depth+1),jsonNativeIndex(value[3],depth+1)];
 jsonFail('only checked unsigned literal/conditional/reader/payload index values are drafted');
}
const jsonEvent=(events,operation,args)=>{if(events.length>=16384)jsonFail('bounded ordered JSON effects required');const value=['effect',events.length];events.push([operation,args]);return value;};
function requestedJsonExpression(node,env,events,guard,borrow=false,depth=0){
 guard.charge(depth);if(!node)jsonFail('complete checked receiving expression required');const total=requestedNativeTotalOperator(node,arg=>requestedJsonExpression(arg,env,events,guard,false,depth+1));if(total!==null)return total;
 if(node.kind==='variable'){if(!env.has(node.name))jsonFail('actual lexical receiving binder required');const value=env.get(node.name);return node.type==='json'&&!borrow?jsonEvent(events,'copy',[value]):value;}
 if(node.kind==='text-scalar-call'){const op=ownedVectorTextScalarOperation(node.name);if(!op||op.ret!==node.type||op.args.length!==node.args.length||node.args.some(argument=>argument.type!=='str'))jsonFail('actual fixed text scalar operands required');return jsonEvent(events,'text-scalar:'+node.name,node.args.map(argument=>requestedJsonExpression(argument,env,events,guard,false,depth+1)));}
 if(node.kind==='source-scalar-call'){if(node.type!=='bool'&&!primitiveBitwiseType(node.type)||node.type!==node.callee?.returns||node.args.length!==node.callee.parameters.length)jsonFail('actual checked primitive source call required');return ['source-call',node.callee.rust,node.args.map(argument=>requestedJsonExpression(argument,env,events,guard,false,depth+1))];}
 if(node.kind==='string'&&node.type==='str'&&typeof node.value==='string'&&!/\p{Surrogate}/u.test(node.value))return ['str',node.value];
 if(node.kind==='integer'&&typeof node.value==='string')return ['integer',primitiveBitwiseType(node.type)?.name??'u64',BigInt(node.value).toString()];
 if(node.kind==='bool'&&typeof node.value==='boolean')return ['bool',node.value];
 if(node.kind==='not')return jsonNot(requestedJsonExpression(node.value,env,events,guard,false,depth+1));
 if(node.kind==='binary'&&['&&','||'].includes(node.op))return [node.op==='&&'?'and':'or',requestedJsonExpression(node.left,env,events,guard,false,depth+1),requestedJsonExpression(node.right,env,events,guard,false,depth+1)];
 if(node.kind==='binary'){const op=jsonScalarComparisonOperation(node.op),domain=jsonScalarComparisonDomain(node.left?.type);if(op){if(node.type!=='bool'||!domain||domain!==jsonScalarComparisonDomain(node.right?.type)||op.kind==='comparison'&&!primitiveBitwiseType(domain))jsonFail('actual identical checked scalar comparison operands required');return ['compare',op.op,domain,requestedJsonExpression(node.left,env,events,guard,false,depth+1),requestedJsonExpression(node.right,env,events,guard,false,depth+1)];}}
 if(node.kind==='choose'&&(['bool','str','usize'].includes(node.type)||primitiveBitwiseType(node.type))){const before=events.length,condition=requestedJsonExpression(node.cond,env,events,guard,false,depth+1),yes=requestedJsonExpression(node.then,env,events,guard,false,depth+1),no=requestedJsonExpression(node.else,env,events,guard,false,depth+1);if(events.length!==before)jsonFail('primitive conditional must retain pure scalar arms');return jsonChoose(condition,yes,no);}
 if(node.kind==='option-test'){if(node.value?.kind!=='variable'||!['json-option-ref','str-option-ref','bool-option','u64-option','i64-option'].includes(node.value.type))jsonFail('actual supported standard Option variable required');const value=['some',requestedJsonExpression(node.value,env,events,guard,false,depth+1)];return node.some?value:jsonNot(value);}
 if(node.kind==='option-field'){if(node.value?.kind!=='variable'||ownedJsonOptionalPayload(node.value.type)!==node.type)jsonFail('actual Some payload domain differs');return ['payload',requestedJsonExpression(node.value,env,events,guard,false,depth+1)];}
 if(node.kind==='json-field-call'){const row=ownedVectorJsonFieldOperation(node.name);if(!row||row.ret!==node.type||row.args.length!==node.args.length)jsonFail('actual supported field/default signature required');const args=node.args.map((argument,index)=>requestedJsonExpression(argument,env,events,guard,index===0,depth+1));if(node.name==='router_field_json_index_or_null')return jsonEvent(events,'index-usize',[args[0],jsonNativeIndex(args[1])]);if(node.name==='router_field_json_index')return jsonEvent(events,'reader:serde_json_value_get_usize',[args[0],jsonNativeIndex(args[1])]);return jsonEvent(events,'field:'+node.name,args);}
 if(node.kind==='owned-call'&&node.name==='router_core_json_index_usize'&&node.args.length===2&&node.type==='json-ref'){const value=requestedJsonExpression(node.args[0],env,events,guard,true,depth+1),index=requestedJsonExpression(node.args[1],env,events,guard,false,depth+1);return jsonEvent(events,'index-usize',[value,jsonNativeIndex(index)]);}
 if(node.kind==='owned-call'&&node.name==='router_core_json_index_str'&&node.args.length===2&&node.type==='json-ref')return jsonEvent(events,'index-str',[requestedJsonExpression(node.args[0],env,events,guard,true,depth+1),requestedJsonExpression(node.args[1],env,events,guard,false,depth+1)]);
 if(node.kind==='json-reader-call'){const op=ownedJsonReaderOperation(node.name),optional=op&&ownedJsonOptionalPayload(op.ret);if(!op||op.ret!==node.type||op.args.length!==node.args.length)jsonFail('actual registered canonical JSON reader signature required');if(op.ret==='bool'&&op.args.length===1)return jsonEvent(events,'predicate:'+node.name,[requestedJsonExpression(node.args[0],env,events,guard,true,depth+1)]);if(node.name==='serde_json_value_get_usize')return jsonEvent(events,'reader:'+node.name,[requestedJsonExpression(node.args[0],env,events,guard,true,depth+1),jsonNativeIndex(requestedJsonExpression(node.args[1],env,events,guard,false,depth+1))]);if(!['json-ref','str','bool','u64','i64'].includes(optional)||op.args.slice(1).some(role=>role!=='str'))jsonFail('only supported shared/primitive standard optional readers are drafted');return jsonEvent(events,'reader:'+node.name,node.args.map((argument,index)=>requestedJsonExpression(argument,env,events,guard,index===0,depth+1)));}
 if(node.kind==='owned-call'&&Object.hasOwn(BOUNDED_JSON_RUNTIME_OPERATIONS,node.name)){const op=BOUNDED_JSON_RUNTIME_OPERATIONS[node.name];if(op.args.length!==node.args.length||op.ret!==node.type)jsonFail('actual bounded runtime operation signature differs');let name=op.rust==='json_checked_copy'?'copy':op.rust==='json_checked_with_field'?'with-field':op.rust==='json_validate'?'validate':'build-'+op.rust.slice('json_build_'.length);if(name==='build-i64'&&node.args[0].type!=='i64')name='build-i64_unsigned';return jsonEvent(events,name,node.args.map((argument,index)=>requestedJsonExpression(argument,env,events,guard,op.args[index]==='json',depth+1)));}
 if(node.kind==='owned-call'&&['router_core_json_copy','json_macro_value'].includes(node.name)&&node.args.length===1)return jsonEvent(events,'copy',[requestedJsonExpression(node.args[0],env,events,guard,true,depth+1)]);
 if(node.kind==='owned-call'&&node.name==='router_core_json_with_field'&&node.args.length===3)return jsonEvent(events,'with-field',node.args.map(argument=>requestedJsonExpression(argument,env,events,guard,true,depth+1)));
 if(node.kind==='owned-call'&&['json_macro_null','json_macro_bool','json_macro_string','json_macro_u64','json_macro_i64'].includes(node.name)){const suffix=node.name==='json_macro_i64'&&node.args[0].type!=='i64'?'i64_unsigned':node.name.slice('json_macro_'.length),args=node.args.map(argument=>requestedJsonExpression(argument,env,events,guard,false,depth+1));return jsonEvent(events,'build-'+suffix,args);}
 if(['json-array','json-object'].includes(node.kind)){if(node.kind==='json-object'&&!node.entries.length)return jsonEvent(events,'build-object',[]);const children=node.kind==='json-array'?node.items:node.entries.map(entry=>entry.value),values=children.map(child=>child.type==='json'&&['owned-call','json-array','json-object','json-field-call'].includes(child.kind)?requestedJsonExpression(child,env,events,guard,false,depth+1):jsonEvent(events,'copy',[requestedJsonExpression(child,env,events,guard,true,depth+1)]));if(node.kind==='json-array')return jsonEvent(events,'build-array',[['vector',values]]);const keys=node.entries.map(entry=>jsonEvent(events,'build-string',[['str',entry.key]])),keyArray=jsonEvent(events,'build-array',[['vector',keys]]);return jsonEvent(events,'build-fields',[keyArray,['vector',values]]);}
 if(node.kind==='json-vector-literal'&&node.items.length<=4096)return ['vector',node.items.map(child=>child.type==='json'&&['owned-call','json-array','json-object','json-field-call'].includes(child.kind)?requestedJsonExpression(child,env,events,guard,false,depth+1):jsonEvent(events,'copy',[requestedJsonExpression(child,env,events,guard,true,depth+1)]))];
 jsonFail('JSON constructor/update/reader expression needs its next source rule');
}
export function requestedNativeJsonVectorTree(item){
 const guard=jsonControlFrame(item),env=new Map(item.params.map((param,index)=>[param.name,['parameter',index]])),events=[];
 for(let index=0;index<item.params.length;index++)if(['json','json-ref'].includes(item.params[index].type))jsonEvent(events,'validate',[['parameter',index]]);
 function body(rows,names,effects,depth){
  guard.charge(depth);if(!Array.isArray(rows)||!rows.length)jsonFail('complete terminating receiving body required');
  for(let at=0;at<rows.length;at++){
   const node=rows[at];if(node.kind==='effect'){if(node.value?.kind!=='owned-call'||node.value.name!=='router_vector_json_validate'||node.value.type!=='unit')jsonFail('only privately issued validation effects may be discarded');requestedJsonExpression(node.value,names,effects,guard);continue;}if(node.kind==='let'){if(names.has(node.name))jsonFail('unique immutable receiving binder required');names.set(node.name,requestedJsonExpression(node.value,names,effects,guard));continue;}
   if(at!==rows.length-1)jsonFail('terminator must close the complete receiving body');
   if(node.kind==='return'){guard.leaf();return [effects,requestedJsonExpression(node.value,names,effects,guard)];}
   if(node.kind==='if'){let condition=requestedJsonExpression(node.cond,names,effects,guard),yes=node.then,no=node.else;if(condition[0]==='not'&&condition[1]?.[0]==='some'){condition=condition[1];[yes,no]=[no,yes];}return [effects,['if',condition,body(yes,new Map(names),[...effects],depth+1),body(no,new Map(names),[...effects],depth+1)]];}
   jsonFail('unregistered receiving statement');
  }jsonFail('missing receiving terminator');
 }
 return body(item.body,env,events,0);
}
export function observedNativeJsonVectorTree(own,item,lowered,nativeTargets){
 const guard=jsonControlFrame(item),domain=item.vectorOrigin?.kind==='primitive-scalar'?originalPrimitiveScalarDomain(own,lowered):item.vectorOrigin?.kind==='json-value'?originalJsonOwnedValueDomain(own,lowered):item.vectorOrigin?.kind==='json-scalar'?originalJsonScalarDomain(own,lowered):originalJsonVectorDomain(own,lowered);if(!domain||domain.type!==item.returns||own.k!=='fn'||own.async||own.params.length!==item.params.length||domain.parameters.some((param,index)=>param.name!==item.params[index].type)||own.params.some((param,index)=>param.name!==item.params[index].rust))jsonFail('actual canonical native signature differs');
 const jsonReturn=item.vectorOrigin.kind==='primitive-scalar'?null:item.vectorOrigin.kind==='json-scalar'?{kind:'data',name:domain.canonicalSourceName}:own.ret?.kind==='data'?own.ret:own.ret?.element,env=new Map(own.params.map((param,index)=>[param.name,['parameter',index]]));const fieldType=(type,wanted)=>{const option=ownedJsonOptionalPayload(wanted);if(option)return originalJsonVectorOptionPayload(own,lowered,type)===option;if(!type||type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved)return false;const pointee=type.rustReference?.kind==='shared'?type.rustReference.pointee:type,canonical=pointee?.kind==='data'&&pointee.name===jsonReturn.name&&!pointee.rustReference&&!pointee.rustOwnership&&!pointee.rustGenericIdentityUnresolved&&!pointee.rustBorrowingUnresolved;if(wanted==='json-ref')return canonical&&(!type.rustReference||type.rustReference.kind==='shared');if(wanted==='json')return canonical&&!type.rustReference;if(type.rustReference)return false;if(wanted==='str')return type.kind==='string'&&type.rustOwnership?.kind==='borrowed'&&type.rustOwnership.source==='str';if(type.rustOwnership)return false;if(wanted==='bool')return type.kind==='bool';const row=primitiveBitwiseType(wanted);return !!row&&type.kind==='fixed'&&type.bits===row.bits&&type.signed===row.signed&&type.rustPrimitiveName===row.name;};
 const sourceCallTargets=new Map(nativeTargets);
 let activeSomeFacts=new Set();const optionKey=value=>JSON.stringify(value);
 function expression(node,names,events,depth=0){
  guard.charge(depth);if(!node)jsonFail('complete actual native expression required');if(node.k==='routerOrderedMatchArms'){if(item.vectorOrigin.kind!=='primitive-scalar')jsonFail('ordered match requires its separately checked primitive source profile');return observeNativeOrderedScalarExpression(node,{guard,names,events,depth,expression,choose:jsonChoose});}const total=actualNativeTotalOperator(node,arg=>expression(arg,names,events,depth+1));if(total!==null)return total;
  if(node.k==='cast'&&node.arg?.k==='routerHostCall'&&node.arg.id==='router_core_unicode_scalar_count'){const source=node.arg.type;if(!fieldType(node.type,'u64')||source?.kind!=='fixed'||source.rustPrimitiveName!=='usize'||source.bits!==64||source.signed!==false||source.rustReference||source.rustOwnership||source.patternOwnershipRefusal||source.rustGenericIdentityUnresolved||source.rustBorrowingUnresolved)jsonFail('only actual lossless 64-bit scalar-count usize to u64 is drafted');return expression(node.arg,names,events,depth+1);}
  if(node.k==='routerHostCall'&&ownedVectorTextScalarOperation(node.id)){const op=ownedVectorTextScalarOperation(node.id),count=node.id==='router_core_unicode_scalar_count',result=count?node.type?.kind==='fixed'&&node.type.rustPrimitiveName==='usize'&&node.type.bits===64&&node.type.signed===false&&!node.type.rustReference&&!node.type.rustOwnership&&!node.type.patternOwnershipRefusal&&!node.type.rustGenericIdentityUnresolved&&!node.type.rustBorrowingUnresolved:fieldType(node.type,'bool');if(!result||node.args?.length!==op.args.length||node.args.some(argument=>!fieldType(argument.type,'str'))||node.compatibilityCore?.id!==(count?'router-owned-unicode-scalar-count-v1':'router-owned-ascii-chars-in-v1')||node.compatibilityCore.symbol!=='crate::translation_core::'+op.rust||node.compatibilityCore.sourceSha256!==ROUTER_CORE_PRIMITIVES_SHA256)jsonFail('actual source-bound text scalar ABI/library differs');return jsonEvent(events,'text-scalar:'+node.id,node.args.map(argument=>expression(argument,names,events,depth+1)));}
  if(node.k==='call'){const target=nativeScalarSourceCallTarget(node,sourceCallTargets,lowered);if(!target)jsonFail('actual native helper is outside the checked source closure');const args=node.args.map(argument=>expression(argument,names,events,depth+1));function sourceText(value,level=0){if(level>64)return false;return value?.[0]==='str'||value?.[0]==='parameter'&&item.params[value[1]]?.type==='str'||value?.[0]==='choose'&&sourceText(value[2],level+1)&&sourceText(value[3],level+1);}if(target.parameters.some((role,index)=>role==='str'&&!sourceText(args[index])))jsonFail('automatic helper JSON text transfer needs an independent readonly loan rule');return ['source-call',target.rust,args];}
  if(node.k==='var'){if(!names.has(node.name))jsonFail('actual native lexical binder required');return names.get(node.name);}
  if(node.k==='routerPatternImmutable'){if(!originalJsonVectorOptionPayload(own,lowered,node.object?.type))jsonFail('actual standard Option immutable observation required');return ['immutable-option',expression(node.object,names,events,depth+1)];}
  if(node.k==='routerPatternTag'){if(!originalJsonVectorOptionPayload(own,lowered,node.object?.type)||node.data!==node.object.type.name||!['Some','None'].includes(node.ctor))jsonFail('actual standard Option constructor tag required');const value=['some',expression(node.object,names,events,depth+1)];return node.ctor==='Some'?value:jsonNot(value);}
  if(node.k==='routerPatternProjection'){const role=originalJsonVectorOptionPayload(own,lowered,node.object?.type),value=expression(node.object,names,events,depth+1);if(!role||node.field!=='field0'||!fieldType(node.type,role)||!activeSomeFacts.has(optionKey(value)))jsonFail('actual checked payload needs its dominating Some branch');return ['payload',value];}
  if(node.k==='lit'&&node.type?.kind==='string'&&!node.type.rustReference&&node.type.rustOwnership?.kind==='borrowed'&&node.type.rustOwnership.source==='str'&&typeof node.value==='string'&&!/\p{Surrogate}/u.test(node.value))return ['str',node.value];
  if(node.k==='lit'&&node.type?.kind==='fixed'&&(primitiveBitwiseType(node.type.rustPrimitiveName)||node.type.rustPrimitiveName==='usize')&&!node.type.rustReference&&!node.type.rustGenericIdentityUnresolved&&!node.type.rustBorrowingUnresolved)return ['integer',node.type.rustPrimitiveName,BigInt(node.value).toString()];
  if(node.k==='lit'&&node.type?.kind==='bool'&&typeof node.value==='boolean')return ['bool',node.value];
  if(node.k==='unary'&&node.op==='not'&&node.type?.kind==='bool')return jsonNot(expression(node.arg,names,events,depth+1));
  if(node.k==='binary'&&['and','or'].includes(node.op)&&node.type?.kind==='bool'){const left=expression(node.left,names,events,depth+1),right=expression(node.right,names,events,depth+1);if(node.op==='and'&&left[0]==='immutable-option'&&right[0]==='some'&&optionKey(left[1])===optionKey(right[1]))return right;return [node.op,left,right];}
  if(node.k==='binary'){const op=jsonScalarComparisonOperation(node.op,{native:true}),domain=jsonScalarComparisonDomain(node.left?.type,{native:true});if(op){if(node.type?.kind!=='bool'||node.type.rustReference||!domain||domain!==jsonScalarComparisonDomain(node.right?.type,{native:true})||op.kind==='comparison'&&!primitiveBitwiseType(domain))jsonFail('actual resolved native scalar comparison domains differ');return ['compare',op.op,domain,expression(node.left,names,events,depth+1),expression(node.right,names,events,depth+1)];}}
  if(node.k==='let'){if(node.mutable||names.has(node.name))jsonFail('unique immutable actual native binder required');const value=expression(node.value,names,events,depth+1),local=new Map(names);local.set(node.name,value);return expression(node.body,local,events,depth+1);}
  if(node.k==='if'&&['bool','string','fixed'].includes(node.type?.kind)){const before=events.length,condition=expression(node.cond,names,events,depth+1),prior=activeSomeFacts;let yes,no;try{activeSomeFacts=new Set(prior);if(condition[0]==='some')activeSomeFacts.add(optionKey(condition[1]));else if(condition[0]==='not'&&condition[1]?.[0]==='some')activeSomeFacts.delete(optionKey(condition[1][1]));yes=expression(node.then,new Map(names),events,depth+1);activeSomeFacts=new Set(prior);if(condition[0]==='some')activeSomeFacts.delete(optionKey(condition[1]));else if(condition[0]==='not'&&condition[1]?.[0]==='some')activeSomeFacts.add(optionKey(condition[1][1]));no=expression(node.else,new Map(names),events,depth+1);}finally{activeSomeFacts=prior;}if(events.length!==before)jsonFail('actual primitive conditional has non-scalar effects');return jsonChoose(condition,yes,no);}
  if(node.k==='routerHostCall'){const row=ownedVectorJsonFieldOperation(node.id);if(row){if(node.args?.length!==row.args.length||!fieldType(node.type,row.ret)||row.ret==='json-ref'&&node.type.rustReference?.kind!=='shared'||node.args.some((argument,index)=>!fieldType(argument.type,row.args[index]))||node.compatibilityCore?.id!=='router-owned-json-field-v1'||node.compatibilityCore.sourceSha256!==createHash('sha256').update(JSON_FIELDS_NATIVE_SOURCE).digest('hex')||node.compatibilityCore.symbol!==row.rustPath)jsonFail('actual source-bound field/default operation differs');const args=node.args.map(argument=>expression(argument,names,events,depth+1));if(node.id==='router_field_json_index_or_null')return jsonEvent(events,'index-usize',[args[0],jsonNativeIndex(args[1])]);if(node.id==='router_field_json_index')return jsonEvent(events,'reader:serde_json_value_get_usize',[args[0],jsonNativeIndex(args[1])]);return jsonEvent(events,'field:'+node.id,args);}}
  if(node.k==='routerHostCall'&&node.id==='router_core_json_index_usize'){if(node.args?.length!==2||node.type?.name!==jsonReturn.name||node.type.rustReference?.kind!=='shared'||node.args[1].type?.kind!=='fixed'||node.args[1].type.rustPrimitiveName!=='usize'||node.args[1].type.bits!==64||node.args[1].type.signed!==false||node.compatibilityCore?.id!=='router-owned-json-update-v1'||node.compatibilityCore.symbol!=='crate::translation_core::json_index_usize'||node.compatibilityCore.sourceSha256!==ROUTER_CORE_PRIMITIVES_SHA256)jsonFail('actual source-bound 64-bit canonical JSON index differs');const args=node.args.map(argument=>expression(argument,names,events,depth+1));return jsonEvent(events,'index-usize',[args[0],jsonNativeIndex(args[1])]);}
  if(node.k==='routerHostCall'&&node.id==='router_core_json_index_str'){if(node.args?.length!==2||node.type?.name!==jsonReturn.name||node.type.rustReference?.kind!=='shared'||node.compatibilityCore?.id!=='router-owned-json-update-v1'||node.compatibilityCore.symbol!=='crate::translation_core::json_index_str'||node.compatibilityCore.sourceSha256!==ROUTER_CORE_PRIMITIVES_SHA256)jsonFail('actual source-bound shared JSON projection differs');return jsonEvent(events,'index-str',node.args.map(argument=>expression(argument,names,events,depth+1)));}
  if(node.k==='routerHostCall'&&node.id==='serde_json_value_get_usize'){const index=node.args?.[1]?.type;if(node.args?.length!==2||!fieldType(node.type,'json-option-ref')||!fieldType(node.args[0].type,'json-ref')||index?.kind!=='fixed'||index.rustPrimitiveName!=='usize'||index.bits!==64||index.signed!==false||index.rustReference||index.rustOwnership||index.rustGenericIdentityUnresolved||index.rustBorrowingUnresolved)jsonFail('actual standard 64-bit optional JSON index ABI differs');return jsonEvent(events,'reader:'+node.id,[expression(node.args[0],names,events,depth+1),jsonNativeIndex(expression(node.args[1],names,events,depth+1))]);}
  if(node.k==='routerHostCall'){const op=ownedJsonReaderOperation(node.id),payload=op&&ownedJsonOptionalPayload(op.ret);if(['json-ref','str','bool','u64','i64'].includes(payload)&&op.args.slice(1).every(role=>role==='str')){if(node.args?.length!==op.args.length||!fieldType(node.type,op.ret)||node.args.some((argument,index)=>!fieldType(argument.type,op.args[index])))jsonFail('actual complete standard JSON optional ABI differs');return jsonEvent(events,'reader:'+node.id,node.args.map(argument=>expression(argument,names,events,depth+1)));}}
  if(node.k==='routerHostCall'){const op=ownedJsonReaderOperation(node.id);if(op?.ret==='bool'){if(node.type?.kind!=='bool'||node.type.rustReference||node.args?.length!==1||node.args[0].type?.name!==jsonReturn.name||node.args[0].type.rustReference&&node.args[0].type.rustReference.kind!=='shared')jsonFail('actual canonical standard JSON predicate signature differs');return jsonEvent(events,'predicate:'+node.id,[expression(node.args[0],names,events,depth+1)]);}}
  if(node.k==='routerHostCall'&&node.id.startsWith('router_vector_json_build_')){const suffix=node.id.slice('router_vector_json_build_'.length),operation=boundedJsonCoreOperation('json_build_'+suffix);if(!operation||operation.id!==node.id||operation.params.length!==node.args?.length||node.type?.name!==jsonReturn.name||node.compatibilityCore?.id!=='router-owned-json-update-v1'||node.compatibilityCore.sourceSha256!==BOUNDED_JSON_CORE_SHA256||node.compatibilityCore.symbol!=='crate::translation_json_core::json_build_'+suffix)jsonFail('actual canonical native builder source boundary differs');return jsonEvent(events,'build-'+suffix,node.args.map(argument=>expression(argument,names,events,depth+1)));}
  if(node.k==='routerHostCall'&&['router_vector_json_validate','router_vector_json_copy','router_vector_json_with_field'].includes(node.id)){
   const operation=node.id==='router_vector_json_validate'?'validate':node.id==='router_vector_json_copy'?'copy':'with-field',name=operation==='validate'?'json_validate':operation==='copy'?'json_checked_copy':'json_checked_with_field';
   if(node.args?.length!==(operation==='with-field'?3:1)||node.compatibilityCore?.id!=='router-owned-json-update-v1'||node.compatibilityCore.sourceSha256!==BOUNDED_JSON_CORE_SHA256||node.compatibilityCore.symbol!=='crate::translation_json_core::'+name||operation==='validate'&&node.type?.kind!=='unit'||operation!=='validate'&&node.type?.name!==jsonReturn.name)jsonFail('actual privately checked bounded native operation differs');
   return jsonEvent(events,operation,node.args.map(argument=>expression(argument,names,events,depth+1)));
  }
  if(node.k==='array'&&node.items.length<=4096&&node.compatibilityCore?.id==='router-core-vector-list-v1'&&(sameType(node.type,own.ret)||['json-value','json-scalar'].includes(item.vectorOrigin.kind)&&node.type?.kind==='array'&&sameType(node.type.element,jsonReturn)&&node.type.rustOwnership?.kind==='owned'&&node.type.rustOwnership.source==='Vec'&&!node.type.rustReference&&!node.type.rustFixedArray&&!node.type.rustGenericIdentityUnresolved&&!node.type.rustBorrowingUnresolved))return ['vector',node.items.map(child=>expression(child,names,events,depth+1))];
  jsonFail('actual native expression is outside the drafted copy/control projection');
 }
 function body(node,names,events,depth,facts=activeSomeFacts){const prior=activeSomeFacts;activeSomeFacts=new Set(facts);try{
  guard.charge(depth);while(node?.k==='let'){if(node.mutable||names.has(node.name))jsonFail('unique immutable actual body binder required');names.set(node.name,expression(node.value,names,events,depth+1));node=node.body;}
  if(node?.k==='routerOrderedMatchArms'){if(item.vectorOrigin.kind!=='primitive-scalar')jsonFail('ordered match requires its separately checked primitive source profile');return observeNativeOrderedScalarBody(node,{guard,names,events,depth,expression,body});}
  if(node?.k==='if'){const condition=expression(node.cond,names,events,depth+1),yes=new Set(activeSomeFacts),no=new Set(activeSomeFacts);if(condition[0]==='some'){yes.add(optionKey(condition[1]));no.delete(optionKey(condition[1]));}else if(condition[0]==='not'&&condition[1]?.[0]==='some'){yes.delete(optionKey(condition[1][1]));no.add(optionKey(condition[1][1]));}return [events,['if',condition,body(node.then,new Map(names),[...events],depth+1,yes),body(node.else,new Map(names),[...events],depth+1,no)]];}
  guard.leaf();if(item.vectorOrigin.kind==='json-value'&&(!sameType(node?.type,own.ret)||node.type.rustReference||node.type.rustOwnership||node.type.patternOwnershipRefusal||node.type.rustGenericIdentityUnresolved||node.type.rustBorrowingUnresolved))jsonFail('actual canonical owned JSON scalar return required');if(['json-scalar','primitive-scalar'].includes(item.vectorOrigin.kind)&&!fieldType(node?.type,item.returns))jsonFail('actual original primitive return ABI differs');const result=expression(node,names,events,depth+1);if(item.vectorOrigin.kind==='json-vector'&&result?.[0]!=='vector')jsonFail('complete native owned vector return required');return [events,result];
 }finally{activeSomeFacts=prior;}}
 try{return body(own.body,env,[],0);}finally{sourceCallTargets.clear();}
}
export function emitNativeJsonVectorControlBody(item,input=[item]){
 const wanted=checkOwnedCoreItem(item),program=checkOwnedCoreProgram(input),selected=program.filter(row=>row.source.path===wanted.source.path&&row.javascript===wanted.javascript);if(selected.length!==1||ownedCoreContext(selected[0])!==ownedCoreContext(wanted)||JSON.stringify(requestedNativeJsonVectorTree(selected[0]))!==JSON.stringify(requestedNativeJsonVectorTree(wanted)))jsonFail('selected native body requires its complete genuine source program');return nativeJsonFunctionSourceBody(emitOwnedCoreProgram(program,'rust',{nativeJsonSource:true,selectedFunction:wanted.javascript}));
}
// DATA extraction only. This function grants no checked-item permission.
export function nativeJsonFunctionSourceBody(source){
 if(typeof source!=='string'||source.length>8388608)jsonFail('bounded emitted native function source required');const tokens=rustTokens(source).filter(token=>token.type!=='comment');const fn=tokens.findIndex(token=>token.text==='fn'),start=tokens.findIndex((token,index)=>index>fn&&token.text==='{'),end=tokens.at(-1);if(fn<0||start<0||end?.text!=='}')jsonFail('complete emitted native JSON function body required');return source.slice(tokens[start].end,end.start).trimEnd();
}
import {originalJsonVectorDomain,originalJsonOwnedValueDomain,originalJsonScalarDomain,originalPrimitiveScalarDomain,originalJsonVectorOptionPayload} from './owned-vector-json-native.mjs';
import {BOUNDED_JSON_CORE_SHA256} from '../bounded-json-core-source-data.mjs';
import {sameType} from '../checked-types.mjs';
import {emitOwnedCoreProgram,checkOwnedCoreItem,checkOwnedCoreProgram,ownedCoreContext} from './owned-vector-candidate-operations.mjs';
import {rustTokens} from '../rust-structure.mjs';

import {boundedJsonCoreOperation} from '../bounded-json-core-call-source.mjs';

import {BOUNDED_JSON_RUNTIME_OPERATIONS} from './bounded-json-runtime-operations.mjs';

import {ownedJsonReaderOperation,ownedJsonOptionalPayload} from './owned-json-source.mjs';
import {ROUTER_CORE_PRIMITIVES_SHA256} from '../router-core-source-data.mjs';

import {ownedVectorJsonFieldOperation} from './owned-vector-json-fields.mjs';
import {JSON_FIELDS_NATIVE_SOURCE} from '../json-fields-native-source.mjs';
import {createHash} from 'node:crypto';

import {jsonScalarComparisonOperation,jsonScalarComparisonDomain} from './owned-vector-json-comparisons.mjs';

import {nativeScalarSourceCallIndex,nativeScalarSourceCallTarget} from './owned-source-scalar-calls.mjs';

import {ownedVectorTextScalarOperation} from './owned-vector-text-scalars.mjs';

import {primitiveBitwiseType} from '../primitive-bitwise-types.mjs';

import {requestedNativeTotalOperator,actualNativeTotalOperator} from './owned-native-total-operators.mjs';

import {observeNativeOrderedScalarBody,observeNativeOrderedScalarExpression} from './owned-native-ordered-scalars.mjs';

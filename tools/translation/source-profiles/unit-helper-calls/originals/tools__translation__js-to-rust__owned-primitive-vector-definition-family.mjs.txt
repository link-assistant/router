// Exact existing predicate inverse operation DATA; no semantic authority.
const PREDICATE_INVERSE_OPERATIONS=Object.freeze([
 Object.freeze({op:'eq',kind:'equality',target:'===',rust:'=='}),Object.freeze({op:'ne',kind:'equality',target:'!==',rust:'!='}),
 Object.freeze({op:'lt',kind:'comparison',target:'<',rust:'<'}),Object.freeze({op:'le',kind:'comparison',target:'<=',rust:'<='}),Object.freeze({op:'gt',kind:'comparison',target:'>',rust:'>'}),Object.freeze({op:'ge',kind:'comparison',target:'>=',rust:'>='}),
 Object.freeze({op:'and',kind:'logic',target:'&&',rust:'&&'}),Object.freeze({op:'or',kind:'logic',target:'||',rust:'||'}),
]);
export function jsonScalarComparisonOperation(op,{native=false}={}){return PREDICATE_INVERSE_OPERATIONS.find(row=>row.kind!=='logic'&&(native?row.op===op:row.target===op))??null;}
export function jsonScalarComparisonDomain(type,{native=false}={}){
 if(!native)return type==='usize'?'u64':primitiveBitwiseType(type)?.name??(['bool','str'].includes(type)?type:null);
 if(!type||type.rustReference||type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved||type.patternOwnershipRefusal)return null;
 if(type.kind==='bool'&&!type.rustOwnership)return 'bool';
 if(type.kind==='string'&&type.rustOwnership?.kind==='borrowed'&&type.rustOwnership.source==='str')return 'str';
 const row=primitiveBitwiseType(type.rustPrimitiveName);if(type.kind==='fixed'&&!type.rustOwnership&&row&&type.bits===row.bits&&type.signed===row.signed)return row.name;
 return null;
}

import {primitiveBitwiseType} from '../primitive-bitwise-types.mjs';

// Exact literal DATA substitution inside genuine current native constants.
// Source/type/constant provenance is independently checked by the caller.
const constantFail=message=>{throw new TypeError('Native constant value: '+message);};
export function nativeConstantScalarRole(type){
 if(!type||type.rustReference||type.rustOwnership||type.patternOwnershipRefusal||type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved)return null;
 if(type.kind==='bool')return 'bool';const row=primitiveBitwiseType(type.rustPrimitiveName);return type.kind==='fixed'&&row&&type.bits===row.bits&&type.signed===row.signed?row.name:null;
}
export function requireNativeConstantLiteral(model,domain){
 if(domain==='bool'){if(!Array.isArray(model)||model.length!==2||model[0]!=='bool'||typeof model[1]!=='boolean')constantFail('exact Boolean literal substitution required');return model;}
 const row=primitiveBitwiseType(domain);if(!row||!Array.isArray(model)||model.length!==3||model[0]!=='integer'||model[1]!==domain||typeof model[2]!=='string'||!/^[-]?(?:0|[1-9][0-9]{0,38})$/u.test(model[2]))constantFail('exact bounded fixed integer literal required');
 const value=BigInt(model[2]);if(value<(row.signed?-BigInt(row.minimumAbs):0n)||value>BigInt(row.maximum))constantFail('literal exceeds original primitive domain');return model;
}
const constantValue=(model,domain)=>{const checked=requireNativeConstantLiteral(model,domain);return domain==='bool'?checked[1]:BigInt(checked[2]);};
const constantInteger=(domain,value)=>requireNativeConstantLiteral(['integer',domain,value.toString()],domain);
export function observeNativeConstantSelection(node,read,locals){
 const domain=nativeConstantScalarRole(node.type);if(!domain)constantFail('plain exact primitive constant node required');
 if(node.k==='var'){const row=locals.get(node.name);if(!row||!sameType(row.type,node.type)||nativeConstantScalarRole(row.type)!==domain)constantFail('actual available immutable constant binder required');return requireNativeConstantLiteral(row.value,domain);}
 if(node.k==='let'){
  if(node.mutable||typeof node.name!=='string'||locals.has(node.name)||locals.size>=64||!sameType(node.type,node.body?.type))constantFail('bounded unique immutable constant binding required');
  const value=read(node.value),scope=new Map(locals);scope.set(node.name,{type:node.value.type,value});return requireNativeConstantLiteral(read(node.body,scope),domain);
 }
 if(node.k==='if'){
  if(nativeConstantScalarRole(node.cond?.type)!=='bool'||!sameType(node.type,node.then?.type)||!sameType(node.type,node.else?.type))constantFail('exact primitive constant branch domains required');
  const condition=constantValue(read(node.cond),'bool'),yes=requireNativeConstantLiteral(read(node.then),domain),no=requireNativeConstantLiteral(read(node.else),domain);return condition?yes:no;
 }
 if(node.k==='unary'&&node.op==='not'&&domain==='bool'){
  if(nativeConstantScalarRole(node.arg?.type)!=='bool')constantFail('Boolean complement operand required');return ['bool',!constantValue(read(node.arg),'bool')];
 }
 if(node.k==='binary'&&['and','or'].includes(node.op)&&domain==='bool'){
  if(nativeConstantScalarRole(node.left?.type)!=='bool'||nativeConstantScalarRole(node.right?.type)!=='bool')constantFail('Boolean constant operands required');const left=constantValue(read(node.left),'bool'),right=constantValue(read(node.right),'bool');return ['bool',node.op==='and'?left&&right:left||right];
 }
 const comparison=node.k==='binary'?jsonScalarComparisonOperation(node.op,{native:true}):null;
 if(comparison){
  const input=nativeConstantScalarRole(node.left?.type);if(domain!=='bool'||!input||input!==nativeConstantScalarRole(node.right?.type)||!sameType(node.left.type,node.right.type)||comparison.kind==='comparison'&&input==='bool')constantFail('identical original constant comparison operands required');
  const left=constantValue(read(node.left),input),right=constantValue(read(node.right),input);let value;switch(comparison.op){case 'eq':value=left===right;break;case 'ne':value=left!==right;break;case 'lt':value=left<right;break;case 'le':value=left<=right;break;case 'gt':value=left>right;break;case 'ge':value=left>=right;break;default:constantFail('unknown constant comparison');}return ['bool',value];
 }
 return null;
}
export function foldNativeConstantTotal(model){
 if(!Array.isArray(model))constantFail('complete total constant operation required');if(model[0]==='bool'||model[0]==='integer')return requireNativeConstantLiteral(model,model[0]==='bool'?'bool':model[1]);const [kind,a,b,c]=model;
 const width=(domain,value)=>{const row=primitiveBitwiseType(domain);if(!row)constantFail('registered exact constant width required');return row.signed?BigInt.asIntN(row.bits,value):BigInt.asUintN(row.bits,value);};
 if(kind==='fixed-bitwise'){
  if(model.length!==4||!['&','|','^'].includes(a)||!Array.isArray(c)||c.length!==2)constantFail('exact eager constant bitwise operation required');const left=constantValue(c[0],b),right=constantValue(c[1],b);if(b==='bool')return ['bool',a==='&'?left&&right:a==='|'?left||right:left!==right];return constantInteger(b,a==='&'?left&right:a==='|'?left|right:left^right);
 }
 if(kind==='fixed-not'){if(model.length!==3)constantFail('exact constant complement required');return constantInteger(a,width(a,~constantValue(b,a)));}
 if(kind==='fixed-cast'){if(model.length!==4)constantFail('exact constant cast required');return constantInteger(b,width(b,constantValue(c,a)));}
 if(kind==='fixed-method'){
  const row=primitiveBitwiseType(b),method=totalNativeIntegerMethod(a);if(model.length!==4||!row||!method||!Array.isArray(c)||c.length!==method.arity||method.arity!==2)constantFail('qualified total constant method required');const left=constantValue(c[0],b),right=constantValue(c[1],b),low=row.signed?-BigInt(row.minimumAbs):0n,high=BigInt(row.maximum);let value;
  switch(a){case 'min':value=left<right?left:right;break;case 'max':value=left>right?left:right;break;case 'wrapping_add':value=width(b,left+right);break;case 'wrapping_sub':value=width(b,left-right);break;case 'wrapping_mul':value=width(b,left*right);break;case 'saturating_add':value=left+right;break;case 'saturating_sub':value=left-right;break;case 'saturating_mul':value=left*right;break;default:constantFail('unsupported total constant method');}if(a.startsWith('saturating_'))value=value<low?low:value>high?high:value;return constantInteger(b,value);
 }
 constantFail('unsupported total constant model');
}
import {sameType} from '../checked-types.mjs';
import {totalNativeIntegerMethod} from './owned-native-division-operators.mjs';

// DATA validation only. Only the original source checker can issue a function;
// this helper is never a source/type/namespace or executable permission token.
export function assertOwnedPrimitiveVectorDefinition({params,returns,resultRoot,body:statements,hostCalls=[],sourceCalls=[]}){
 const stop=message=>{throw new TypeError('Owned primitive definition: '+message);};
  const parameterRole=type=>type==='str'||type==='bool'||type==='usize'||!!primitiveBitwiseType(type),role=type=>type!=='str'&&parameterRole(type)||primitiveVectorResultRole(type),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);let work=0;
  function expression(value,depth){
   if(value?.kind==='unit'&&value.type==='unit'&&value.root===null){if(++work>100000||depth>160)stop('bounded exact unit return required');return;}
   if(value?.type==='str'){if(++work>100000||depth>160)stop('bounded original borrowed text operand required');if(value.kind==='string'&&value.root===null&&typeof value.value==='string'&&!/\p{Surrogate}/u.test(value.value))return;if(value.kind==='variable'&&params.some(param=>param.name===value.root&&param.type==='str'))return;if(value.kind==='choose'){expression(value.cond,depth+1);if(value.cond.type!=='bool'||value.then.type!=='str'||value.else.type!=='str')stop('actual borrowed text choice domains required');expression(value.then,depth+1);expression(value.else,depth+1);return;}stop('text operands require a live original parameter or scalar literal');}
   if(++work>100000||depth>160||!value||!role(value.type)||value.root!==null)stop('bounded plain primitive insertion expression required');
   if(value.kind==='text-scalar-call'){const op=ownedVectorTextScalarOperation(value.name);if(!op||value.type!==op.ret||!Array.isArray(value.args)||value.args.length!==op.args.length||value.args.some((arg,index)=>arg.type!==op.args[index]))stop('actual fixed borrowed text operation domain required');for(const argument of value.args)expression(argument,depth+1);return;}
   if(value.kind==='primitive-vector-literal'){if(!primitiveVectorResultRole(value.type)||!Array.isArray(value.items)||value.items.length>4096||value.items.some(item=>item.type!==value.type.slice(4)))stop('exact bounded primitive vector items required');for(const item of value.items)expression(item,depth+1);return;}
   if(value.kind==='bool'||value.kind==='integer'||value.kind==='variable')return;
   if(value.kind==='not'){expression(value.value,depth+1);return;}
   if(value.kind==='binary'&&['&&','||','===','!==','<','<=','>','>='].includes(value.op)){expression(value.left,depth+1);expression(value.right,depth+1);return;}

   if(value.kind==='source-scalar-call'){const callee=value.callee,closed=type=>type==='bool'||!!primitiveBitwiseType(type);if(!callee||callee.returns!==value.type||!closed(callee.returns)&&!primitiveVectorResultRole(callee.returns)||!Array.isArray(callee.parameters)||callee.parameters.some(type=>!closed(type)&&type!=='str')||!Array.isArray(value.args)||value.args.length!==callee.parameters.length)stop('actual complete closed primitive helper operands required');for(const argument of value.args)expression(argument,depth+1);return;}
   if(value.kind==='choose'){expression(value.cond,depth+1);expression(value.then,depth+1);expression(value.else,depth+1);return;}
   if(['primitive-bitwise-call','primitive-not-call','primitive-cast-call','primitive-method-call','primitive-arithmetic-call'].includes(value.kind)){requireOwnedNativeClosedCall(value);for(const argument of value.args)expression(argument,depth+1);return;}
   stop('new function needs its next explicit insertion operation/effect rule');
  }
  function body(rows,depth=0){if(++work>100000||depth>160||!Array.isArray(rows)||!rows.length)stop('complete bounded primitive insertion body required');for(let index=0;index<rows.length;index++){const row=rows[index];if(row.kind==='let'){expression(row.value,depth+1);continue;}if(index!==rows.length-1)stop('new primitive function terminator must close its original body');if(row.kind==='return'){expression(row.value,depth+1);return;}if(row.kind==='if'){expression(row.cond,depth+1);body(row.then,depth+1);body(row.else,depth+1);return;}stop('new statement requires its separate insertion rule');}stop('complete primitive insertion return required');}

 if(!Array.isArray(params)||params.length>32||returns!=='unit'&&!role(returns)||resultRoot!==null||params.some(param=>!parameterRole(param.type))||!Array.isArray(hostCalls)||hostCalls.some(call=>!ownedNativeClosedOperator(call.name)&&!ownedVectorTextScalarOperation(call.name))||!Array.isArray(sourceCalls)||sourceCalls.length>16384)stop('closed primitive parameters result and separately qualified total operations required');
 body(statements);return true;
}
import {ownedNativeClosedOperator,requireOwnedNativeClosedCall} from './owned-native-division-operators.mjs';

import {primitiveVectorResultRole} from './owned-source-value-calls.mjs';

import {ownedVectorTextScalarOperation} from './owned-vector-text-scalars.mjs';

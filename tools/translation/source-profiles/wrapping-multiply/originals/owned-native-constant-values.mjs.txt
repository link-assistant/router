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
  switch(a){case 'min':value=left<right?left:right;break;case 'max':value=left>right?left:right;break;case 'wrapping_add':value=width(b,left+right);break;case 'wrapping_sub':value=width(b,left-right);break;case 'saturating_add':value=left+right;break;case 'saturating_sub':value=left-right;break;case 'saturating_mul':value=left*right;break;default:constantFail('unsupported total constant method');}if(a.startsWith('saturating_'))value=value<low?low:value>high?high:value;return constantInteger(b,value);
 }
 constantFail('unsupported total constant model');
}
import {sameType} from '../checked-types.mjs';
import {totalNativeIntegerMethod} from './owned-native-total-operators.mjs';

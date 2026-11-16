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

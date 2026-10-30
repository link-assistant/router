// Exact existing predicate inverse operation DATA; no semantic authority.
const PREDICATE_INVERSE_OPERATIONS=Object.freeze([
 Object.freeze({op:'eq',kind:'equality',target:'===',rust:'=='}),Object.freeze({op:'ne',kind:'equality',target:'!==',rust:'!='}),
 Object.freeze({op:'lt',kind:'comparison',target:'<',rust:'<'}),Object.freeze({op:'le',kind:'comparison',target:'<=',rust:'<='}),Object.freeze({op:'gt',kind:'comparison',target:'>',rust:'>'}),Object.freeze({op:'ge',kind:'comparison',target:'>=',rust:'>='}),
 Object.freeze({op:'and',kind:'logic',target:'&&',rust:'&&'}),Object.freeze({op:'or',kind:'logic',target:'||',rust:'||'}),
]);
export function jsonScalarComparisonOperation(op,{native=false}={}){return PREDICATE_INVERSE_OPERATIONS.find(row=>row.kind!=='logic'&&(native?row.op===op:row.target===op))??null;}
export function jsonScalarComparisonDomain(type,{native=false}={}){
 if(!native)return ['u64','usize'].includes(type)?'u64':['i64','bool','str'].includes(type)?type:null;
 if(!type||type.rustReference||type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved||type.patternOwnershipRefusal)return null;
 if(type.kind==='bool'&&!type.rustOwnership)return 'bool';
 if(type.kind==='string'&&type.rustOwnership?.kind==='borrowed'&&type.rustOwnership.source==='str')return 'str';
 if(type.kind==='fixed'&&!type.rustOwnership&&['u64','i64'].includes(type.rustPrimitiveName)&&type.bits===64&&type.signed===(type.rustPrimitiveName==='i64'))return type.rustPrimitiveName;
 return null;
}

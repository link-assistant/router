// Shared candidate/declaration DATA. Original private source/type/move issuers
// remain mandatory. No runtime, native compiler or generated source is executed.
import {PRIMITIVE_SEQUENCE_CONTRACTS,primitiveSequenceContract} from './primitive-sequence-contracts.mjs';
import {PRIMITIVE_OWNED_VECTOR_CONTRACTS,primitiveOwnedVectorContract} from './primitive-owned-vector-contracts.mjs';
export const PRIMITIVE_COLLECTION_DOMAINS=Object.freeze(['bool','u8','i8','u16','i16','u32','i32','u64','i64','u128','i128']);
const operations=Object.freeze({sequence:Object.freeze(['len','is_empty','get']),'owned-vector':Object.freeze(['new','from_slice','push','append','truncate','replace','len','get'])});
const names=Object.freeze({new:Object.freeze([]),from_slice:Object.freeze(['values']),push:Object.freeze(['values','value']),append:Object.freeze(['left','right']),truncate:Object.freeze(['values','length']),replace:Object.freeze(['values','index','value']),len:Object.freeze(['values']),get:Object.freeze(['values','index'])});
const fail=message=>{throw TypeError('Primitive collection operation descriptions: '+message);};
function contract(family,name){
 if(typeof family!=='string'||!Object.hasOwn(operations,family))fail('known original family required');
 const row=family==='sequence'?primitiveSequenceContract(name):primitiveOwnedVectorContract(name);
 return row&&PRIMITIVE_COLLECTION_DOMAINS.includes(row.domain)&&operations[family].includes(row.operation)?row:null;
}
/** Fresh original candidate return shape: no shared mutable parameter array. */
export function primitiveCollectionOperationShape(family,name){
 const row=contract(family,name);if(!row)return null;
 const result={domain:row.domain,operation:row.operation,rustName:row.rustName,javascriptName:row.javascriptName,rustPath:family==='sequence'?'crate::'+row.rustModule+'::'+row.rustName:row.rustPath,parameters:[...row.parameters],returns:row.returns};
 if(family==='sequence')result.runtimeModule=row.runtimeModule;
 return {...result,sourceAuthority:false,semanticAuthority:false};
}
function scalar(role){
 if(!PRIMITIVE_COLLECTION_DOMAINS.includes(role))return null;
 return role==='bool'?'boolean':'Rust'+role[0].toUpperCase()+role.slice(1);
}
/** Language-role projection only; declaration brands carry no native authority. */
export function primitiveCollectionDeclarationType(family,role){
 if(typeof family!=='string'||!Object.hasOwn(operations,family))fail('known original family required');
 const value=scalar(role);if(value)return value;
 for(const domain of PRIMITIVE_COLLECTION_DOMAINS){
  const element=scalar(domain);
  if(role===domain+'-list-ref')return 'readonly '+element+'[]';
  if(role===domain+'-option')return (family==='sequence'?'PrimitiveSequenceOption':'PrimitiveOwnedVectorOption')+'<'+element+'>';
  if(family==='owned-vector'&&(role==='vec:'+domain||role==='vec:'+domain+'-ref'))return 'PrimitiveOwnedVector<'+element+'>';
 }
 fail('unsupported original declaration role');
}
/** Repository rendering preserves original public names, brands and layout. */
export function emitPrimitiveCollectionDeclarations(family){
 if(typeof family!=='string'||!Object.hasOwn(operations,family))fail('known original family required');
 const sequence=family==='sequence',contracts=sequence?PRIMITIVE_SEQUENCE_CONTRACTS:PRIMITIVE_OWNED_VECTOR_CONTRACTS;
 const brands=PRIMITIVE_COLLECTION_DOMAINS.filter(domain=>domain!=='bool').map(scalar),header=sequence
  ?"import type {"+brands.join(',')+"} from './primitive-operator-runtime.mjs';\nexport type PrimitiveSequenceOption<T> = Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>;\n"
  :"import type { "+brands.join(', ')+" } from './primitive-operator-runtime.mjs';\nexport type PrimitiveOwnedVector<T> = readonly T[];\nexport type PrimitiveOwnedVectorOption<T> = Readonly<{$:'None'}> | Readonly<{$:'Some';field0:T}>;\n";
 return header+contracts.map(row=>{
  if(!contract(family,row.javascriptName))fail('complete supported contract cohort required');
  const parameters=sequence?(row.operation==='get'?['value','index']:['value']):names[row.operation];
  if(parameters.length!==row.parameters.length)fail('original parameter naming and role arity differ');
  const separator=sequence?':':': ',arguments_=row.parameters.map((role,index)=>parameters[index]+separator+primitiveCollectionDeclarationType(family,role)).join(sequence?',':', ');
  return 'export declare function '+row.javascriptName+'('+arguments_+'): '+primitiveCollectionDeclarationType(family,row.returns)+';';
 }).join('\n')+'\n';
}

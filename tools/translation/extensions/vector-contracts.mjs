// Monomorphic immutable Vec<T>/[T] readers from actual checked type layouts.
import {valueSchema} from '../type-layout.mjs';
import {encodeMonomorphicType,monomorphicTypeName} from '../monomorphic.mjs';
const freeze=value=>{if(value && typeof value === 'object'){for(const item of Object.values(value))freeze(item);Object.freeze(value);}return value;};
const normalize=(type,schema,source=true)=>{
  if(!type || typeof type !== 'object')throw new TypeError('Vector readers require a checked element type');
  if(['bool','string','unit','float','nat','int'].includes(type.kind))return {kind:type.kind};
  if(type.kind === 'fixed') {
    if(![8,16,32,64,128].includes(type.bits) || typeof type.signed !== 'boolean')throw new TypeError('Invalid checked vector integer type');
    return {kind:'fixed',bits:type.bits,signed:type.signed,...(source&&type.rustPrimitiveName?{rustPrimitiveName:type.rustPrimitiveName}:{})};
  }
  if(type.kind === 'array')return {kind:'array',element:normalize(type.element,schema,source)};
  let name;
  if(type.kind === 'data')name=type.name;
  else if(type.kind === 'named' && Array.isArray(type.path))name=(type.path[0] === 'crate'?type.path.slice(1):type.path).join('.');
  else throw new TypeError(`Unsupported checked vector element type: ${type.kind}`);
  if(typeof name !== 'string' || !Object.hasOwn(schema.types,name))throw new TypeError(`Unknown checked vector element layout: ${name}`);
  return {kind:'data',name};
};
const assumptions=[
  'The frontend proves the receiver is a checked immutable Vec<T> or shared [T] borrow; mutable, interior-mutable and escaping ownership paths require separate lowering.',
  'usize follows the existing portable 64-bit BigInt profile; 32-bit source targets require a distinct checked capability.',
  'The runtime factory closes over the actual checked array schema and registered refinements, with no untyped or type-name-based fallback.',
  'Some contains the original element identity; no clone, ownership transfer or mutation is introduced.',
  'Only position indexing is registered; ranges, unchecked reads, get_mut, iterators and into_iter remain explicit refusals.',
  'These descriptors are conservatively ineligible for const evaluation until source-target const and borrow obligations are separately established.',
];
export function vectorContracts(elementType,declarations,{span={start:0,end:0}}={}) {
  const schema=valueSchema(declarations),element=normalize(elementType,schema),receiver={kind:'array',element};
  const optionName=monomorphicTypeName('Option',[element]),option={kind:'named',path:[optionName]};
  const ctors=[{name:'None',fields:[]},{name:'Some',fields:[{name:'field0',type:element}]}];
  const portableCtors=[{name:'None',fields:[]},{name:'Some',fields:[{name:'field0',type:normalize(elementType,schema,false)}]}];
  const existing=schema.types[optionName];
  if(declarations.has(optionName) && (!existing || declarations.get(optionName).standardGeneric?.kind !== 'Option'))throw new TypeError(`Conflicting checked Option provenance: ${optionName}`);
  if(existing && JSON.stringify(existing.ctors) !== JSON.stringify(portableCtors))throw new TypeError(`Conflicting checked Option layout: ${optionName}`);
  const data=existing?[]:[{k:'data',name:optionName,ctors,span,generated:'router-vector-contract',standardGeneric:{kind:'Option',arguments:[element]}}];
  const contracts=['get','first','last'].map(method=>({
    id:`rust_vec_${method}_${encodeMonomorphicType(element)}`,jsExport:`rust_vec_${method}`,
    rustPath:['std','vec','Vec',method],rustAliases:[['std','primitive','slice',method]],
    kind:'method',receiver,params:[receiver,...(method === 'get'?[{kind:'fixed',bits:64,signed:false,rustPrimitiveName:'usize'}]:[])],ret:option,
    async:false,pure:true,constEligible:false,instantiation:element,overload:method === 'get'?'usize':null,
    borrow:{receiver:'shared',result:'shared-element',ownershipTransfer:false},
    runtimeInstantiation:{factory:'createVectorRuntime',validatorType:receiver},assumptions,
  }));
  return freeze({element,receiver,option,data,contracts});
}

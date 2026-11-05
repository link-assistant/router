// Primitive arithmetic instantiations from actual checked fixed types.
import {pinnedFixedWrapping,requireFixedWrappingProof,withFixedWrappingSourceOperation} from './fixed-wrapping-source.mjs';
import {valueSchema} from '../type-layout.mjs';
import {encodeMonomorphicType,monomorphicTypeName} from '../monomorphic.mjs';
const freeze=value=>{if(value && typeof value==='object'){for(const item of Object.values(value))freeze(item);Object.freeze(value);}return value;};
const assumptions=[
  'The receiver and every operand have the same actual checked fixed-integer width and signedness; values remain exact BigInt.',
  'Checked operations return the registered immutable standard Option<T>, with None for mathematical overflow or unsigned underflow.',
  'Saturating operations clamp the mathematical result to the source type range, independent of debug or release overflow settings.',
  'Ord min/max/clamp use the built-in implementation for primitive integers only; no arbitrary ADT trait implementation is inferred.',
  'Reversed clamp bounds preserve a source panic as an exception, rather than a fabricated successful value or Option.',
  'The pinned Rust 1.89 arithmetic methods are const-eligible; ordinary Ord methods are not const-eligible.',
  'usize/isize use the existing 64-bit portable profile; other pointer profiles, mixed signed operands, floats and unbound generics require separate contracts.',
  'No Rust execution or whole-program Router parity is established by these source-derived contracts.',
];
export function fixedIntegerContracts(type,declarations=new Map(),{span={start:0,end:0}}={}) {
 return withFixedWrappingSourceOperation(()=>{
  if(type?.kind!=='fixed'||![8,16,32,64,128].includes(type.bits)||typeof type.signed!=='boolean')throw new TypeError('Fixed arithmetic requires an actual checked integer type');
  const portable={kind:'fixed',bits:type.bits,signed:type.signed},fixed={...portable,...(type.rustPrimitiveName?{rustPrimitiveName:type.rustPrimitiveName}:{})};
  const name=monomorphicTypeName('Option',[fixed]),option={kind:'named',path:[name]};
  const ctors=[{name:'None',fields:[]},{name:'Some',fields:[{name:'field0',type:fixed}]}];
  const schema=valueSchema(declarations),existing=schema.types[name],declaration=declarations.get(name);
  if(declaration && (!existing||declaration.standardGeneric?.kind!=='Option'))throw new TypeError('Fixed arithmetic requires actual standard Option provenance: '+name);
  const portableCtors=[{name:'None',fields:[]},{name:'Some',fields:[{name:'field0',type:portable}]}];
  if(existing && JSON.stringify(existing.ctors)!==JSON.stringify(portableCtors))throw new TypeError('Conflicting fixed arithmetic Option layout: '+name);
  const data=existing?[]:[{k:'data',name,ctors,span,generated:'router-fixed-integer-contract',standardGeneric:{kind:'Option',arguments:[fixed]}}];
  const owner=fixed.rustPrimitiveName??(fixed.signed?'i':'u')+fixed.bits,encoding=encodeMonomorphicType(fixed);
  const methods=['checked_add','checked_sub','checked_mul','saturating_add','saturating_sub','saturating_mul','min','max','clamp'];
  if(/^[iu](8|16|32|64|128)$/u.test(owner))methods.splice(3,0,'wrapping_add','wrapping_sub');
  const contracts=methods.map(method=>{
    const ordered=['min','max','clamp'].includes(method),wrapping=method.startsWith('wrapping_'),sourceWrappingProof=wrapping?pinnedFixedWrapping(fixed,method):null;
    if(wrapping)requireFixedWrappingProof(sourceWrappingProof,fixed,method);
    const aliases=[['std','primitive',owner,method]];
    return {
      id:'rust_fixed_'+method+'_'+encoding,jsExport:'rust_fixed_'+method,rustPath:[owner,method],rustAliases:aliases,
      kind:'method',receiver:fixed,params:[fixed,fixed,...(method==='clamp'?[fixed]:[])],ret:method.startsWith('checked_')?option:fixed,
      async:false,pure:true,constEligible:!ordered,...(!ordered?{constSince:wrapping?'1.32.0':'1.47.0'}:{trait:'std::cmp::Ord',traitImplementation:'primitive-integer'}),
      ...(wrapping?{sourceWrappingProof}:{}),instantiation:fixed,runtimeInstantiation:{factory:'createFixedIntegerRuntime',type:portable},assumptions:wrapping?[...assumptions,'The privately selected original primitive macro member calls the generic safe wrapping intrinsic; the exact result is reduced modulo2^checked-width then interpreted in the checked signed range.','The generic intrinsic is const-stable through the original primitive wrapper since Rust1.32; no original Rust function body or whole formatter is replaced.']:assumptions,
    };
  });
  return freeze({type:fixed,data,option,contracts});
 });
}

// Checked fixed-integer parsing instantiations, independent of Router bodies.
import {valueSchema} from '../type-layout.mjs';
import {encodeMonomorphicType,monomorphicTypeName} from '../monomorphic.mjs';
const span={start:0,end:0},named=(...path)=>({kind:'named',path});
const freeze=value=>{if(value && typeof value === 'object'){for(const item of Object.values(value))freeze(item);Object.freeze(value);}return value;};
export const INTEGER_TYPES=freeze({error:named('std','num','ParseIntError'),kind:named('std','num','IntErrorKind')});
const kindCtors=['Empty','InvalidDigit','PosOverflow','NegOverflow','Zero'].map(name=>({name,fields:[]}));
const errorCtors=[{name:'ParseIntError',fields:[{name:'kind',type:INTEGER_TYPES.kind}]}];
const declaration=(name,ctors)=>({k:'data',name,ctors,span,generated:'router-integer-contract'});
export const INTEGER_DATA=freeze([{k:'module',name:'std',span,items:[{k:'module',name:'num',span,items:[declaration('IntErrorKind',kindCtors),declaration('ParseIntError',errorCtors)]}]}]);
export const INTEGER_ERROR_CONTRACTS=freeze([
  {id:'std_num_parse_int_error_kind',jsExport:'std_num_parse_int_error_kind',rustPath:['std','num','ParseIntError','kind'],kind:'method',receiver:INTEGER_TYPES.error,params:[INTEGER_TYPES.error],ret:INTEGER_TYPES.kind,async:false,pure:true,constEligible:true,constSince:'1.82.0',borrow:{receiver:'shared',result:'shared-field'}},
  {id:'std_num_parse_int_error_to_string',jsExport:'std_num_parse_int_error_to_string',rustPath:['std','num','ParseIntError','to_string'],kind:'method',receiver:INTEGER_TYPES.error,params:[INTEGER_TYPES.error],ret:{kind:'string'},async:false,pure:true,constEligible:false},
]);
const assumptions=[
  'The actual checked fixed-integer target, signedness and width determine this monomorphic parser and Result layout.',
  'Decimal FromStr accepts an optional ASCII plus sign, and signed targets also accept minus; no whitespace trimming or JavaScript numeric coercion is introduced.',
  'Invalid digits are checked before reporting multiplication overflow at that byte; a preceding digit overflow stops before any later invalid byte.',
  'Machine integers remain BigInt; usize/isize aliases use the existing checked 64-bit portable profile.',
  'FromStr and str.parse are not const-eligible; stable from_str_radix is const-eligible since Rust 1.82, with invalid radix preserving source panic behavior.',
  'NonZero types, binary32/binary64 FromStr, generic unbound parse targets and unchecked mutation require separate contracts.',
  'No Rust execution or complete Router parity is established by these source-derived adapters.',
];
export function integerContracts(type,declarations=new Map()) {
  if(type?.kind !== 'fixed' || ![8,16,32,64,128].includes(type.bits) || typeof type.signed !== 'boolean')throw new TypeError('Integer parsing requires an actual checked fixed type');
  const fixed={kind:'fixed',bits:type.bits,signed:type.signed},schema=valueSchema(declarations),missing=[];
  const expected=[['std.num.IntErrorKind',kindCtors],['std.num.ParseIntError',[{name:'ParseIntError',fields:[{name:'kind',type:{kind:'data',name:'std.num.IntErrorKind'}}]}]]];
  for(const [name,ctors] of expected) {
    const existing=schema.types[name];
    if(existing && JSON.stringify(existing.ctors) !== JSON.stringify(ctors))throw new TypeError(`Conflicting checked integer error layout: ${name}`);
    if(declarations.has(name) && !existing)throw new TypeError(`Conflicting checked integer error declaration: ${name}`);
    if(!existing)missing.push(name.split('.').at(-1) === 'IntErrorKind'?declaration('IntErrorKind',kindCtors):declaration('ParseIntError',errorCtors));
  }
  const name=monomorphicTypeName('Result',[fixed,INTEGER_TYPES.error]),ret=named(name);
  const ctors=[{name:'Ok',fields:[{name:'field0',type:fixed}]},{name:'Err',fields:[{name:'field0',type:{kind:'data',name:'std.num.ParseIntError'}}]}];
  const existing=schema.types[name];
  if(existing && JSON.stringify(existing.ctors) !== JSON.stringify(ctors))throw new TypeError(`Conflicting checked integer Result layout: ${name}`);
  if(declarations.has(name) && !existing)throw new TypeError(`Conflicting checked integer Result declaration: ${name}`);
  const data=missing.length?[{k:'module',name:'std',span,items:[{k:'module',name:'num',span,items:missing}]}]:[];
  if(!existing)data.push(declaration(name,ctors));
  const owner=`${fixed.signed?'i':'u'}${fixed.bits}`,encoding=encodeMonomorphicType(fixed),STRING={kind:'string'};
  const aliases=method=>[['std','primitive',owner,method],...(fixed.bits === 64?[[fixed.signed?'isize':'usize',method],['std','primitive',fixed.signed?'isize':'usize',method]]:[])];
  const base={ret,async:false,pure:true,instantiation:fixed,runtimeInstantiation:{factory:'createIntegerRuntime',type:fixed},assumptions};
  const contracts=[
    {...base,id:`rust_integer_parse_${encoding}`,jsExport:'rust_integer_parse',rustPath:['std','primitive','str','parse'],kind:'method',receiver:STRING,params:[STRING],constEligible:false,genericArity:1},
    {...base,id:`rust_integer_from_str_${encoding}`,jsExport:'rust_integer_parse',rustPath:[owner,'from_str'],rustAliases:aliases('from_str'),kind:'function',params:[STRING],constEligible:false,trait:'std::str::FromStr'},
    {...base,id:`rust_integer_from_str_radix_${encoding}`,jsExport:'rust_integer_from_str_radix',rustPath:[owner,'from_str_radix'],rustAliases:aliases('from_str_radix'),kind:'function',params:[STRING,{kind:'fixed',bits:32,signed:false}],constEligible:true,constSince:'1.82.0'},
  ];
  return freeze({type:fixed,data,ret,contracts,errorContracts:INTEGER_ERROR_CONTRACTS});
}

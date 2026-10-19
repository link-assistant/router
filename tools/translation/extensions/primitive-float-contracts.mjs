// This registry grants only actual Rust f64 inherent operations. Its private
// lookup never accepts a caller-supplied descriptor or an arbitrary float ADT.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {typeError,unsupported} from '../vendor/meta-language/translation/diagnostics.js';
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const hash=value=>createHash('sha256').update(value).digest('hex');
export const PRIMITIVE_FLOAT_PROFILE=freeze({
  id:'rust-1.89-primitive-f64-runtime',rust:'1.89.0',binary32:false,constantEvaluation:false,
  domain:'IEEE binary64 Number values; NaN classification, not NaN sign or payload observability',
  sources:[
    {url:'https://raw.githubusercontent.com/rust-lang/rust/1.89.0/library/core/src/num/f64.rs',archive:'core-f64.rs.gz',bytes:73832,sha256:'298f65ffd77d9906e133a6e90fc5ea2292e3564d7010ab237de023ea90c0c08d',archiveSha256:'1b37e32d6e25548d27a015699c8449bef23c54b2f4c911d1a1b3b017a03b4745'},
    {url:'https://raw.githubusercontent.com/rust-lang/rust/1.89.0/library/std/src/num/f64.rs',archive:'std-f64.rs.gz',bytes:43716,sha256:'f8651987990e58334b9a85f4ef9b6f9fb66b8dd30f1b1102606f13f2e4621fd8',archiveSha256:'f96ba0d35b6b99950bbd9303042ccf793ec1dad9039d713dcf3ee9ee70a249d3'},
  ],
});
for(const source of PRIMITIVE_FLOAT_PROFILE.sources) {
  const archive=readFileSync(new URL('../source-profiles/primitive-float/'+source.archive,import.meta.url));
  if(hash(archive)!==source.archiveSha256)throw new TypeError('Rust f64 source archive checksum mismatch');
  const bytes=gunzipSync(archive,{maxOutputLength:100000});
  if(bytes.length!==source.bytes||hash(bytes)!==source.sha256)throw new TypeError('Rust f64 source checksum mismatch');
}
export const SOURCE_F64=freeze({kind:'float',rustPrimitiveName:'f64',rustSourceType:true});
const assumptions=freeze([
  'Actual source-qualified primitive f64 receivers are passed by value, once. Shared or mutable receiver borrowing has no contract here.',
  'NaN and infinities remain in the binary64 domain; predicates do not coerce caller objects.',
  'NaN sign/payload inspection and f32 are unsupported. floor preserves signed zero and returns an exact integral result.',
  'Source const eligibility is separate from the bounded evaluator, which has no floating CTFE profile.',
]);
export const FLOAT_CONTRACTS=freeze([
  {method:'is_nan',ret:{kind:'bool'},constEligible:true,constSince:'1.83.0',sourceIndex:0,sourceLines:[525,533]},
  {method:'is_finite',ret:{kind:'bool'},constEligible:true,constSince:'1.83.0',sourceIndex:0,sourceLines:[575,583]},
  // Rust 1.89 writes const fn, but const use is unstable on stable Rust.
  {method:'floor',ret:SOURCE_F64,constEligible:false,constUnstable:'const_float_round_methods',sourceIndex:1,sourceLines:[29,51]},
  // Only a checked zero branch can authorize these runtime adapters. Stable
  // Rust const eligibility does not establish this restricted source profile.
  {method:'is_sign_negative',ret:{kind:'bool'},constEligible:false,constSince:'1.83.0',requiresRefinement:'checked-zero-branch',sourceIndex:0,sourceLines:[721,727]},
  {method:'is_sign_positive',ret:{kind:'bool'},constEligible:false,constSince:'1.83.0',requiresRefinement:'checked-zero-branch',sourceIndex:0,sourceLines:[686,691]},
].map(({method,...details})=>({id:'rust_f64_'+method,jsExport:'rust_f64_'+method,rustPath:['f64',method],kind:'method',family:'float',receiver:SOURCE_F64,params:[SOURCE_F64],async:false,pure:true,profile:PRIMITIVE_FLOAT_PROFILE.id,assumptions,...details})));
const contracts=new Map(FLOAT_CONTRACTS.filter(contract=>!contract.requiresRefinement).map(contract=>[contract.rustPath.at(-1),contract]));
export function primitiveFloatContract(method) {return contracts.get(method)??null;}
const signs=new Map(FLOAT_CONTRACTS.filter(contract=>contract.requiresRefinement).map(contract=>[contract.rustPath.at(-1),contract]));
export function primitiveFloatSignContract(method) {return signs.get(method)??null;}
const nan=freeze({id:'rust_f64_nan',name:'NAN',owner:'f64',value:'NaN',type:SOURCE_F64,profile:PRIMITIVE_FLOAT_PROFILE.id,sourceIndex:0,sourceLines:[479,494]});
export function primitiveFloatConstant(name) {return name==='NAN'?nan:null;}
export function requirePrimitiveFloat(value,span) {
  const type=value?.type;
  if(type?.kind!=='float'||type.rustPrimitiveName!=='f64'||type.rustReference||type.rustOwnership||type.patternOwnershipRefusal||type.rustGenericIdentityUnresolved)throw unsupported('primitive f64 receiver','requires an actual checked by-value Rust f64; shared receivers need a separate Copy autodereference profile',span);
  return value;
}
// Source types, verified decimal tokens and checked IEEE operations retain the
// primitive identity. A reference never becomes a by-value f64 through typeKey.
export function qualifyPrimitiveFloatResult(value) {
  if(value?.type?.kind!=='float'||value.type.rustReference||value.type.patternOwnershipRefusal||value.type.rustGenericIdentityUnresolved)return value;
  const literal=value.sourceFloatLiteral;
  const sourceLiteral=literal?.verified===true&&literal.profile==='rust-1.89-binary64-decimal-literals'&&literal.suffix!=='f32';
  const ieee=value.semantics==='ieee'&&((value.k==='unary'&&value.op==='neg'&&value.arg?.type?.rustPrimitiveName==='f64'&&!value.arg.type.rustReference)||(value.k==='binary'&&[value.left,value.right].every(arg=>arg?.type?.rustPrimitiveName==='f64'&&!arg.type.rustReference)));
  return sourceLiteral||ieee?{...value,type:{...value.type,...SOURCE_F64}}:value;
}
export function checkedPrimitiveFloatConstant(node) {
  const descriptor=primitiveFloatConstant(node.name);
  if(!descriptor||node.owner?.join('::')!=='f64')throw typeError('primitive float constant has no checked source owner',node.span);
  return {k:'lit',value:descriptor.value,type:SOURCE_F64,span:node.span,primitiveFloatConstantProof:{profile:descriptor.profile,id:descriptor.id,owner:[...node.owner],span:{...node.span}}};
}

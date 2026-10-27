const shape=(bits,signed)=>{
  if(![8,16,32,64,128].includes(bits)||typeof signed!=='boolean')throw new TypeError('Invalid Rust primitive integer domain');
};
const bound=(value,bits,signed)=>{
  shape(bits,signed);
  const limit=1n<<BigInt(signed?bits-1:bits),minimum=signed?-limit:0n;
  if(typeof value!=='bigint'||value<minimum||value>=limit)throw new TypeError('Value outside Rust primitive integer domain');
};
export function integerCast(value,inputBits,inputSigned,targetBits,targetSigned){
  bound(value,inputBits,inputSigned);shape(targetBits,targetSigned);
  return targetSigned?BigInt.asIntN(targetBits,value):BigInt.asUintN(targetBits,value);
}
export function integerShift(value,count,bits,signed,countBits,countSigned,operation){
  bound(value,bits,signed);bound(count,countBits,countSigned);
  if(count<0n||count>=BigInt(bits))throw new RangeError('Rust integer shift count overflow');
  if(!['<<','>>'].includes(operation))throw new TypeError('Invalid Rust primitive shift');
  const result=operation==='<<'?value<<count:value>>count;
  return signed?BigInt.asIntN(bits,result):BigInt.asUintN(bits,result);
}

export function primitiveBitwise(left,right,operation,bits,signed){
 if(!['&','|','^'].includes(operation))throw new TypeError('Invalid Rust primitive bitwise operation');
 if(bits===null&&signed===null){if(typeof left!=='boolean'||typeof right!=='boolean')throw new TypeError('Rust bool bitwise operands must be booleans');return operation==='&'?left&&right:operation==='|'?left||right:left!==right;}
 bound(left,bits,signed);bound(right,bits,signed);const result=operation==='&'?left&right:operation==='|'?left|right:left^right;return signed?BigInt.asIntN(bits,result):BigInt.asUintN(bits,result);
}

export function primitiveNot(value,bits,signed){
 bound(value,bits,signed);const result=~value;return signed?BigInt.asIntN(bits,result):BigInt.asUintN(bits,result);
}

// Complete local copy of the existing fixed-integer implementation.
// Standalone exact primitive-integer adapters. No Rust executable is required.
const PRIMITIVE_INTEGER_METHOD_NONE=Object.freeze({$: 'None'});
const primitiveIntegerMethodSome=value=>Object.freeze({$: 'Some',field0:value});
function createPrimitiveIntegerMethodRuntime(type) {
  if(type?.kind!=='fixed'||![8,16,32,64,128].includes(type.bits)||typeof type.signed!=='boolean')throw new TypeError('Fixed arithmetic requires a checked integer type');
  const bits=BigInt(type.bits),minimum=type.signed?-(1n<<(bits-1n)):0n,maximum=type.signed?(1n<<(bits-1n))-1n:(1n<<bits)-1n;
  const operand=value=>{
    if(typeof value!=='bigint'||value<minimum||value>maximum)throw new TypeError('Fixed arithmetic operand is outside the checked source domain');
    return value;
  };
  const modulus=1n<<bits,wrapped=value=>{const residue=((value%modulus)+modulus)%modulus;return type.signed&&residue>maximum?residue-modulus:residue;};
  const checked=value=>value<minimum||value>maximum?PRIMITIVE_INTEGER_METHOD_NONE:primitiveIntegerMethodSome(value);
  const saturated=value=>value<minimum?minimum:value>maximum?maximum:value;
  const add=(left,right)=>operand(left)+operand(right),subtract=(left,right)=>operand(left)-operand(right),multiply=(left,right)=>operand(left)*operand(right);
  return Object.freeze({
    rust_fixed_checked_add:(left,right)=>checked(add(left,right)),
    rust_fixed_checked_sub:(left,right)=>checked(subtract(left,right)),
    rust_fixed_checked_mul:(left,right)=>checked(multiply(left,right)),
    rust_fixed_wrapping_add:(left,right)=>wrapped(add(left,right)),
    rust_fixed_wrapping_sub:(left,right)=>wrapped(subtract(left,right)),
    rust_fixed_saturating_add:(left,right)=>saturated(add(left,right)),
    rust_fixed_saturating_sub:(left,right)=>saturated(subtract(left,right)),
    rust_fixed_saturating_mul:(left,right)=>saturated(multiply(left,right)),
    rust_fixed_min:(left,right)=>{operand(left);operand(right);return left<=right?left:right;},
    rust_fixed_max:(left,right)=>{operand(left);operand(right);return left>=right?left:right;},
    rust_fixed_clamp:(value,lower,upper)=>{
      operand(value);operand(lower);operand(upper);
      if(lower>upper)throw new RangeError('Rust clamp lower bound exceeds upper bound');
      return value<lower?lower:value>upper?upper:value;
    },
  });
}

const PRIMITIVE_INTEGER_METHOD_RUNTIMES=Object.freeze([8,16,32,64,128].flatMap(bits=>[false,true].map(signed=>Object.freeze({bits,signed,operations:createPrimitiveIntegerMethodRuntime({kind:'fixed',bits,signed})}))));
export function primitiveIntegerMethod(value,other,upper,bits,signed,method){
 shape(bits,signed);if(!["saturating_add","saturating_sub","saturating_mul","wrapping_add","wrapping_sub","min","max","clamp"].includes(method)||method!=='clamp'&&upper!==null)throw new TypeError('Invalid Rust native integer method');const runtime=PRIMITIVE_INTEGER_METHOD_RUNTIMES.find(row=>row.bits===bits&&row.signed===signed).operations,args=method==='clamp'?[value,other,upper]:[value,other];return Reflect.apply(runtime['rust_fixed_'+method],undefined,args);
}

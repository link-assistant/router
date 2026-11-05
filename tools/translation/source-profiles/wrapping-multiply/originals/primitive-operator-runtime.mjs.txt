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

// Complete local copy of original panic messages.
// The message a source program aborts with, in the words of the source
// language, so every target aborts where the source does with the message
// the source prints. Machine integers are Rust's, whose arithmetic panics
// (overflow checks on, as in a debug build) with these messages; BigInt
// division by zero is JavaScript's RangeError; a natural parameter is a
// JavaScript BigInt parameter whose leading guard throws its own message.

const PRIMITIVE_ARITHMETIC_RUST_OVERFLOW = {
  add: 'attempt to add with overflow',
  sub: 'attempt to subtract with overflow',
  mul: 'attempt to multiply with overflow',
  div: 'attempt to divide with overflow',
  rem: 'attempt to calculate the remainder with overflow',
  neg: 'attempt to negate with overflow',
};

/** The panic of a machine-integer operation whose result is out of range. */
function nativeArithmeticOverflowMessage(op) {
  return PRIMITIVE_ARITHMETIC_RUST_OVERFLOW[op];
}

/** The abort of an integer division or remainder by zero. */
function nativeArithmeticZeroDivisorMessage(op, type) {
  if (type.kind !== 'fixed') return 'Division by zero';
  return op === 'rem' ? 'attempt to calculate the remainder with a divisor of zero' : 'attempt to divide by zero';
}

/** The abort of a checked conversion of a negative integer to a natural: the guard's own message. */
function nativeArithmeticCastMessage(cast) {
  return cast.message ?? 'conversion of a negative integer to a natural';
}

/** The message of `panic!`, `unreachable!`, `unimplemented!` and `todo!`, with an optional literal message. */
function nativeArithmeticRustMacroMessage(name, message) {
  const prefix = {
    panic: null,
    unreachable: 'internal error: entered unreachable code',
    unimplemented: 'not implemented',
    todo: 'not yet implemented',
  }[name];
  if (message === undefined) return prefix ?? 'explicit panic';
  return prefix === null ? message : `${prefix}: ${message}`;
}

// Exact checked-profile arithmetic, independent of Rust debug/release settings.
export function integerArithmetic(left,right,bits,signed,operation){
 bound(left,bits,signed);if(operation==='neg'){if(signed!==true||right!==null)throw new TypeError('Checked native negation requires signed input and a null second argument');const minimum=-(1n<<BigInt(bits-1));if(left===minimum)throw new RangeError(nativeArithmeticOverflowMessage('neg'));return -left;}bound(right,bits,signed);if(!['add','sub','mul','div','rem'].includes(operation))throw new TypeError('Invalid Rust checked integer arithmetic');
 const limit=1n<<BigInt(signed?bits-1:bits),minimum=signed?-limit:0n;
 if(['div','rem'].includes(operation)){if(right===0n)throw new RangeError(nativeArithmeticZeroDivisorMessage(operation,{kind:'fixed'}));if(signed&&left===minimum&&right===-1n)throw new RangeError(nativeArithmeticOverflowMessage(operation));}
 const value=operation==='add'?left+right:operation==='sub'?left-right:operation==='mul'?left*right:operation==='div'?left/right:left%right;
 if(value<minimum||value>=limit)throw new RangeError(nativeArithmeticOverflowMessage(operation));return value;
}

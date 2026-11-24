// Standalone exact primitive-integer adapters. No Rust executable is required.
const NONE=Object.freeze({$: 'None'});
const some=value=>Object.freeze({$: 'Some',field0:value});
export function createFixedIntegerRuntime(type) {
  if(type?.kind!=='fixed'||![8,16,32,64,128].includes(type.bits)||typeof type.signed!=='boolean')throw new TypeError('Fixed arithmetic requires a checked integer type');
  const bits=BigInt(type.bits),minimum=type.signed?-(1n<<(bits-1n)):0n,maximum=type.signed?(1n<<(bits-1n))-1n:(1n<<bits)-1n;
  const operand=value=>{
    if(typeof value!=='bigint'||value<minimum||value>maximum)throw new TypeError('Fixed arithmetic operand is outside the checked source domain');
    return value;
  };
  const modulus=1n<<bits,wrapped=value=>{const residue=((value%modulus)+modulus)%modulus;return type.signed&&residue>maximum?residue-modulus:residue;};
  const checked=value=>value<minimum||value>maximum?NONE:some(value);
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

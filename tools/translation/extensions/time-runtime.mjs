// Pure Rust 1.89 std::time::Duration adapters; no clocks or OS capabilities.
const SECOND=1000000000n,U64_MAX=18446744073709551615n,U32_MAX=4294967295n,MAX_NANOS=U64_MAX*SECOND+SECOND-1n;
const NONE=Object.freeze({$:'None'}),some=value=>Object.freeze({$:'Some',field0:value});
const ok=value=>Object.freeze({$:'Ok',field0:value}),err=kind=>Object.freeze({$:'Err',field0:Object.freeze({$:'TryFromFloatSecsError',kind:Object.freeze({$:kind})})});
const fixed=(value,max,name)=>{if(typeof value!=='bigint')throw new TypeError(`${name} requires a checked Rust integer`);if(value<0n || value>max)throw new RangeError(`${name} is outside its Rust integer domain`);return value;};
const u64=value=>fixed(value,U64_MAX,'u64'),u32=value=>fixed(value,U32_MAX,'u32');
const make=(secs,nanos)=>Object.freeze({$:'Duration',secs,nanos});
export const std_time_duration_ZERO=make(0n,0n),std_time_duration_MAX=make(U64_MAX,SECOND-1n);
function duration(value) {
  if(!value || typeof value!=='object' || !Object.isFrozen(value) || Object.keys(value).length!==3)throw new TypeError('Duration must be an immutable checked algebraic value');
  for(const key of ['$','secs','nanos']){const descriptor=Object.getOwnPropertyDescriptor(value,key);if(!descriptor || !Object.hasOwn(descriptor,'value'))throw new TypeError('Duration requires own data fields');}
  if(value.$!=='Duration')throw new TypeError('Duration constructor tag is invalid');
  u64(value.secs);u32(value.nanos);if(value.nanos>=SECOND)throw new RangeError('Duration nanos must be normalized below one second');return value;
}
const total=value=>{const checked=duration(value);return checked.secs*SECOND+checked.nanos;};
const fromTotal=value=>make(value/SECOND,value%SECOND);
const checkedTotal=value=>value<0n || value>MAX_NANOS ? NONE:some(fromTotal(value));
const unwrap=(value,message)=>{if(value.$==='None')throw new RangeError(message);return value.field0;};
export function std_time_duration_new(secs,nanos){u64(secs);u32(nanos);const carry=secs+nanos/SECOND;if(carry>U64_MAX)throw new RangeError('overflow in Duration::new');return make(carry,nanos%SECOND);}
export const std_time_duration_from_secs=secs=>make(u64(secs),0n);
export const std_time_duration_from_millis=value=>fromTotal(u64(value)*1000000n);
export const std_time_duration_from_micros=value=>fromTotal(u64(value)*1000n);
export const std_time_duration_from_nanos=value=>fromTotal(u64(value));
export const std_time_duration_default=()=>std_time_duration_ZERO;
export const std_time_duration_is_zero=value=>total(value)===0n;
export const std_time_duration_as_secs=value=>duration(value).secs;
export const std_time_duration_subsec_millis=value=>duration(value).nanos/1000000n;
export const std_time_duration_subsec_micros=value=>duration(value).nanos/1000n;
export const std_time_duration_subsec_nanos=value=>duration(value).nanos;
export const std_time_duration_as_millis=value=>total(value)/1000000n;
export const std_time_duration_as_micros=value=>total(value)/1000n;
export const std_time_duration_as_nanos=total;
export const std_time_duration_abs_diff=(left,right)=>{const a=total(left),b=total(right);return fromTotal(a>=b?a-b:b-a);};
export const std_time_duration_checked_add=(left,right)=>checkedTotal(total(left)+total(right));
export const std_time_duration_checked_sub=(left,right)=>checkedTotal(total(left)-total(right));
export const std_time_duration_checked_mul=(value,scalar)=>checkedTotal(total(value)*u32(scalar));
export const std_time_duration_checked_div=(value,scalar)=>{const nanos=total(value);u32(scalar);return scalar===0n?NONE:some(fromTotal(nanos/scalar));};
export const std_time_duration_saturating_add=(left,right)=>std_time_duration_checked_add(left,right).field0 ?? std_time_duration_MAX;
export const std_time_duration_saturating_sub=(left,right)=>std_time_duration_checked_sub(left,right).field0 ?? std_time_duration_ZERO;
export const std_time_duration_saturating_mul=(value,scalar)=>std_time_duration_checked_mul(value,scalar).field0 ?? std_time_duration_MAX;
export const std_time_duration_add=(left,right)=>unwrap(std_time_duration_checked_add(left,right),'overflow when adding durations');
export const std_time_duration_sub=(left,right)=>unwrap(std_time_duration_checked_sub(left,right),'overflow when subtracting durations');
export const std_time_duration_mul=(value,scalar)=>unwrap(std_time_duration_checked_mul(value,scalar),'overflow when multiplying duration by scalar');
export const std_time_duration_div=(value,scalar)=>unwrap(std_time_duration_checked_div(value,scalar),'divide by zero error when dividing duration by scalar');
export const std_time_duration_eq=(left,right)=>total(left)===total(right);
export const std_time_duration_lt=(left,right)=>total(left)<total(right);
export const std_time_duration_le=(left,right)=>total(left)<=total(right);
export const std_time_duration_gt=(left,right)=>total(left)>total(right);
export const std_time_duration_ge=(left,right)=>total(left)>=total(right);
const float=value=>{if(typeof value!=='number')throw new TypeError('f64 requires a checked IEEE-754 value');return value;};
export const std_time_duration_as_secs_f64=value=>{duration(value);return Number(value.secs)+Number(value.nanos)/1e9;};
export const std_time_duration_div_duration_f64=(left,right)=>{duration(left);duration(right);return (Number(left.secs)*1e9+Number(left.nanos))/(Number(right.secs)*1e9+Number(right.nanos));};
export function std_time_duration_try_from_secs_f64(value) {
  float(value);if(value<0)return err('Negative');if(!Number.isFinite(value) || value>=2**64)return err('OverflowOrNan');if(value===0)return ok(std_time_duration_ZERO);
  // Decode the original IEEE-754 rational before nanosecond rounding. Multiplying
  // a Number by 1e9 first would lose Rust's ties-to-even behavior near a boundary.
  const view=new DataView(new ArrayBuffer(8));view.setFloat64(0,value);const bits=view.getBigUint64(0),encodedExponent=Number((bits>>52n)&2047n);
  const significand=(bits&((1n<<52n)-1n))+(encodedExponent===0?0n:1n<<52n),shift=(encodedExponent===0?-1022:encodedExponent-1023)-52;
  const numerator=significand*SECOND;let nanos;
  if(shift>=0)nanos=numerator<<BigInt(shift);
  else {const divisor=1n<<BigInt(-shift),floor=numerator/divisor,remainder=numerator%divisor;nanos=floor+(remainder*2n>divisor || remainder*2n===divisor && floor%2n===1n?1n:0n);}
  return nanos>MAX_NANOS?err('OverflowOrNan'):ok(fromTotal(nanos));
}
export function std_time_float_secs_error_to_string(value) {
  if(!value || typeof value!=='object' || !Object.isFrozen(value) || Object.keys(value).length!==2)throw new TypeError('Invalid checked float seconds error');
  for(const key of ['$','kind']){const descriptor=Object.getOwnPropertyDescriptor(value,key);if(!descriptor || !Object.hasOwn(descriptor,'value'))throw new TypeError('Float seconds error requires own data fields');}
  const kind=value.kind,tag=kind && typeof kind==='object'?Object.getOwnPropertyDescriptor(kind,'$'):null;
  if(value.$!=='TryFromFloatSecsError' || !kind || !Object.isFrozen(kind) || Object.keys(kind).length!==1 || !tag || !Object.hasOwn(tag,'value'))throw new TypeError('Invalid checked float seconds error kind');
  if(value.kind.$==='Negative')return 'cannot convert float seconds to Duration: value is negative';
  if(value.kind.$==='OverflowOrNan')return 'cannot convert float seconds to Duration: value is either too big or NaN';
  throw new TypeError('Unknown float seconds error variant');
}
export function std_time_duration_from_secs_f64(value){const result=std_time_duration_try_from_secs_f64(value);if(result.$==='Err')throw new RangeError(std_time_float_secs_error_to_string(result.field0));return result.field0;}
export const std_time_duration_mul_f64=(value,scalar)=>std_time_duration_from_secs_f64(std_time_duration_as_secs_f64(value)*float(scalar));
export const std_time_duration_div_f64=(value,scalar)=>std_time_duration_from_secs_f64(std_time_duration_as_secs_f64(value)/float(scalar));

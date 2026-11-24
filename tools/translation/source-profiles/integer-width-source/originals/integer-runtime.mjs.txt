// Fixed-width arithmetic uses primitive bigint only, without coercion hooks.
const UMAX=18446744073709551615n,IMIN=-9223372036854775808n,IMAX=9223372036854775807n,WIDTH=18446744073709551616n;
const none=Object.freeze({$:'None'}),some=value=>Object.freeze({$:'Some',field0:value});
function value(input,signed){if(typeof input!=='bigint'||input<(signed?IMIN:0n)||input>(signed?IMAX:UMAX))throw new TypeError('Actual fixed-width '+(signed?'i64':'u64')+' primitive required');return input;}
function calculate(signed,method,args){
 const values=args.map(input=>value(input,signed)),a=values[0],b=values[1],lower=signed?IMIN:0n,upper=signed?IMAX:UMAX;
 if(method==='min')return a<b?a:b;if(method==='max')return a>b?a:b;if(method==='clamp'){if(b>values[2])throw new RangeError('Native clamp minimum exceeds maximum');return a<b?b:a>values[2]?values[2]:a;}
 const [mode,operation]=method.split('_');let result;
 if(operation==='abs')result=a<0n?-a:a;
 else if(operation==='add')result=a+b;else if(operation==='sub')result=a-b;else if(operation==='mul')result=a*b;
 else if(operation==='div'||operation==='rem'){if(b===0n||signed&&a===IMIN&&b===-1n)return none;result=operation==='div'?a/b:a%b;}
 else throw new TypeError('Unregistered fixed-width operation');
 if(mode==='checked')return result<lower||result>upper?none:some(result);
 if(mode==='saturating')return result<lower?lower:result>upper?upper:result;
 if(mode==='wrapping'){const unsigned=((result%WIDTH)+WIDTH)%WIDTH;return signed&&unsigned>IMAX?unsigned-WIDTH:unsigned;}
 throw new TypeError('Unregistered fixed-width arithmetic mode');
}
export const router_integer_u64_saturating_add=(value,other)=>calculate(false,"saturating_add",[value,other]);
export const router_integer_u64_saturating_sub=(value,other)=>calculate(false,"saturating_sub",[value,other]);
export const router_integer_u64_saturating_mul=(value,other)=>calculate(false,"saturating_mul",[value,other]);
export const router_integer_u64_wrapping_add=(value,other)=>calculate(false,"wrapping_add",[value,other]);
export const router_integer_u64_wrapping_sub=(value,other)=>calculate(false,"wrapping_sub",[value,other]);
export const router_integer_u64_wrapping_mul=(value,other)=>calculate(false,"wrapping_mul",[value,other]);
export const router_integer_u64_min=(value,other)=>calculate(false,"min",[value,other]);
export const router_integer_u64_max=(value,other)=>calculate(false,"max",[value,other]);
export const router_integer_u64_clamp=(value,other,upper)=>calculate(false,"clamp",[value,other,upper]);
export const router_integer_u64_checked_add=(value,other)=>calculate(false,"checked_add",[value,other]);
export const router_integer_u64_checked_sub=(value,other)=>calculate(false,"checked_sub",[value,other]);
export const router_integer_u64_checked_mul=(value,other)=>calculate(false,"checked_mul",[value,other]);
export const router_integer_u64_checked_div=(value,other)=>calculate(false,"checked_div",[value,other]);
export const router_integer_u64_checked_rem=(value,other)=>calculate(false,"checked_rem",[value,other]);
export const router_integer_i64_saturating_add=(value,other)=>calculate(true,"saturating_add",[value,other]);
export const router_integer_i64_saturating_sub=(value,other)=>calculate(true,"saturating_sub",[value,other]);
export const router_integer_i64_saturating_mul=(value,other)=>calculate(true,"saturating_mul",[value,other]);
export const router_integer_i64_wrapping_add=(value,other)=>calculate(true,"wrapping_add",[value,other]);
export const router_integer_i64_wrapping_sub=(value,other)=>calculate(true,"wrapping_sub",[value,other]);
export const router_integer_i64_wrapping_mul=(value,other)=>calculate(true,"wrapping_mul",[value,other]);
export const router_integer_i64_min=(value,other)=>calculate(true,"min",[value,other]);
export const router_integer_i64_max=(value,other)=>calculate(true,"max",[value,other]);
export const router_integer_i64_clamp=(value,other,upper)=>calculate(true,"clamp",[value,other,upper]);
export const router_integer_i64_checked_add=(value,other)=>calculate(true,"checked_add",[value,other]);
export const router_integer_i64_checked_sub=(value,other)=>calculate(true,"checked_sub",[value,other]);
export const router_integer_i64_checked_mul=(value,other)=>calculate(true,"checked_mul",[value,other]);
export const router_integer_i64_checked_div=(value,other)=>calculate(true,"checked_div",[value,other]);
export const router_integer_i64_checked_rem=(value,other)=>calculate(true,"checked_rem",[value,other]);
export const router_integer_i64_checked_abs=(value)=>calculate(true,"checked_abs",[value]);
export const router_integer_i64_saturating_abs=(value)=>calculate(true,"saturating_abs",[value]);

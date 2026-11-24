// Shared positive rational algebra only: no Rust/JSON grammar, source owner,
// feature or overflow-lint policy is inferred by this operation.
export const EXACT_BINARY64_MAX_RATIONAL_BITS=32768;
function range(code,message){const error=new RangeError(message);error.code=code;throw error;}
function roundRatio(numerator,denominator,shift) {
  if(shift>=0)numerator<<=BigInt(shift);else denominator<<=BigInt(-shift);
  const quotient=numerator/denominator,remainder=numerator%denominator,twice=2n*remainder;
  return quotient+(twice>denominator||twice===denominator&&(quotient&1n)!==0n?1n:0n);
}
export function roundPositiveRationalBinary64(numerator,denominator) {
  if(typeof numerator!=='bigint'||numerator<0n||typeof denominator!=='bigint'||denominator<=0n)throw new TypeError('Exact binary64 rounding needs a nonnegative/positive BigInt ratio');
  const numeratorBits=numerator.toString(2).length,denominatorBits=denominator.toString(2).length;
  if(numeratorBits>EXACT_BINARY64_MAX_RATIONAL_BITS||denominatorBits>EXACT_BINARY64_MAX_RATIONAL_BITS)range('ERR_EXACT_BINARY64_BOUND','Exact binary64 rational exceeds its checked bit domain');
  if(numerator===0n)return 0n;
  let exponent=numeratorBits-denominatorBits;
  if(exponent>=0?numerator<(denominator<<BigInt(exponent)):(numerator<<BigInt(-exponent))<denominator)exponent--;
  if(exponent>1023)range('ERR_EXACT_BINARY64_OVERFLOW','Exact rational rounds outside finite binary64');
  if(exponent<-1075)return 0n;
  if(exponent<-1022)return roundRatio(numerator,denominator,1074);
  let significand=roundRatio(numerator,denominator,52-exponent);
  if(significand===1n<<53n){significand>>=1n;exponent++;}
  if(exponent>1023)range('ERR_EXACT_BINARY64_OVERFLOW','Exact rational rounds outside finite binary64');
  return BigInt(exponent+1023)<<52n|significand-(1n<<52n);
}

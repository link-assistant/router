// Default serde_json 1.0.151 numeric parsing, derived from its licensed de.rs.
// BigInt retains the u64 accumulator; every scale operation rounds as binary64.
export const U64_MAX=(1n<<64n)-1n,I64_MIN=-(1n<<63n),I64_MAX=(1n<<63n)-1n;
const digit=byte=>byte >= 48 && byte <= 57;
const number=(kind,value)=>Object.freeze({$:kind,field0:value});
const POW10=Object.freeze(Array.from({length:309},(_,index)=>Number(`1e${index}`)));
export function parseJsonNumber(reader) {
  const positive=reader.peek() !== 45;if (!positive)reader.eat();
  const first=reader.next();if(first === undefined)reader.fail('EOF while parsing a value',false);
  if(!digit(first))reader.fail('invalid number',false);
  let significand=BigInt(first-48),exponent=0,floating=false;
  if(first === 48 && digit(reader.peek()))reader.fail('invalid number');
  while(digit(reader.peek())) {
    const next=significand*10n+BigInt(reader.peek()-48);
    if(next > U64_MAX) {floating=true;while(digit(reader.peek())){reader.eat();exponent++;}break;}
    reader.eat();significand=next;
  }
  if(reader.peek() === 46) {
    floating=true;reader.eat();let fraction=0,overflow=false;
    while(digit(reader.peek())) {
      const next=significand*10n+BigInt(reader.peek()-48);
      if(next > U64_MAX) {overflow=true;while(digit(reader.peek()))reader.eat();break;}
      reader.eat();significand=next;fraction--;
    }
    if(!fraction && !overflow)reader.fail(reader.peek() === undefined?'EOF while parsing a value':'invalid number');
    exponent+=fraction;
  }
  if(reader.peek() === 101 || reader.peek() === 69) {
    floating=true;reader.eat();let positiveExponent=true;
    if(reader.peek() === 43 || reader.peek() === 45){positiveExponent=reader.peek() === 43;reader.eat();}
    const firstExponent=reader.next();
    if(firstExponent === undefined)reader.fail('EOF while parsing a value',false);
    if(!digit(firstExponent))reader.fail('invalid number',false);
    let value=firstExponent-48;
    while(digit(reader.peek())) {
      const next=value*10+(reader.next()-48);
      if(next > 2147483647) {
        if(significand !== 0n && positiveExponent)reader.fail('number out of range',false);
        while(digit(reader.peek()))reader.eat();return number('Float',positive?0:-0);
      }
      value=next;
    }
    exponent=Math.max(-2147483648,Math.min(2147483647,exponent+(positiveExponent?value:-value)));
  }
  if(!floating) {
    if(positive)return number('PosInt',significand);
    if(significand > 0n && significand <= -I64_MIN)return number('NegInt',-significand);
    return number('Float',-Number(significand));
  }
  let value=Number(significand);
  for (;;) {
    if(Math.abs(exponent) <= 308) {
      value=exponent >= 0?value*POW10[exponent]:value/POW10[-exponent];
      if(!Number.isFinite(value))reader.fail('number out of range',false);break;
    }
    if(value === 0)break;
    if(exponent >= 0)reader.fail('number out of range',false);
    value/=1e308;exponent+=308;
  }
  return number('Float',positive?value:-value);
}

// Select the shortest decimal which round-trips to the exact binary64, then
// the closest decimal, with an even coefficient resolving a distance tie.
// BigInt rational arithmetic avoids Number.toString's formatting conventions.
const pow10=exponent=>10n**BigInt(exponent);
function rational(value) {
  const view=new DataView(new ArrayBuffer(8));view.setFloat64(0,value);
  const bits=view.getBigUint64(0),exponent=Number((bits>>52n)&2047n);
  const mantissa=(bits&((1n<<52n)-1n))+(exponent?1n<<52n:0n),power=(exponent||1)-1075;
  return power >= 0?[mantissa<<BigInt(power),1n]:[mantissa,1n<<BigInt(-power)];
}
const magnitude=value=>value < 0n?-value:value;
export function formatJsonFloat(value) {
  if(typeof value !== 'number' || !Number.isFinite(value))throw new TypeError('JSON float is outside the finite binary64 domain');
  if(value === 0)return Object.is(value,-0)?'-0.0':'0.0';
  const negative=value < 0,absolute=Math.abs(value),[numerator,denominator]=rational(absolute);
  let decimalExponent=Math.floor(Math.log10(absolute));
  const comparePower=power=>power >= 0?numerator-denominator*pow10(power):numerator*pow10(-power)-denominator;
  while(comparePower(decimalExponent)<0)decimalExponent--;
  while(comparePower(decimalExponent+1)>=0)decimalExponent++;
  let coefficient,power;
  for(let digits=1;digits<=17;digits++) {
    power=decimalExponent-digits+1;
    const scaledNumerator=power < 0?numerator*pow10(-power):numerator;
    const scaledDenominator=power > 0?denominator*pow10(power):denominator;
    const quotient=scaledNumerator/scaledDenominator,remainder=scaledNumerator%scaledDenominator;
    const rounded=quotient+(2n*remainder>scaledDenominator || 2n*remainder === scaledDenominator && quotient%2n?1n:0n);
    const candidates=[rounded,rounded-1n,rounded+1n].filter(candidate=>candidate>0n && Number(`${candidate}e${power}`) === absolute);
    if(!candidates.length)continue;
    candidates.sort((left,right)=>{
      const delta=magnitude(left*scaledDenominator-scaledNumerator)-magnitude(right*scaledDenominator-scaledNumerator);
      return delta < 0n?-1:delta > 0n?1:Number(left%2n-right%2n);
    });coefficient=candidates[0];break;
  }
  if(coefficient === undefined)throw new Error('Binary64 decimal selection failed');
  while(coefficient%10n === 0n){coefficient/=10n;power++;}
  const digits=String(coefficient),exponent=digits.length-1+power;let text;
  // Pinned zmij 1.0.23 f64 formatting uses fixed decimal exponents -5..=15.
  if(exponent >= -5 && exponent <= 15) {
    const point=digits.length+power;
    text=point<=0?'0.'+'0'.repeat(-point)+digits:point>=digits.length?digits+'0'.repeat(point-digits.length)+'.0':digits.slice(0,point)+'.'+digits.slice(point);
  } else text=digits[0]+(digits.length>1?'.'+digits.slice(1):'')+'e'+(exponent >= 0?'+':'')+exponent;
  return (negative?'-':'')+text;
}

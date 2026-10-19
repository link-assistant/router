// Separate exact-rational utility and bounded original-lexical reader draft.
// No Number(decimalText), parseFloat or intermediate decimal floating arithmetic.
// The bound is an explicit adapter-domain refusal, never a Rust syntax result.
import {U64_MAX,I64_MIN} from './json-numbers.mjs';
import {roundPositiveRationalBinary64} from './exact-binary64.mjs';
import {lexicalConciseFloat64,lexicalTruncatedFloat64,JSON_LEXICAL_MAX_MANTISSA_DIGITS} from './json-roundtrip-lexical.mjs';
export const JSON_ROUNDTRIP_MAX_DIGITS=4096;
const SIGN=1n<<63n;
const digit=byte=>byte>=48&&byte<=57;
const tagged=(kind,value)=>Object.freeze({$:kind,field0:value});
function failure(code,message){const error=new RangeError(message);error.code=code;throw error;}
const bound=message=>failure('ERR_JSON_ROUNDTRIP_CAPABILITY_BOUND',message);
const outOfRange=()=>failure('ERR_JSON_ROUNDTRIP_NUMBER_RANGE','number out of range');
function fromBits(bits){const view=new DataView(new ArrayBuffer(8));view.setBigUint64(0,bits);return view.getFloat64(0);}

// coefficient * 10^exponent; coefficient is canonical unsigned decimal digits.
export function decimalToBinary64(coefficient,exponent,negative=false) {
  if(typeof coefficient!=='string'||coefficient.length>JSON_ROUNDTRIP_MAX_DIGITS)bound('decimal coefficient exceeds the checked roundtrip digit domain');
  if(!/^(?:0|[1-9][0-9]*)$/u.test(coefficient)||!Number.isSafeInteger(exponent)||Math.abs(exponent)>2147483647+JSON_ROUNDTRIP_MAX_DIGITS||typeof negative!=='boolean')throw new TypeError('decimal rounding requires canonical digits, a checked exponent and a boolean sign');
  const sign=negative?SIGN:0n;
  if(coefficient==='0')return fromBits(sign);
  const scientific=coefficient.length-1+exponent;
  // These comparisons happen before constructing a potentially huge power.
  if(scientific>308)outOfRange();
  if(scientific<-324)return fromBits(sign);
  let numerator=BigInt(coefficient),denominator=1n;
  if(exponent>=0)numerator*=10n**BigInt(exponent);else denominator=10n**BigInt(-exponent);
  try{return fromBits(sign|roundPositiveRationalBinary64(numerator,denominator));}
  catch(error){if(error?.code==='ERR_EXACT_BINARY64_OVERFLOW')outOfRange();if(error?.code==='ERR_EXACT_BINARY64_BOUND')bound('decimal rational exceeds the checked roundtrip bit domain');throw error;}
}

export function parseJsonRoundtripNumber(reader) {
  const positive=reader.peek()!==45;if(!positive)reader.eat();
  const first=reader.next();if(first===undefined)reader.fail('EOF while parsing a value',false);
  if(!digit(first))reader.fail('invalid number',false);
  if(first===48&&digit(reader.peek()))reader.fail('invalid number');
  let digits=String.fromCharCode(first),fractionDigits=0,floating=false;
  const append=byte=>{if(digits.length>=JSON_ROUNDTRIP_MAX_DIGITS)bound('JSON mantissa exceeds the checked roundtrip digit domain');digits+=String.fromCharCode(byte);};
  while(digit(reader.peek()))append(reader.next());
  const integerDigits=digits;
  if(reader.peek()===46) {
    floating=true;reader.eat();
    while(digit(reader.peek())){append(reader.next());fractionDigits++;}
    if(!fractionDigits)reader.fail(reader.peek()===undefined?'EOF while parsing a value':'invalid number');
  }
  const coefficient=digits.replace(/^0+(?=[0-9])/u,'');
  if(digits.length>JSON_LEXICAL_MAX_MANTISSA_DIGITS)bound('JSON mantissa exceeds the source-derived'+JSON_LEXICAL_MAX_MANTISSA_DIGITS+'-digit original-lexical candidate domain');
  let exponent=0;
  if(reader.peek()===101||reader.peek()===69) {
    floating=true;reader.eat();let positiveExponent=true;
    if(reader.peek()===43||reader.peek()===45){positiveExponent=reader.peek()===43;reader.eat();}
    const firstExponent=reader.next();if(firstExponent===undefined)reader.fail('EOF while parsing a value',false);
    if(!digit(firstExponent))reader.fail('invalid number',false);
    let value=firstExponent-48,count=1;
    while(digit(reader.peek())) {
      if(++count>JSON_ROUNDTRIP_MAX_DIGITS)bound('JSON exponent exceeds the checked roundtrip digit domain');
      const next=value*10+(reader.next()-48);
      if(next>2147483647) {
        // Original de.rs reports nonzero positive overflow immediately, before
        // consuming later exponent digits. Other overflow cases yield signed 0.
        if(coefficient!=='0'&&positiveExponent)reader.fail('number out of range',false);
        while(digit(reader.peek())){if(++count>JSON_ROUNDTRIP_MAX_DIGITS)bound('JSON exponent exceeds the checked roundtrip digit domain');reader.eat();}
        return tagged('Float',positive?0:-0);
      }
      value=next;
    }
    exponent=positiveExponent?value:-value;
  }
  if(!floating) {
    const integer=BigInt(coefficient);
    if(positive&&integer<=U64_MAX)return tagged('PosInt',integer);
    if(!positive&&integer>0n&&integer<=-I64_MIN)return tagged('NegInt',-integer);
    if(integer<=U64_MAX)return tagged('Float',decimalToBinary64(coefficient,0,!positive));
  }
  const combined=BigInt(coefficient),value=combined<=U64_MAX?lexicalConciseFloat64(combined,Math.max(-2147483648,Math.min(2147483647,exponent-fractionDigits))):lexicalTruncatedFloat64(integerDigits==='0'?'':integerDigits,digits.slice(integerDigits.length),exponent);
  if(!Number.isFinite(value))reader.fail('number out of range',false);
  return tagged('Float',positive?value:-value);
}

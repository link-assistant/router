// Direct bounded source-derived serde_json lexical branch execution. This is
// not a claim that every source approximation equals ideal nearest rounding.
import {createHash} from 'node:crypto';
import {compileOriginalDigitRetentionControl,projectOriginalDigitRetention} from '../arithmetic-digit-retention.mjs';
import {JSON_ROUNDTRIP_RETENTION_SOURCES} from './json-roundtrip-retention-source.mjs';
import {JSON_LEXICAL_CACHE_SOURCE,JSON_LEXICAL_CACHE_SOURCE_SHA256} from './json-roundtrip-cache-source.mjs';
const U64=(1n<<64n)-1n,HIDDEN=1n<<52n,FRAC=HIDDEN-1n,INF=0x7ff0000000000000n;
const retentionPins=[['src/lexical/bhcomp.rs','26f39d52008225a6b377d7246d326940d44200e160a7b4652733e712e1a45a04'],['src/lexical/num.rs','2d06111d28616221995f7b4d4f13625b8d902884921268b0e02e544f871a5339']];
const retentionSources=retentionPins.map(([path,sha256])=>{const rows=JSON_ROUNDTRIP_RETENTION_SOURCES.filter(row=>row.path===path);if(rows.length!==1||rows[0].sha256!==sha256||Buffer.byteLength(rows[0].source)!==rows[0].bytes||createHash('sha256').update(rows[0].source).digest('hex')!==sha256)throw new TypeError('Original lexical retention source changed');return rows[0].source;});
const retentionControl=compileOriginalDigitRetentionControl(retentionSources[0],retentionSources[1],{functionName:'parse_mantissa',trait:'Float',target:'f64'});
// This bound comes from the original retained prefix plus its actual sticky
// digit, not from an ideal-rounding replacement. Admission/allocators stay open.
export const JSON_LEXICAL_MAX_MANTISSA_DIGITS=retentionControl.emittedDigitsBound;
if(createHash('sha256').update(JSON_LEXICAL_CACHE_SOURCE).digest('hex')!=='0f8f74a22cb7d871322a9893bffd0255ca10bf9dffd13afb2462dd3d7f51805f'||JSON_LEXICAL_CACHE_SOURCE_SHA256!=='0f8f74a22cb7d871322a9893bffd0255ca10bf9dffd13afb2462dd3d7f51805f')throw new TypeError('Original lexical cache source changed');
function array(name,type,count) {
  // Input is the exact hash-checked original constant source, never caller text.
  const escaped=name.replace(/[.*+?^${}()|[\]\\]/gu,'\\$&'),match=new RegExp('const '+escaped+': \\['+type+'; '+count+'\\] = \\[([^\\]]*)\\];','u').exec(JSON_LEXICAL_CACHE_SOURCE);
  if(!match)throw new TypeError('Original lexical cache layout changed');
  const text=match[1].replace(/\/\/[^\n]*/gu,''),values=text.split(',').map(value=>value.trim()).filter(Boolean);
  if(values.length!==count||values.some(value=>!/^[-]?[0-9]+$/u.test(value)))throw new TypeError('Original lexical cache has unproved scalar data');
  const decoded=values.map(BigInt);if(decoded.some(value=>type==='u64'?value<0n||value>U64:value<-2147483648n||value>2147483647n))throw new TypeError('Original lexical cache scalar type changed');
  return Object.freeze(decoded);
}
const smallM=array('BASE10_SMALL_MANTISSA','u64',10),smallE=array('BASE10_SMALL_EXPONENT','i32',10),smallInt=array('BASE10_SMALL_INT_POWERS','u64',10),largeM=array('BASE10_LARGE_MANTISSA','u64',66),largeE=array('BASE10_LARGE_EXPONENT','i32',66);
const sat=value=>Math.max(-2147483648,Math.min(2147483647,value));
const mask=bits=>(1n<<BigInt(bits))-1n;
const number=bits=>{const data=new DataView(new ArrayBuffer(8));data.setBigUint64(0,bits);return data.getFloat64(0);};
function normalize(fp){const shift=fp.mant===0n?0:64-fp.mant.toString(2).length;fp.mant<<=BigInt(shift);fp.exp-=shift;return shift;}
function mul(fp,mant,exp){fp.mant=(fp.mant*mant+(1n<<63n))>>64n;fp.exp+=exp+64;}
function nativeBits(source,mode='nearest',sticky=false) {
  const fp={...source};normalize(fp);
  const final=fp.exp+11,shift=final<-1074?-1074-fp.exp:11;
  if(shift>64){fp.mant=0n;fp.exp=0;}
  else {
    const discarded=fp.mant&mask(shift),half=shift===0?0n:1n<<BigInt(shift-1);
    fp.mant=shift===64?0n:fp.mant>>BigInt(shift);fp.exp+=shift;
    if(mode==='nearest'&&(discarded>half||discarded===half&&(sticky||(fp.mant&1n)!==0n)))fp.mant++;
  }
  if((fp.mant&(1n<<53n))!==0n){fp.mant>>=1n;fp.exp++;}
  if(fp.exp>=972) {
    const diff=fp.exp-972;
    if(diff<=52&&(fp.mant&(mask(53)^mask(52-diff)))===0n){fp.mant<<=BigInt(diff+1);fp.exp-=diff+1;}
  }
  if(fp.mant===0n||fp.exp<-1074)return 0n;
  if(fp.exp>=972)return INF;
  const exponent=fp.exp===-1074&&(fp.mant&HIDDEN)===0n?0:fp.exp+1075;
  return BigInt(exponent)<<52n|fp.mant&FRAC;
}
function accurate(count,fp) {
  const extra=fp.exp<=-1086?-1074-fp.exp:11;
  if(extra>65)return true;
  if(extra===65)return fp.mant+BigInt(count)<=U64;
  const low=fp.mant&mask(extra),half=extra===0?0n:1n<<BigInt(extra-1),error=BigInt(count);
  return !(((half-error)&U64)<low&&low<((half+error)&U64));
}
function moderate(mantissa,exponent,truncated) {
  const biased=sat(exponent+350),fp={mant:mantissa,exp:0};
  if(biased<0)return {fp:{mant:0n,exp:0},valid:true};
  const index=Math.floor(biased/10),small=biased%10;
  if(index>=66)return {fp:{mant:1n<<63n,exp:2047},valid:true};
  let errors=truncated?4:0,product=fp.mant*smallInt[small];
  if(product>U64){normalize(fp);mul(fp,smallM[small],Number(smallE[small]));errors+=4;}
  else{fp.mant=product;normalize(fp);}
  mul(fp,largeM[index],Number(largeE[index]));if(errors>0)errors++;errors+=4;
  errors*=2**normalize(fp);
  return {fp,valid:accurate(errors,fp),errors};
}
function fast(mantissa,exponent) {
  if(mantissa===0n)return 0;
  if(mantissa>>53n)return null;
  if(exponent===0)return Number(mantissa);
  if(exponent>=-22&&exponent<=22)return exponent>=0?Number(mantissa)*Number(10n**BigInt(exponent)):Number(mantissa)/Number(10n**BigInt(-exponent));
  if(exponent>22&&exponent<=37){const shifted=mantissa*10n**BigInt(exponent-22);if(shifted<=U64&&(shifted>>53n)===0n)return Number(shifted)*Number(10n**22n);}
  return null;
}
function positiveBigintBits(coefficient,exponent) {
  // Source large_atof: full integer -> hi64/sticky -> original native rounding.
  const value=coefficient*10n**BigInt(exponent),length=value.toString(2).length;
  if(value===0n)return 0n;
  const discarded=Math.max(0,length-64),mant=discarded?value>>BigInt(discarded):value<<BigInt(64-length),sticky=discarded>0&&(value&mask(discarded))!==0n;
  return nativeBits({mant,exp:length-64},'nearest',sticky);
}
export function sourceLexicalMantissa(integer,fraction) {
  return projectOriginalDigitRetention(retentionControl,integer,fraction);
}

function fallback(integer,fraction,exponent,bits) {
  const nonzeroFraction=integer.length===0?fraction.replace(/^0+/u,''):fraction;
  const parsed=sourceLexicalMantissa(integer,nonzeroFraction),count=parsed.count;
  const leading=fraction.length-nonzeroFraction.length,sci=integer.length===0?sat(sat(exponent-leading)-1):sat(exponent+integer.length-1),scaled=sci+1-count;
  const coefficient=parsed.coefficient;
  if(scaled>=0)return {bits:positiveBigintBits(coefficient,scaled),branch:'fallback-positive'};
  // Source bh_extended/small_atof. Preserve the actual chosen lower candidate;
  // even an inaccurate moderate interval cannot silently become ideal rounding.
  const expField=Number(bits>>52n),mant=(bits&FRAC)+(expField?HIDDEN:0n),binary=(expField||1)-1075-1,halfMant=(mant<<1n)+1n;
  let real=coefficient,theory=halfMant*5n**BigInt(-scaled),difference=binary-scaled;
  if(difference>0)theory<<=BigInt(difference);else if(difference<0)real<<=BigInt(-difference);
  return {bits:real>theory?bits+1n:real<theory?bits:(mant&1n)!==0n?bits+1n:bits,branch:'fallback-negative'};
}
function checkedParts(integer,fraction,exponent) {
  if(typeof integer!=='string'||typeof fraction!=='string'||!Number.isInteger(exponent)||exponent<-2147483648||exponent>2147483647||! /^(?:[1-9][0-9]*|)$/u.test(integer)||! /^[0-9]*$/u.test(fraction)||!integer.length&&!fraction.length)throw new TypeError('Lexical parts need actual canonical integer/fraction and i32 exponent');
  if(!/[1-9]/u.test(integer+fraction))throw new TypeError('Truncated lexical input requires a nonzero source coefficient; the reader uses concise parsing for zero');
  if(integer.length+fraction.length>JSON_LEXICAL_MAX_MANTISSA_DIGITS){const error=new RangeError('JSON mantissa exceeds the source-derived'+JSON_LEXICAL_MAX_MANTISSA_DIGITS+'-digit original-lexical candidate domain');error.code='ERR_JSON_ROUNDTRIP_CAPABILITY_BOUND';throw error;}
}
export function lexicalConciseTrace(mantissa,exponent) {
  if(typeof mantissa!=='bigint'||mantissa<0n||mantissa>U64||!Number.isInteger(exponent)||exponent<-2147483648||exponent>2147483647)throw new TypeError('Concise lexical parts need actual u64/i32 values');
  const direct=fast(mantissa,exponent);if(direct!==null)return Object.freeze({value:direct,branch:'fast'});
  const {fp,valid}=moderate(mantissa,exponent,false),bits=nativeBits(fp,valid?'nearest':'downward');
  if(valid||bits===INF)return Object.freeze({value:number(bits),branch:bits===INF?'special':'moderate'});
  const result=fallback(String(mantissa),'',exponent,bits);return Object.freeze({value:number(result.bits),branch:result.branch});
}
export function lexicalConciseFloat64(mantissa,exponent){return lexicalConciseTrace(mantissa,exponent).value;}
export function lexicalModerateTrace(mantissa,exponent,truncated) {
  if(typeof mantissa!=='bigint'||mantissa<0n||mantissa>U64||!Number.isInteger(exponent)||exponent<-2147483648||exponent>2147483647||typeof truncated!=='boolean')throw new TypeError('Moderate trace needs actual u64/i32/bool values');
  const result=moderate(mantissa,exponent,truncated);return Object.freeze({mantissa:result.fp.mant,exponent:result.fp.exp,errors:result.errors??null,accepted:result.valid});
}
export function lexicalTruncatedTrace(integer,fraction,exponent) {
  checkedParts(integer,fraction,exponent);fraction=fraction.replace(/0+$/u,'');
  const digits=integer+fraction;let mantissa=0n,consumed=0;
  for(const digit of digits){const next=mantissa*10n+BigInt(digit);if(next>U64)break;mantissa=next;consumed++;}
  const truncated=digits.length-consumed,mantExp=sat(exponent-fraction.length+truncated),{fp,valid}=moderate(mantissa,mantExp,true),bits=nativeBits(fp,valid?'nearest':'downward');
  if(valid||bits===INF)return Object.freeze({value:number(bits),branch:bits===INF?'special':'moderate'});
  const result=fallback(integer,fraction,exponent,bits);return Object.freeze({value:number(result.bits),branch:result.branch});
}

export function lexicalTruncatedFloat64(integer,fraction,exponent){return lexicalTruncatedTrace(integer,fraction,exponent).value;}

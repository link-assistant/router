// Written Rust decimals round exactly once, to the existing binary64 domain.
// Binary32, overflowing literals and floating CTFE remain separate profiles.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {TranslationError,unsupported} from '../vendor/meta-language/translation/diagnostics.js';
const hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const RUST_FLOAT_LITERAL_PROFILE=freeze({id:'rust-1.89-binary64-decimal-literals',rust:'1.89.0',maxTokenBytes:4096,maxDecimalExponent:4096,
  rounding:'one exact rational rounding, nearest with ties to even',binary32:false,constantEvaluation:false,
  sources:[
    {url:'https://raw.githubusercontent.com/rust-lang/rust/1.89.0/compiler/rustc_lexer/src/lib.rs',archive:'rust-lexer-1.89.0.rs.gz',bytes:39129,sha256:'7d99b37ea77e0d81049c5c81558e047c61e83209c2d376a80d5815764af8afe8',archiveSha256:'670be1a4fedbce4508f26bcb75ec6e8315d38015270926ba0f5de2728483fa1a'},
    {url:'https://raw.githubusercontent.com/rust-lang/rust/1.89.0/library/core/src/num/dec2flt/mod.rs',archive:'rust-dec2flt-1.89.0.rs.gz',bytes:11753,sha256:'d91b85cc57b39884e7fe99712bd35c3d5dd2fea2279cb8bf5d072225e780fe5e',archiveSha256:'634f7c6960d0f2b30ce2ae9d1d33caaa1a63f5956790aa039b040e38c6cc84de'},
  ]});
for(const entry of RUST_FLOAT_LITERAL_PROFILE.sources) {
  const archive=readFileSync(new URL('../source-profiles/floating-standard/'+entry.archive,import.meta.url));
  if(hash(archive)!==entry.archiveSha256)throw new TypeError('Rust float source archive checksum mismatch');
  const bytes=gunzipSync(archive,{maxOutputLength:200000});
  if(bytes.length!==entry.bytes||hash(bytes)!==entry.sha256)throw new TypeError('Rust float source checksum mismatch');
}
const refuse=(reason,span)=>{throw unsupported('Rust floating literal',reason,span);};
const malformed=span=>{throw new TranslationError('syntax','malformed original Rust floating token',span);};
const ratioLessPower=(numerator,denominator,exponent)=>exponent>=0?numerator<denominator<<BigInt(exponent):numerator<<BigInt(-exponent)<denominator;
function roundedRatio(numerator,denominator,shift) {
  if(shift>=0)numerator<<=BigInt(shift);else denominator<<=BigInt(-shift);
  const quotient=numerator/denominator,remainder=numerator%denominator,twice=remainder*2n;
  return quotient+(twice>denominator||twice===denominator&&(quotient&1n)!==0n?1n:0n);
}
function binary64(coefficient,decimalExponent,span) {
  let numerator=coefficient,denominator=1n;
  if(decimalExponent>=0)numerator*=10n**BigInt(decimalExponent);else denominator=10n**BigInt(-decimalExponent);
  let bits=0n;
  if(numerator!==0n) {
    let exponent=numerator.toString(2).length-denominator.toString(2).length;
    if(ratioLessPower(numerator,denominator,exponent))exponent--;
    if(exponent < -1022)bits=roundedRatio(numerator,denominator,1074);
    else {
      let significand=roundedRatio(numerator,denominator,52-exponent);
      if(significand===1n<<53n){significand>>=1n;exponent++;}
      if(exponent>1023)refuse('overflowing literal requires a separately checked overflowing_literals lint profile',span);
      bits=BigInt(exponent+1023)<<52n|significand-(1n<<52n);
    }
  }
  const bytes=new DataView(new ArrayBuffer(8));bytes.setBigUint64(0,bits);
  return {value:String(bytes.getFloat64(0)),floatBits:bits.toString(16).padStart(16,'0')};
}
export function isRustFloatToken(raw) {
  return typeof raw==='string'&&!/^0[xob]/u.test(raw)&&(/[.eE]/u.test(raw)||/f(?:32|64)$/u.test(raw));
}
export function decodeRustFloat(raw,span) {
  if(typeof raw!=='string'||!raw.length)malformed(span);
  if(raw.length>RUST_FLOAT_LITERAL_PROFILE.maxTokenBytes)refuse('literal exceeds the bounded source-token budget',span);
  const match=/^([0-9][0-9_]*)(?:\.([0-9][0-9_]*|))?(?:[eE]([+-]?)(_*[0-9][0-9_]*))?(f32|f64)?$/u.exec(raw);
  if(!match||!isRustFloatToken(raw)||match[2]===''&&(match[4]||match[5]))malformed(span);
  if(match[5]==='f32')refuse('binary32 identity and single-rounding arithmetic are not implemented by the binary64 profile',span);
  const writtenExponent=BigInt((match[3]==='-'?'-':'')+(match[4]?.replaceAll('_','')??'0'));
  if(writtenExponent>4096n||writtenExponent< -4096n)refuse('decimal exponent exceeds the bounded source-token budget',span);
  const fraction=match[2]?.replaceAll('_','')??'',coefficient=BigInt(match[1].replaceAll('_','')+fraction),exponent=Number(writtenExponent)-fraction.length;
  if(Math.abs(exponent)>RUST_FLOAT_LITERAL_PROFILE.maxDecimalExponent)refuse('fraction and exponent exceed the exact-rational budget',span);
  return {kind:'rustFloat',...binary64(coefficient,exponent,span),suffix:match[5]??'',raw};
}

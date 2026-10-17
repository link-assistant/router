// Decode the written Rust integer token before the pinned portable lexer.
// Bounds and contextual primitive identity remain semantic checker duties.
import {TranslationError,unsupported} from '../vendor/meta-language/translation/diagnostics.js';

export const RUST_INTEGER_LITERAL_PROFILE=Object.freeze({
  id:'rust-1.89-integer-tokens',rust:'1.89.0',
  url:'https://raw.githubusercontent.com/rust-lang/rust/1.89.0/compiler/rustc_lexer/src/lib.rs',
  sha256:'7d99b37ea77e0d81049c5c81558e047c61e83209c2d376a80d5815764af8afe8',
  lines:Object.freeze([748,820,1066,1099]),
});
const SUFFIX=/^[ui](?:8|16|32|64|128|size)$/u;
const BASES=Object.freeze({x:{digits:/^[0-9a-fA-F_]+/u,valid:/^[0-9a-fA-F]+$/u},o:{digits:/^[0-9_]+/u,valid:/^[0-7]+$/u},b:{digits:/^[0-9_]+/u,valid:/^[01]+$/u}});

export function decodeRustInteger(raw,span) {
  if(typeof raw!=='string'||!raw.length)throw new TranslationError('syntax','missing Rust integer token',span);
  const prefix=/^0([xob])/u.exec(raw),base=prefix?BASES[prefix[1]]:null;
  const rest=prefix?raw.slice(2):raw,match=(base?.digits??/^[0-9][0-9_]*/u).exec(rest);
  const digits=match?.[0].replaceAll('_','')??'',suffix=rest.slice(match?.[0].length??0);
  if(!digits||!(base?.valid??/^[0-9]+$/u).test(digits))throw new TranslationError('syntax',`malformed Rust integer token ${raw}`,span);
  if(suffix&&!SUFFIX.test(suffix))throw unsupported('Rust numeric literal','requires an integer token with a checked standard integer suffix; floating literals and other suffixes need separate profiles',span);
  // BigInt conversion never rounds a u128 or a value above Number's range.
  // The original token and source coordinates remain on the lexical result.
  const value=BigInt((prefix?prefix[0]:'')+digits).toString();
  return {kind:'number',value,suffix,raw};
}

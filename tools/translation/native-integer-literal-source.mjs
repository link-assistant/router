// Bounded lexical integer/source DATA. No expression, type or owner authority.
import {decodeRustInteger} from './extensions/rust-number.mjs';
import {primitiveBitwiseType,primitiveBitwiseLiteral} from './primitive-bitwise-types.mjs';
export function readNativeIntegerLiteralSource(rows){
 if(!Array.isArray(rows)||rows.length<1||rows.length>2)return null;const negative=rows[0]?.text==='-',token=rows[negative?1:0];if(rows.length!==(negative?2:1)||token?.type!=='number'||typeof token.text!=='string'||token.text.length>256)return null;
 try{const decoded=decodeRustInteger(token.text,{start:token.start,end:token.end});return {magnitude:decoded.value,decimal:(negative?'-':'')+decoded.value,suffix:decoded.suffix,negative,raw:token.text,sourceAuthority:false,semanticAuthority:false};}catch{return null;}
}
export function readFixedIntegerLiteralSource(rows,written=null){
 const value=readNativeIntegerLiteralSource(rows);if(!value||written!==null&&value.suffix&&value.suffix!==written)return null;const domain=value.suffix||written,native=primitiveBitwiseType(domain);if(!native||value.negative&&!native.signed||primitiveBitwiseLiteral(value.magnitude+'n',value.negative,domain)===null)return null;return {...value,domain};
}
// Counts have explicit caller bounds. This does not assume a host usize width.
export function readNativeCountLiteralSource(rows,{suffixes=['','usize','u64'],maximum='18446744073709551615'}={}){
 const value=readNativeIntegerLiteralSource(rows);if(!value||value.negative||!suffixes.includes(value.suffix)||typeof maximum!=='string'||!/^(?:0|[1-9][0-9]{0,38})$/u.test(maximum)||value.magnitude.length>maximum.length||value.magnitude.length===maximum.length&&value.magnitude>maximum)return null;return value;
}

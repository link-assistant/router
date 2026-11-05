// Primitive Unicode scalar strings and UTF-8 offsets. No coercion hooks,
// user callbacks or across-invocation value/verdict/result caches are used.
const LIMIT=1048576,UMAX=18446744073709551615n;
const HostString=String,HostObject=Object,HostReflect=Reflect,HostNumber=Number,HostBigInt=BigInt;
const get=Object.getOwnPropertyDescriptor,apply=Reflect.apply,freeze=Object.freeze,define=Object.defineProperty;
const charCode=String.prototype.charCodeAt,slice=String.prototype.slice,indexOf=String.prototype.indexOf,lastIndexOf=String.prototype.lastIndexOf,starts=String.prototype.startsWith,ends=String.prototype.endsWith,repeat=String.prototype.repeat,join=Array.prototype.join;
function host(){if(String!==HostString||Object!==HostObject||Reflect!==HostReflect||Number!==HostNumber||BigInt!==HostBigInt||get(HostReflect,'apply')?.value!==apply||get(HostObject,'getOwnPropertyDescriptor')?.value!==get||get(HostObject,'freeze')?.value!==freeze||get(HostObject,'defineProperty')?.value!==define||get(HostString.prototype,'charCodeAt')?.value!==charCode||get(HostString.prototype,'slice')?.value!==slice||get(HostString.prototype,'indexOf')?.value!==indexOf||get(HostString.prototype,'lastIndexOf')?.value!==lastIndexOf||get(HostString.prototype,'startsWith')?.value!==starts||get(HostString.prototype,'endsWith')?.value!==ends||get(HostString.prototype,'repeat')?.value!==repeat)throw new TypeError('Original text host operations required');}
const call=(operation,receiver,args)=>apply(operation,receiver,args),part=(value,start,end)=>call(slice,value,end===undefined?[start]:[start,end]);
function string(value){
 host();if(typeof value!=='string')throw new TypeError('Actual primitive text required');let bytes=0,chars=0;
 for(let at=0;at<value.length;at++){const code=call(charCode,value,[at]);if(code>=0xd800&&code<=0xdbff){const next=call(charCode,value,[at+1]);if(!(next>=0xdc00&&next<=0xdfff))throw new TypeError('Unicode scalar text required');at++;bytes+=4;}else{if(code>=0xdc00&&code<=0xdfff)throw new TypeError('Unicode scalar text required');bytes+=code<=0x7f?1:code<=0x7ff?2:3;}chars++;if(bytes>LIMIT)throw new RangeError('text input bound');}return {value,bytes,chars};
}
function count(value){if(typeof value!=='bigint'||value<0n||value>UMAX)throw new TypeError('Actual u64 text count required');return value;}
const whitespace=code=>code>=9&&code<=13||code===32||code===0x85||code===0xa0||code===0x1680||code>=0x2000&&code<=0x200a||code===0x2028||code===0x2029||code===0x202f||code===0x205f||code===0x3000;
function trim(value,left,right){string(value);let start=0,end=value.length;if(left)while(start<end&&whitespace(call(charCode,value,[start])))start++;if(right)while(end>start&&whitespace(call(charCode,value,[end-1])))end--;return part(value,start,end);}
function option(value,found=true){host();return freeze(found?{$:'Some',field0:value}:{$:'None'});}
function width(value,at){return call(charCode,value,[at])>=0xd800&&call(charCode,value,[at])<=0xdbff?2:1;}
function occurrences(value,pattern){if(!pattern.length)return string(value).chars+1;let total=0,from=0;for(;;){const at=call(indexOf,value,[pattern,from]);if(at<0)return total;total++;from=at+pattern.length;}}
function replaced(value,pattern,replacement,limit){
 const a=string(value),b=string(pattern),c=string(replacement);limit=count(limit);const matches=occurrences(value,pattern),used=limit>HostBigInt(matches)?matches:HostNumber(limit),length=a.bytes-used*b.bytes+used*c.bytes;if(length>LIMIT)throw new RangeError('text output bound');if(!used||pattern===replacement)return value;
 const parts=[];let size=0;const push=value=>{if(value.length)define(parts,HostString(size++),{value,writable:true,enumerable:true,configurable:true});};
 if(!pattern.length){let at=0,left=used;for(;;){if(left){push(replacement);left--;}if(at===value.length)break;if(!left){push(part(value,at));break;}const end=at+width(value,at);push(part(value,at,end));at=end;}}
 else{let at=0;for(let index=0;index<used;index++){const end=call(indexOf,value,[pattern,at]);push(part(value,at,end));push(replacement);at=end+pattern.length;}push(part(value,at));}
 return call(join,parts,['']);
}
function cut(value,limit,drop){const info=string(value);limit=count(limit);if(limit>=HostBigInt(info.chars))return drop?'':value;let at=0;for(let index=0;index<HostNumber(limit);index++)at+=width(value,at);return drop?part(value,at):part(value,0,at);}
function boundary(value,wanted){let byte=0;for(let at=0;at<=value.length;){if(byte===wanted)return at;if(at===value.length)return -1;const code=call(charCode,value,[at]);if(code>=0xd800&&code<=0xdbff){byte+=4;at+=2;}else{byte+=code<=0x7f?1:code<=0x7ff?2:3;at++;}if(byte>wanted)return -1;}return -1;}
export const router_text_trim=value=>trim(value,true,true);
export const router_text_trim_start=value=>trim(value,true,false);
export const router_text_trim_end=value=>trim(value,false,true);
export function router_text_is_empty(value){string(value);return value.length===0;}
export function router_text_contains(value,pattern){string(value);string(pattern);return call(indexOf,value,[pattern])>=0;}
export function router_text_starts_with(value,pattern){string(value);string(pattern);return call(starts,value,[pattern]);}
export function router_text_ends_with(value,pattern){string(value);string(pattern);return call(ends,value,[pattern]);}
export const router_text_len_utf8=value=>HostBigInt(string(value).bytes);
export const router_text_len_chars=value=>HostBigInt(string(value).chars);
export function router_text_matches_count(value,pattern){string(value);string(pattern);return HostBigInt(occurrences(value,pattern));}
export function router_text_find(value,pattern){string(value);string(pattern);const at=call(indexOf,value,[pattern]);return at<0?option(null,false):option(HostBigInt(string(part(value,0,at)).bytes));}
export function router_text_rfind(value,pattern){string(value);string(pattern);const at=call(lastIndexOf,value,[pattern]);return at<0?option(null,false):option(HostBigInt(string(part(value,0,at)).bytes));}
export const router_text_replace=(value,pattern,replacement)=>replaced(value,pattern,replacement,UMAX);
export const router_text_replacen=(value,pattern,replacement,limit)=>replaced(value,pattern,replacement,limit);
export function router_text_repeat(value,limit){const info=string(value);limit=count(limit);if(!info.bytes)return '';if(limit>HostBigInt(LIMIT)/HostBigInt(info.bytes))throw new RangeError('text output bound');return call(repeat,value,[HostNumber(limit)]);}
export const router_text_take_chars=(value,limit)=>cut(value,limit,false);
export const router_text_drop_chars=(value,limit)=>cut(value,limit,true);
export function router_text_slice_bytes(value,start,end){const info=string(value);start=count(start);end=count(end);if(start>end||end>HostBigInt(info.bytes))return option(null,false);const from=boundary(value,HostNumber(start)),to=boundary(value,HostNumber(end));return from<0||to<0?option(null,false):option(part(value,from,to));}
export function router_text_strip_prefix(value,pattern){string(value);string(pattern);return call(starts,value,[pattern])?option(part(value,pattern.length)):option(null,false);}
export function router_text_strip_suffix(value,pattern){string(value);string(pattern);return call(ends,value,[pattern])?option(part(value,0,value.length-pattern.length)):option(null,false);}

import {createHash as createTextSha256} from 'node:crypto';
// Scalar validation and the existing 1 MiB translated-input bound precede hashing.
export function router_text_sha256_base64_url_no_pad(value){
 string(value);return createTextSha256('sha256').update(value,'utf8').digest('base64url');
}

// ASCII transformations preserve every non-ASCII scalar and UTF-8 byte length.
function asciiMapped(value,upper){
 string(value);let output='',from=0;const base=upper?97:65,alphabet=upper?'ABCDEFGHIJKLMNOPQRSTUVWXYZ':'abcdefghijklmnopqrstuvwxyz';
 for(let at=0;at<value.length;at++){const code=call(charCode,value,[at]);if(code>=base&&code<base+26){output+=part(value,from,at)+alphabet[code-base];from=at+1;}}
 return from===0?value:output+part(value,from);
}
function asciiWhitespace(code){return code===9||code===10||code===12||code===13||code===32;}
function asciiTrimmed(value,left,right){
 string(value);let start=0,end=value.length;if(left)while(start<end&&asciiWhitespace(call(charCode,value,[start])))start++;if(right)while(end>start&&asciiWhitespace(call(charCode,value,[end-1])))end--;return part(value,start,end);
}
function asciiSplitSide(value,pattern,last,right){
 string(value);string(pattern);const at=call(last?lastIndexOf:indexOf,value,[pattern]);return at<0?option(null,false):option(right?part(value,at+pattern.length):part(value,0,at));
}
export function router_text_to_ascii_lowercase(value){return asciiMapped(value,false);}
export function router_text_to_ascii_uppercase(value){return asciiMapped(value,true);}
export function router_text_is_ascii(value){string(value);for(let at=0;at<value.length;at++)if(call(charCode,value,[at])>127)return false;return true;}
export function router_text_eq_ignore_ascii_case(value,other){
 string(value);string(other);if(value.length!==other.length)return false;for(let at=0;at<value.length;at++){let left=call(charCode,value,[at]),right=call(charCode,other,[at]);if(left>=65&&left<=90)left+=32;if(right>=65&&right<=90)right+=32;if(left!==right)return false;}return true;
}
export function router_text_trim_ascii(value){return asciiTrimmed(value,true,true);}
export function router_text_trim_ascii_start(value){return asciiTrimmed(value,true,false);}
export function router_text_trim_ascii_end(value){return asciiTrimmed(value,false,true);}
export function router_text_split_once_left(value,pattern){return asciiSplitSide(value,pattern,false,false);}
export function router_text_split_once_right(value,pattern){return asciiSplitSide(value,pattern,false,true);}
export function router_text_rsplit_once_left(value,pattern){return asciiSplitSide(value,pattern,true,false);}
export function router_text_rsplit_once_right(value,pattern){return asciiSplitSide(value,pattern,true,true);}

// Existing paired Option slices provide total, bounded root-zero fallbacks.
export function router_text_strip_prefix_or_self(value,pattern){const result=router_text_strip_prefix(value,pattern);return result.$==='Some'?result.field0:value;}
export function router_text_strip_prefix_or_empty(value,pattern){const result=router_text_strip_prefix(value,pattern);return result.$==='Some'?result.field0:'';}
export function router_text_strip_suffix_or_self(value,pattern){const result=router_text_strip_suffix(value,pattern);return result.$==='Some'?result.field0:value;}
export function router_text_strip_suffix_or_empty(value,pattern){const result=router_text_strip_suffix(value,pattern);return result.$==='Some'?result.field0:'';}
export function router_text_split_once_left_or_self(value,pattern){const result=router_text_split_once_left(value,pattern);return result.$==='Some'?result.field0:value;}
export function router_text_split_once_left_or_empty(value,pattern){const result=router_text_split_once_left(value,pattern);return result.$==='Some'?result.field0:'';}
export function router_text_split_once_right_or_self(value,pattern){const result=router_text_split_once_right(value,pattern);return result.$==='Some'?result.field0:value;}
export function router_text_split_once_right_or_empty(value,pattern){const result=router_text_split_once_right(value,pattern);return result.$==='Some'?result.field0:'';}
export function router_text_rsplit_once_left_or_self(value,pattern){const result=router_text_rsplit_once_left(value,pattern);return result.$==='Some'?result.field0:value;}
export function router_text_rsplit_once_left_or_empty(value,pattern){const result=router_text_rsplit_once_left(value,pattern);return result.$==='Some'?result.field0:'';}
export function router_text_rsplit_once_right_or_self(value,pattern){const result=router_text_rsplit_once_right(value,pattern);return result.$==='Some'?result.field0:value;}
export function router_text_rsplit_once_right_or_empty(value,pattern){const result=router_text_rsplit_once_right(value,pattern);return result.$==='Some'?result.field0:'';}

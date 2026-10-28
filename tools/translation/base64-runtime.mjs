// Concrete owned base64 values. Native Rust library internals remain untranslated.
// This runtime never supplies compiler source, namespace or trait authority.
// ABI: stock primordial initialization, scalar strings, and dense own-data
// BigInt u8 arrays. Input arrays are snapshotted, not certified frozen. Rust
// ownership/loans are checked by the compiler; public JS calls do not model
// moves. Captured operations resist late replacement, not hostile cold import.
import {types} from 'node:util';

const array=Array.isArray,keys=Reflect.ownKeys,descriptor=Object.getOwnPropertyDescriptor;
const define=Object.defineProperty,freeze=Object.freeze,frozen=Object.isFrozen,prototype=Object.getPrototypeOf;
const proxy=types.isProxy,apply=Reflect.apply,charCode=String.prototype.charCodeAt;
const hasOwn=Object.hasOwn,join=Array.prototype.join,safeInteger=Number.isSafeInteger;
const number=Number,integer=BigInt,floor=Math.floor,maximum=Math.max;
const integerText=BigInt.prototype.toString,padStart=String.prototype.padStart,fromCharCode=String.fromCharCode;
const plain=Object.prototype,arrayPrototype=Array.prototype;
const LIMIT=1048576,MAX_USIZE=(1n<<64n)-1n;
const STANDARD='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const URL='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const fail=message=>{throw new TypeError('Owned base64 value domain: '+message);};
const code=(value,at)=>apply(charCode,value,[at]);
const own=(value,key)=>{const field=descriptor(value,key);if(!field||!hasOwn(field,'value'))fail('own data fields required');return field.value;};
const append=(value,item)=>{define(value,value.length,{value:item,writable:true,enumerable:true,configurable:true});};

function scalarText(value){
 if(typeof value!=='string'||value.length>LIMIT)fail('bounded primitive scalar text required');
 let bytes=0;
 for(let at=0;at<value.length;at++){
  const unit=code(value,at);
  if(unit>=0xd800&&unit<=0xdbff){const low=at+1<value.length?code(value,at+1):-1;if(low<0xdc00||low>0xdfff)fail('lone surrogate');at++;bytes+=4;}
  else if(unit>=0xdc00&&unit<=0xdfff)fail('lone surrogate');
  else bytes+=unit<0x80?1:unit<0x800?2:3;
  if(bytes>LIMIT)fail('UTF8 input exceeds 1MiB');
 }
 return value;
}
function utf8(value){
 scalarText(value);const out=[];
 for(let at=0;at<value.length;at++){
  let unit=code(value,at);
  if(unit<0x80)append(out,unit);
  else if(unit<0x800){append(out,0xc0|(unit>>>6));append(out,0x80|(unit&63));}
  else if(unit>=0xd800&&unit<=0xdbff){unit=0x10000+((unit-0xd800)<<10)+(code(value,++at)-0xdc00);append(out,0xf0|(unit>>>18));append(out,0x80|((unit>>>12)&63));append(out,0x80|((unit>>>6)&63));append(out,0x80|(unit&63));}
  else{append(out,0xe0|(unit>>>12));append(out,0x80|((unit>>>6)&63));append(out,0x80|(unit&63));}
 }
 return out;
}
function octets(value,fixed=null,copy=true){
 if(!value||typeof value!=='object'||proxy(value)||!array(value)||prototype(value)!==arrayPrototype)fail('dense ordinary u8 array required');
 const length=own(value,'length');
 if(!safeInteger(length)||length<0||length>LIMIT||fixed!==null&&length!==fixed)fail('byte array length');
 const names=keys(value);if(names.length!==length+1)fail('byte array holes or extra fields');
 // Complete key census precedes all element descriptors. No getter, iterator,
 // coercion or prototype numeric setter supplies an input or output byte.
 for(let at=0;at<length;at++)if(names[at]!==''+at)fail('byte array own index order');
 if(names[length]!=='length')fail('byte array length field');
 const out=copy?[]:null;
 for(let at=0;at<length;at++){const item=own(value,''+at);if(typeof item!=='bigint'||item<0n||item>255n)fail('actual u8 BigInt required');if(copy)append(out,number(item));}
 return copy?out:value;
}
function encode(bytes,alphabet,padding){
 const parts=[];let at=0;
 for(;at+3<=bytes.length;at+=3){const bits=(bytes[at]<<16)|(bytes[at+1]<<8)|bytes[at+2];append(parts,alphabet[(bits>>>18)&63]+alphabet[(bits>>>12)&63]+alphabet[(bits>>>6)&63]+alphabet[bits&63]);}
 if(at<bytes.length){const a=bytes[at],b=at+1<bytes.length?bytes[at+1]:0;append(parts,alphabet[a>>>2]+alphabet[((a&3)<<4)|(b>>>4)]+(at+1<bytes.length?alphabet[(b&15)<<2]:padding?'=':'')+(padding?'=':''));}
 // parts is a fresh private dense array of primitive strings; no user objects.
 return apply(join,parts,['']);
}
const err=(tag,fields={})=>freeze({$:'Err',field0:freeze({$:tag,...fields})});
const invalidByte=(offset,byte)=>err('InvalidByte',{field0:integer(offset),field1:integer(byte)});
function decode(value,alphabet,padding){
 const input=utf8(value),length=input.length,remaining=length%4;
 const sextet=byte=>{if(byte>=65&&byte<=90)return byte-65;if(byte>=97&&byte<=122)return byte-71;if(byte>=48&&byte<=57)return byte+4;if(byte===code(alphabet,62))return 62;if(byte===code(alphabet,63))return 63;return -1;};
 // Native complete_quads_len checks a final invalid non-pad byte FIRST.
 if(remaining===1&&input[length-1]!==61&&sextet(input[length-1])<0)return invalidByte(length-1,input[length-1]);
 const terminal=maximum(0,length-remaining-(remaining===0?4:0)),out=[];
 for(let at=0;at<terminal;at+=4){
  const group=[];
  for(let index=0;index<4;index++){const item=sextet(input[at+index]);if(item<0)return invalidByte(at+index,input[at+index]);append(group,item);}
  append(out,integer((group[0]<<2)|(group[1]>>>4)));append(out,integer(((group[1]&15)<<4)|(group[2]>>>2)));append(out,integer(((group[2]&3)<<6)|group[3]));
 }
 const morsels=[];let pads=0,firstPad=0,lastSymbol=0,lastValue=0;
 for(let at=terminal;at<length;at++){
  const byte=input[at],relative=at-terminal;
  if(byte===61){if(relative<2)return invalidByte(at,byte);if(pads===0)firstPad=relative;pads++;continue;}
  if(pads)return invalidByte(terminal+firstPad,61);
  const value=sextet(byte);if(value<0)return invalidByte(at,byte);lastSymbol=byte;lastValue=value;append(morsels,value);
 }
 if(length!==0&&morsels.length<2)return err('InvalidLength',{field0:integer(terminal+morsels.length)});
 if(padding?(pads+morsels.length)%4!==0:pads>0)return err('InvalidPadding');
 const count=floor(morsels.length*6/8),bits=((morsels[0]??0)<<18)|((morsels[1]??0)<<12)|((morsels[2]??0)<<6)|(morsels[3]??0),unused=24-count*8;
 if(unused>0&&(bits&((1<<unused)-1))!==0)return err('InvalidLastSymbol',{offset:integer(terminal+morsels.length-1),symbol:integer(lastSymbol),symbol_value:integer(lastValue)});
 for(let at=0;at<count;at++)append(out,integer((bits>>>(16-at*8))&255));
 return freeze({$:'Ok',field0:freeze(out)});
}

export const router_core_base64_standard_encode_bytes=value=>encode(octets(value),STANDARD,true);
export const router_core_base64_standard_encode_text=value=>encode(utf8(value),STANDARD,true);
export const router_core_base64_standard_encode_owned_bytes=value=>encode(octets(value),STANDARD,true);
export const router_core_base64_standard_no_pad_encode_text=value=>encode(utf8(value),STANDARD,false);
export const router_core_base64_url_no_pad_encode_bytes=value=>encode(octets(value),URL,false);
export const router_core_base64_url_no_pad_encode_owned_bytes=value=>encode(octets(value),URL,false);
export const router_core_base64_url_no_pad_encode_owned_text=value=>encode(utf8(value),URL,false);
export const router_core_base64_url_no_pad_encode_array32=value=>encode(octets(value,32),URL,false);
export const router_core_base64_standard_decode_text=value=>decode(value,STANDARD,true);
export const router_core_base64_standard_decode_owned_text=value=>decode(value,STANDARD,true);
export const router_core_base64_standard_no_pad_decode_text=value=>decode(value,STANDARD,false);
export const router_core_base64_url_no_pad_decode_text=value=>decode(value,URL,false);
export const router_core_base64_url_no_pad_decode_owned_text=value=>decode(value,URL,false);

/** Native base640.23.1 Display and Debug have the same complete text. */
export function base64ErrorText(value){
 if(!value||typeof value!=='object'||proxy(value)||array(value)||prototype(value)!==plain&&prototype(value)!==null)fail('native error data required');
 const tag=own(value,'$'),fields=tag==='InvalidByte'?['$','field0','field1']:tag==='InvalidLength'?['$','field0']:tag==='InvalidLastSymbol'?['$','offset','symbol','symbol_value']:tag==='InvalidPadding'?['$']:null;
 if(!fields)fail('native error variant');const names=keys(value);if(names.length!==fields.length)fail('native error fields');
 for(let at=0;at<names.length;at++){const key=names[at];let found=false;if(typeof key!=='string')fail('native error fields');for(let index=0;index<fields.length;index++)if(fields[index]===key)found=true;if(!found)fail('native error fields');}
 const integer=(name,maximum)=>{const item=own(value,name);if(typeof item!=='bigint'||item<0n||item>maximum)fail('native error integer');return item;};
 if(tag==='InvalidByte')return `Invalid symbol ${integer('field1',255n)}, offset ${integer('field0',MAX_USIZE)}.`;
 if(tag==='InvalidLength')return `Invalid input length: ${integer('field0',MAX_USIZE)}`;
 if(tag==='InvalidPadding')return 'Invalid padding';
 const offset=integer('offset',MAX_USIZE),symbol=integer('symbol',255n),symbolValue=integer('symbol_value',255n);
 const hex=apply(padStart,'0x'+apply(integerText,symbol,[16]),[4,' ']),binary='0b'+apply(padStart,apply(integerText,symbolValue,[2]),[8,'0']),character=symbol<128n?fromCharCode(number(symbol)):'\ufffd';
 return `Invalid last symbol ${hex} ('${character}') at offset ${offset}, decoded as ${binary}.`;
}

/** Snapshot the explicit public owned Result ABI without user callbacks. */
export function base64ResultInput(value){
 if(!value||typeof value!=='object'||proxy(value)||array(value)||prototype(value)!==plain&&prototype(value)!==null)fail('native result data required');
 const names=keys(value);if(names.length!==2||!hasOwn(value,'$')||!hasOwn(value,'field0'))fail('native result fields');for(let at=0;at<names.length;at++)if(names[at]!=='$'&&names[at]!=='field0')fail('native result fields');
 const tag=own(value,'$'),payload=own(value,'field0'),immutable=frozen(value)&&payload!==null&&typeof payload==='object'&&!proxy(payload)&&frozen(payload);
 if(tag==='Ok'){const bytes=octets(payload,null,!immutable);if(immutable)return value;const out=[];for(let at=0;at<bytes.length;at++)append(out,integer(bytes[at]));return freeze({$:'Ok',field0:freeze(out)});}
 if(tag!=='Err')fail('native result variant');base64ErrorText(payload);if(immutable)return value;const variant=own(payload,'$');let error;
 if(variant==='InvalidByte')error={$:variant,field0:own(payload,'field0'),field1:own(payload,'field1')};
 else if(variant==='InvalidLength')error={$:variant,field0:own(payload,'field0')};
 else if(variant==='InvalidLastSymbol')error={$:variant,offset:own(payload,'offset'),symbol:own(payload,'symbol'),symbol_value:own(payload,'symbol_value')};
 else error={$:'InvalidPadding'};
 return freeze({$:'Err',field0:freeze(error)});
}

// One invocation validates one immutable carrier and allocates its result only
// after the complete UTF8 budget succeeds. No persistent or scoped value cache.
import {types} from 'node:util';
const MAX_VALUES=4096,MAX_TEXT_BYTES=1048576;
const isArray=Array.isArray,prototype=Object.getPrototypeOf,frozen=Object.isFrozen,descriptor=Object.getOwnPropertyDescriptor,keys=Reflect.ownKeys,apply=Reflect.apply,joined=Array.prototype.join;
function textBytes(value,maximum){
 if(typeof value!=='string')throw new TypeError('owned text join scalar String required');
 if(value.length>maximum)throw new RangeError('owned text join UTF8 resource bound');
 let bytes=0;
 for(let at=0;at<value.length;at++){
  const code=value.charCodeAt(at);
  if(code>=0xd800&&code<=0xdbff){const low=value.charCodeAt(++at);if(!(low>=0xdc00&&low<=0xdfff))throw new TypeError('owned text join unpaired surrogate');bytes+=4;}
  else if(code>=0xdc00&&code<=0xdfff)throw new TypeError('owned text join unpaired surrogate');
  else bytes+=code<=0x7f?1:code<=0x7ff?2:3;
  if(bytes>maximum)throw new RangeError('owned text join UTF8 resource bound');
 }return bytes;
}
function size(values){
 if(types.isProxy(values)||!isArray(values)||prototype(values)!==Array.prototype||!frozen(values))throw new TypeError('owned text join frozen ordinary dense carrier required');
 const length=descriptor(values,'length');if(!length||!Object.hasOwn(length,'value')||!Number.isSafeInteger(length.value)||length.value<0)throw new TypeError('owned text join own length descriptor required');if(length.value>MAX_VALUES)throw new RangeError('owned text join vector resource bound');
 if(keys(values).length!==length.value+1)throw new TypeError('owned text join exact dense fields required');return length.value;
}
export function router_owned_text_vec_join(values,separator){
 const length=size(values),separatorBytes=textBytes(separator,MAX_TEXT_BYTES),separators=length>0?length-1:0;
 if(separatorBytes*separators>MAX_TEXT_BYTES)throw new RangeError('owned text join UTF8 output resource bound');let remaining=MAX_TEXT_BYTES-separatorBytes*separators;
 for(let at=0;at<length;at++){const field=descriptor(values,String(at));if(!field||!Object.hasOwn(field,'value')||!field.enumerable)throw new TypeError('owned text join dense own value descriptor required');remaining-=textBytes(field.value,remaining);}
 return apply(joined,values,[separator]);
}

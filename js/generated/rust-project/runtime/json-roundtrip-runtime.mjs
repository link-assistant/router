// Separate draft numeric branch. Existing default adapters are unchanged.
import {parseJsonBytesRoundtrip} from './json-parser.mjs';
import {string} from './json-values.mjs';
import {types} from 'node:util';
export const JSON_ROUNDTRIP_MAX_BYTES=1048576;
function bytesDomain(length){if(length>JSON_ROUNDTRIP_MAX_BYTES){const error=new RangeError('JSON input exceeds the checked roundtrip byte domain');error.code='ERR_JSON_ROUNDTRIP_CAPABILITY_BOUND';throw error;}}
export function serde_json_roundtrip_from_str(text) {
  string(text);bytesDomain(Buffer.byteLength(text,'utf8'));
  return parseJsonBytesRoundtrip(Buffer.from(text,'utf8'));
}
export function serde_json_roundtrip_from_slice(bytes) {
  if(types.isProxy(bytes)||!Array.isArray(bytes)||Object.getPrototypeOf(bytes)!==Array.prototype)throw new TypeError('JSON roundtrip input needs an ordinary checked byte array');
  const descriptors=Object.getOwnPropertyDescriptors(bytes),length=descriptors.length?.value;
  if(!Number.isSafeInteger(length)||length<0)throw new TypeError('JSON roundtrip byte array has no actual length');
  bytesDomain(length);
  if(Reflect.ownKeys(descriptors).length!==length+1)throw new TypeError('JSON roundtrip byte array has extra or sparse fields');
  const values=[];
  for(let index=0;index<length;index++){
    const descriptor=descriptors[index],byte=descriptor?.value;
    if(!descriptor||!Object.hasOwn(descriptor,'value')||typeof byte!=='bigint'||byte<0n||byte>255n)throw new TypeError('JSON roundtrip input bytes are outside the checked data-only u8 domain');
    values.push(byte);
  }
  return parseJsonBytesRoundtrip(Uint8Array.from(values,Number));
}

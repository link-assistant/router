// Keep the pinned portable primitives and refine only source-sized arrays.
export * from './vendor/meta-language/translation/types.js';
import {typeKey as portableTypeKey} from './vendor/meta-language/translation/types.js';

export const FIXED_ARRAY_MAX_LENGTH=4096;
export function fixedArrayLength(type) {
  if(type?.rustFixedArray===undefined)return null;
  const length=type.rustFixedArray?.length;
  if(type.kind!=='array'||!Number.isSafeInteger(length)||length<0||length>FIXED_ARRAY_MAX_LENGTH)throw new TypeError('Invalid checked fixed-array length');
  return length;
}
export function typeKey(type) {
  if(type.kind==='array') {
    const length=fixedArrayLength(type);
    return `${length===null?'array':`fixed-array:${length}`}:${typeKey(type.element)}`;
  }
  return portableTypeKey(type);
}
export const sameType=(left,right)=>typeKey(left)===typeKey(right);

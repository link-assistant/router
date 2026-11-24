// Shared exact boolean ABI operation, called only by checked source conversion.
// No JS truthiness/coercion, decimal parser or arbitrary From trait dispatch.
export function primitiveBoolFrom(value){
  if(typeof value!=='boolean')throw new TypeError('Primitive Boolean From requires an exact boolean value');
  return value?1n:0n;
}

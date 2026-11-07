// Test-only original module loading; the parent authenticates complete bytes.
let original;
export function initialize(data){
 if(typeof data?.url!=='string'||typeof data?.source!=='string')throw new TypeError('Complete original project module required');
 original=data;
}
export async function load(url,context,next){
 const result=await next(url,context);
 return url===original.url?{...result,source:original.source}:result;
}

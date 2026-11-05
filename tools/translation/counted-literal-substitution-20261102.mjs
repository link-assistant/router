// Additive bounded source DATA substitution; the original unique-anchor API stays.
export function countedLiteralSubstitutionRule(id,before,after,count,message){
 if(typeof id!=='string'||!id||id.length>160||typeof before!=='string'||!before||typeof after!=='string'||typeof message!=='string'||!Number.isSafeInteger(count)||count<1||count>4096)throw TypeError('bounded exact-count substitution and message required');
 return Object.freeze({id,apply(source){if(typeof source!=='string'||Buffer.byteLength(source)>8388608)throw TypeError('complete bounded source substitution input required');const parts=source.split(before);if(parts.length!==count+1)throw Error(message);const result=parts.join(after);if(Buffer.byteLength(result)>8388608)throw TypeError('complete bounded source substitution output required');return result;}});
}

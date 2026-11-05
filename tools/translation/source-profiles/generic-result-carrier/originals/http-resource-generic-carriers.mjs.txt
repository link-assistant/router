// Reusable signature DATA. Actual source/library checks and whole linear bodies
// independently establish every use; no descriptor is a semantic permission.
import {httpResourceOption} from './http-resource-options.mjs';
import {httpResourceResult} from './http-resource-caller-contracts.mjs';
const rows=Object.freeze([
 Object.freeze({carrier:'option',family:'generic-option-signature',operation:'router_option_identity',rustPrefix:'Option<',rustSuffix:'>',metaPrefix:'optional:',sourceAuthority:false,semanticAuthority:false}),
 Object.freeze({carrier:'text-result',family:'generic-text-result-signature',operation:'router_text_result_identity',rustPrefix:'Result<',rustSuffix:',String>',metaPrefix:'http-result:',sourceAuthority:false,semanticAuthority:false}),
]);
export const httpResourceGenericCarrier=carrier=>rows.find(row=>row.carrier===carrier)??null;
export const httpResourceGenericCarrierByFamily=family=>rows.find(row=>row.family===family)??null;
export function httpResourceGenericSignature(carrier,typeParameter){
 if(carrier===null)return {carrier:null,sourceType:typeParameter,type:'generic:'+typeParameter};const row=httpResourceGenericCarrier(carrier);if(!row)throw new TypeError('Actual supported generic carrier signature required');return {carrier,sourceType:row.rustPrefix+typeParameter+row.rustSuffix,type:row.metaPrefix+'generic:'+typeParameter};
}
export function httpResourceGenericSignatureForDomain(typeParameter,type){
 for(const row of rows){const signature=httpResourceGenericSignature(row.carrier,typeParameter);if(signature.type===type)return signature;}return null;
}
export function httpResourceNativeGenericSignature(typeParameter,type){
 if(type===typeParameter)return httpResourceGenericSignature(null,typeParameter);for(const row of rows){const signature=httpResourceGenericSignature(row.carrier,typeParameter);if(signature.sourceType===type)return signature;}return null;
}
export function httpResourceGenericCarrierDomain(carrier,payload){
 const row=httpResourceGenericCarrier(carrier);if(!row)throw new TypeError('Actual supported generic carrier required');return carrier==='option'&&payload==='text-owned'?'option-text':row.metaPrefix+payload;
}
export function httpResourceGenericCarrierPayload(carrier,type){
 if(carrier==='option')return httpResourceOption(type);if(carrier==='text-result'){const result=httpResourceResult(type);return result?.error==='text'?{value:result.value}:null;}return null;
}
